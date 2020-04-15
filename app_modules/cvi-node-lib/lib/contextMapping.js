/**
 * Copyright 2016,2020 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. */
const Promise = require('bluebird');
const _ = new require('underscore');
const BaseApi = require('./BaseApi.js');

/*
 * http://ibm.biz/IoTContextMapping_APIdoc
 */
class contextMapping extends BaseApi {
	constructor() {
		super();
		this.contextMappingConfig = (function () {
			const creds = this._getVCAPCredentials();
			if (creds) {
				return {
					baseURL: (creds.mapinsights && creds.mapinsights.api) ?
						creds.mapinsights.api : (creds.api + "mapinsights"),
					tenant_id: creds.tenant_id,
					internal_tenant_id: creds.internal_tenant_id, // Workaround for DMM SaaS. DMM SaaS API needs internal_tenant_id
					username: creds.username,
					password: creds.password
				};
			}
			if (process.env.AUTOMOTIVE_URL) {
				return {
					baseURL: process.env.AUTOMOTIVE_MAP_URL || (process.env.AUTOMOTIVE_URL + "/mapinsights"),
					tenant_id: process.env.AUTOMOTIVE_TENANTID,
					internal_tenant_id: process.env.AUTOMOTIVE_INTERNAL_TENANTID,
					username: process.env.AUTOMOTIVE_USERNAME,
					password: process.env.AUTOMOTIVE_PASSWORD
				};
			}
			throw new Exception("!!! no provided credentials for DriverInsights. using shared one !!!");
		}.bind(this))();
	}

	/**
	 * Async get route from (orig_latitude, orig_longitude) to (dest latitude, dest_longitude).
	 *
	 * @param {Object} params - {
	 * 	orig_latitude: orig_lat,
	 * 	orig_longitude: orig_lon,
	 * 	orig_heading: orig_heading,
	 * 	dest_latitude: dest_lat,
	 * 	dest_longitude: dest_lon,
	 * 	dest_heading: dest_heading,
	 * 	option: "avoid_event"|"avoid_alert"
	 * }
	 * @return {Promise}
	 */
	routeSearch(params) {
		const node = this.contextMappingConfig;
		const options = this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/mapservice/routesearch',
			params: params
		});

		return this._request(options, function (error, response, result, resolve, reject) {
			if (error) {
				console.error("error on routesearch\n url: " + options.url + "\n error: " + error);
				reject(error);
				return true;
			} else if (response.statusCode > 299) {
				console.error("error on routesearch\n url: " + options.url + "\n body: " + result);
				reject(response.toJSON());
				return true;
			}

			try {
				resolve(result);
			} catch (e) {
				console.error("error on routesearch\n url: " + options.url + "\n bad_content: " + e);
				reject(e);
			}
			return true;
		});
	}
	findRoute(params) {
		const node = this.contextMappingConfig;
		const options = this._makeRequestOptions(node, {
			method: "POST",
			url: node.baseURL + "/mapservice/route",
			data: params
		});

		return this._request(options);
	}

	/**
	 * Async get distance from (orig_latitude, orig_longitude) to (dest_latitude, dest_longitude).
	 *
	 * @param {Object} params - {
	 * 	orig_latitude: orig_latitude,
	 * 	orig_longitude: orig_longitude,
	 * 	dest_latitude: dest_latitude,
	 * 	dest_longitude: dest_longitude
	 * }
	 * @return {Promise}
	 */
	routeDistance(params) {
		Object.assign(params, { orig_heading: 0, dest_heading: 0, option: { avoid_events: false } });
		return this.routeSearch(params).then(function (route) {
			return route.route_length || -1;
		}).catch(function (er) {
			// fall-back error and return -1;
			return -1;
		});
	}

	/**
	 * Async map match - raw
	 * - the result promise will be resolved to a response JSON
	 *   * note that it may not have matched results.
	 *
	 * @param {Object} params - {
	 * 	latitude: latitude,
	 * 	longitude: longitude,
	 * 	heading: hading
	 * }
	 * @return {Promise}
	 */
	matchMapRaw(params, errorOnErrorResponse) {
		const node = this.contextMappingConfig;
		const options = this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/mapservice/map/matching',
			params: params,
			pool: this._matchMapPool,
			agentOptions: this._matchMapAgentOptions,
		});

		return this._request(options, function (error, response, result, resolve, reject) {
			if (!error && (!errorOnErrorResponse || response.statusCode == 200)) {
				if (result.length === 0) {
					console.error("no match found\n url: " + options.url + "\n body: " + result);
				}
				resolve(result);
			} else {
				reject(error || { statusCode: response.statusCode, body: result });
			}
			return true;
		});
	}
	/**
	 * Async map match
	 * - returns the first match, returns the given (lat,lon) in case no match
	 *
	 * @param {Object} params - {
	 * 	latitude: latitude,
	 * 	longitude: longitude,
	 * 	heading: hading
	 * }
	 * @param {boolean} errorOnErrorResponse
	 * @return {Promise} - {lat: number, lon: number, heading: number}
	 */
	matchMap(params, errorOnErrorResponse) {
		return this.matchMapRaw(params, errorOnErrorResponse)
			.then(function (results) { // results is parsed JSON of array of matches
				if (results.length === 0)
					return { lat: lat, lon: lon }; // fallback for not-matched
				const latlon = results[0];
				return {
					lat: latlon.matched_latitude,
					lon: latlon.matched_longitude,
					heading: latlon.matched_heading
				};
			});
	}
	/**
	 * @param {Object} params - {
	 * 	latitude: latitude,
	 * 	longitude: longitude,
	 * 	heading: hading
	 * }
	 * @return {Promise} - {lat: number, lon: number, heading: number}
	 */
	matchMapFirst(params) { // no fallback, explicit error
		return this.matchMapRaw(params, true)
			.then(function (results) { // results is parsed JSON of array of matches
				if (results.length === 0)
					return null;
				const latlon = results[0];
				return {
					lat: latlon.matched_latitude,
					lon: latlon.matched_longitude,
					heading: latlon.matched_heading
				};
			});
	}
	/**
	 * @param {string} link_id
	 * @param {boolean} ignoreCache
	 * @return {Promise}
	 */
	getLinkInformation(link_id, ignoreCache) {
		// Cache the link information to reduce the number of Context Mapping API call
		if (!ignoreCache) {
			if (!this._linkInformationCache) {
				this._linkInformationCache = {};
				this._linkInformationCacheHit = 0;
				this._linkInformationCacheMiss = 0;
			}
			const cachedResult = this._linkInformationCache[link_id];
			if (cachedResult) {
				this._linkInformationCacheHit++;
				cachedResult.lastAccess = Date.now(); // update time
				return Promise.resolve(cachedResult.data);
			} else {
				this._linkInformationCacheMiss++;
			}
			// reduce cache size to half when it exceeds 200
			const allKeys = Object.keys(this._linkInformationCache);
			if (allKeys && allKeys.length > 1000) {
				const sorted = _.sortBy(allKeys, (function (key) {
					return this._linkInformationCache[key].lastAccess;
				}).bind(this));
				for (let i = 0; i < sorted.length / 2; i++) {
					delete this._linkInformationCache[sorted[i]];
				}
			}
		}

		const node = this.contextMappingConfig;
		const options = this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/mapservice/link',
			params: { link_id: link_id }
		});

		const self = this;
		return this._request(options, function (error, response, result, resolve, reject) {
			if (!error) {
				if (result.links && result.links.length > 0) {
					if (!ignoreCache && self._linkInformationCache) {
						self._linkInformationCache[link_id] = {
							data: responseJson.links[0],
							lastAccess: Date.now(),
						};
					}
					resolve(result.links[0]);
				} else {
					console.error("link information not found\n url: : " + options.url + "\n body: " + JSON.stringify(result));
					reject(responseJson);
				}
			} else {
				reject(error);
			}
			return true;
		});
	}

	/**
	 *
	 * @param {} poi
	 * @param {*} options {"feature_source": "string", "feature_type": "string"}
	 */
	createPoi(poi, params) {
		const node = this.contextMappingConfig;
		const options = this._makeRequestOptions(node, {
			method: "POST",
			url: node.baseURL + "/ctxservice/poi",
			data: poi,
			params: params || {}
		})
		return this._request(options);
	}
	/**
	 *
	 * @param {*} params {"poi_id": "string", "feature_source": "string", "feature_type": "string"}
	 */
	getPoi(params) {
		const node = this.contextMappingConfig;
		const options = this._makeRequestOptions(node, {
			method: "GET",
			url: node.baseURL + "/ctxservice/poi",
			params: params || {}
		});
		return this._request(options);
	}
	/**
	 *
	 * @param {*} poi
	 * @param {*} options {"feature_source": "string", "feature_type": "string", "radius": number}
	 */
	queryPoi(poi, params) {
		const node = this.contextMappingConfig;
		const options = this._makeRequestOptions(node, {
			method: "POST",
			url: node.baseURL + "/ctxservice/poi/query",
			data: poi,
			params: params || {},
		});
		return this._request(options);
	}
	/**
	 *
	 * @param {*} params {"poi_id": "string", "feature_source": "string", "feature_type": "string"}
	 */
	deletePoi(params) {
		const node = this.contextMappingConfig;
		const options = this._makeRequestOptions(node, {
			method: "DELETE",
			url: node.baseURL + "/ctxservice/poi",
			params: params
		});
		return this._request(options);
	}
	/**
	 *
	 * @param {String} id
	 * @param {Point|LineString|Polygon} geotype Geometry Type
	 * @param {Array} coords Coordinates
	 * 			Point: [longitude, latitude]
	 * 			LineString: [[longitude1, latitude1], [longitude2, latitude2]...]
	 * 			Polygon: [[[longitude1, latitude1], [longitude2, latitude2]...],[[longitude3, latitude3]...]...]
	 * @param {Object} props Properties
	 */
	_generateFeature(id, geotype, coords, props) {
		if (!geotype || !coords) {
			return null;
		}
		return {
			"id": id,
			"type": "Feature",
			"geometry": {
				"type": geotype,
				"coordinates": coords,
			},
			"properties": props || {}
		}
	}
	/**
	 * @param {Array} features
	 */
	_generateFeatureCollection(features) {
		return {
			"type": "FeatureCollection",
			"features": features
		}
	}

	/**
	 * Create an event in the Context Mapping servie
	 *
	 * @param {Object} event - a JSON object w/ s_latitude, s_longitude, event_type properties.
	 * @return {Promise} - successful result returns the event ID (integer).
	 */
	createEvent(event) {
		const node = this.contextMappingConfig;
		const options = this._makeRequestOptions(node, {
			method: 'POST',
			url: node.baseURL + '/eventservice/event',
			data: event
		});

		return this._request(options, function (error, response, result, resolve, reject) {
			if (response && response.statusCode < 300) {
				try {
					resolve(result);
				} catch (e) {
					console.error("error on parsing createEvent result\n url: " + options.url + "\n body: " + result);
					reject(e);
				}
			} else {
				reject(error || response.toJSON());
			}
			return true;
		});
	}
	/**
	 * Delete an event in the Context Mapping service
	 * @param {number} event_id - event id
	 * @return {Promise}
	 */
	deleteEvent(event_id) {
		const node = this.contextMappingConfig;
		const options = this._makeRequestOptions(node, {
			method: 'DELETE',
			url: node.baseURL + '/eventservice/events',
			params: { event_id: event_id }
		});

		return this._request(options, function (error, response, result, resolve, reject) {
			if (response && response.statusCode < 300) {
				resolve(result);
			} else {
				reject(error || response.toJSON());
			}
			return true;
		});
	}
	/**
	 * Query events in the Context Mapping service
	 *
	 * @param {Object} params - {min_latitude: number, min_longitude: number, max_latitude: number, max_longitude: number, [event_type]: string, [status]: number}
	 * @return {Promise}
	 */
	queryEvent(params) {
		const node = this.contextMappingConfig;
		const options = this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/eventservice/event/query',
			params: params
		});

		return this._request(options, function (error, response, result, resolve, reject) {
			if (response && response.statusCode < 300) {
				resolve(result);
			} else {
				reject(error || response.toJSON());
			}
			return true;
		});
	}
	/**
	 * Get an event in the Context Mapping service by event ID
	 *
	 * @param {number} event_id
	 * @return {Promise}
	 */
	getEvent(event_id) {
		const node = this.contextMappingConfig;
		const options = this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/eventservice/event',
			params: { event_id: event_id }
		});

		return this._request(options, function (error, response, result, resolve, reject) {
			if (response && response.statusCode < 300) {
				resolve(result);
			} else {
				reject(error || response.toJSON());
			}
			return true;
		});
	}
	/**
	 * Get all the Context Mapping events using the getAllEventsRaw
	 *
	 * @return {Promise} - list of all the events
	 */
	getAllEvents() {
		const params = { num_rec_in_page: 100, num_page: 1 };
		return this.getAllEventsRaw(params).then(function (root) {
			const events = root.events; // events in the initial page
			const n_in_page = root.num_rec_in_page;
			// resolve events in the subsequent pages
			const last_page = Math.floor((root.event_count + n_in_page - 1) / n_in_page);
			const moreEvents = _.range(2, last_page + 1).map(function (page) {
				return this.getAllEventsRaw({ num_rec_in_page: n_in_page, num_page: page })
					.then(function (response) {
						return response.events;
					});
			});
			return Promise.all(moreEvents).then(function (events_list) {
				// append moreEents to the events
				return events_list.reduce(function (all, events) {
					return all.concat(events);
				}, events);
			});
		});
	}
	/**
	 * @param params {Object} - { num_rec_in_page: number, num_page: number }
	 * @return {Promise} - a page of the all events
	 */
	getAllEventsRaw(params) {
		const node = this.contextMappingConfig;
		const options = this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/eventservice/event/allevents',
			params: params
		});

		return this._request(options, function (error, response, result, resolve, reject) {
			if (response && response.statusCode < 300) {
				resolve(result);
			} else {
				reject(error || response.toJSON());
			}
			return true;
		});
	}
};

module.exports = new contextMapping();
