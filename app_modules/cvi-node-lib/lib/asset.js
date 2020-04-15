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
 * limitations under the License.
 */
const _ = require("underscore");
const Promise = require('bluebird');
require('dotenv').config();
const BaseApi = require('./BaseApi.js');

function removeLastSlash(dir) {
	if (!dir || dir.length == 0) {
		return dir;
	}
	const lastSlash = dir.lastIndexOf('/');
	if (lastSlash !== dir.length - 1) {
		return dir;
	}
	return dir.substring(0, lastSlash);
}

class Asset extends BaseApi {
	constructor() {
		super();
		this._refreshQueue = {};
		this.assetConfig = (function () {
			const iot4a_cred = this._getVCAPCredentials();
			if (iot4a_cred && iot4a_cred.maximo) {
				const vdh = iot4a_cred.vehicle_data_hub && iot4a_cred.vehicle_data_hub.length > 0 && iot4a_cred.vehicle_data_hub[0];
				const vdhCreds = {
					baseURL: vdh ? ("https://" + vdh) : (iot4a_cred.api + "vehicle"),
					username: iot4a_cred.username,
					password: iot4a_cred.password
				};
				const assetCreds = iot4a_cred.maximo;
				const maximoCreds = {
					baseURL: assetCreds.api ? assetCreds.api : (iot4a_cred.api + "maxrest"),
					restURL: iot4a_cred.api + "maxrest/oslc",
					internalURL: assetCreds.internalURL,
					orgid: assetCreds.orgid,
					classificationid: assetCreds.classificationid || "STARTER APPLICATION",
					username: assetCreds.username,
					password: assetCreds.password
				};
				const creds = { tenant_id: iot4a_cred.tenant_id, vdh: vdhCreds, maximo: maximoCreds };
				return creds;
			}
			if (process.env.AUTOMOTIVE_MAX_URL || process.env.AUTOMOTIVE_URL) {
				return {
					tenant_id: process.env.AUTOMOTIVE_TENANTID,
					vdh: {
					 	baseURL: process.env.AUTOMOTIVE_VDH_URL || (process.env.AUTOMOTIVE_URL + "/vehicle"),
					 	username: process.env.AUTOMOTIVE_USERNAME,
					 	password: process.env.AUTOMOTIVE_PASSWORD
					},
					maximo: {
						baseURL: process.env.AUTOMOTIVE_MAX_URL || (process.env.AUTOMOTIVE_URL + "/maxrest"),
						internalURL: process.env.AUTOMOTIVE_MAX_INTERNAL_URL,
						restURL: process.env.AUTOMOTIVE_URL + "/maxrest/oslc",
						orgid: process.env.AUTOMOTIVE_MAX_ORGID,
						classificationid: process.env.AUTOMOTIVE_MAX_CLASSIFICATION_ID,
						username: process.env.AUTOMOTIVE_MAX_USERNAME,
						password: process.env.AUTOMOTIVE_MAX_PASSWORD
					}
				};
			}
		}.bind(this))();
	}

	_mergeObject(obj1, obj2) {
		for (let key in obj1) {
			if (key in obj2) {
				if (typeof (obj1[key]) === 'object') {
					this._mergeObject(obj1[key], obj2[key]);
				} else {
					obj1[key] = obj2[key];
				}
			}
		}
		for (let key2 in obj2) {
			if (!(key2 in obj1)) {
				obj1[key2] = obj2[key2];
			}
		}
		return obj1;
	}
	acceptVehicleProperties() {
		var cred = this.assetConfig.maximo;
		return cred && cred.classificationid;
	}
	login(basicauth) {
		const cred = this.assetConfig.maximo;
		const api = cred.baseURL || (cred.protocol + '://' + cred.hostname + ':' + cred.port + cred.auth_schema);
		const url = api + "/oslc/login";
		return this._run(url, "POST");
	}
	logout() {
		const cred = this.assetConfig.maximo;
		const api = cred.baseURL || (cred.protocol + '://' + cred.hostname + ':' + cred.port + cred.auth_schema);
		const url = api + "/oslc/logout";
		return this._run(url, "POST").then(response => {
			delete Asset.cookie;
		});
	}

	/*
	 * Vehicle apis
	 */
	getVehicleList(params, properties) {
		return this._getAssetList("vehicle", params, properties);
	}
	getVehicle(mo_id) {
		return this._getAsset("vehicle", mo_id);
	}
	addVehicle(vehicle, noRefresh) {
		vehicle = this._mergeObject({
			status: "inactive",
			properties: {}
		}, vehicle || {});
		return this._addAsset("vehicle", vehicle.mo_id, vehicle, !noRefresh);
	}
	updateVehicle(id, vehicle, overwrite, noRefresh) {
		return this._updateAsset("vehicle", id || vehicle.mo_id, vehicle, overwrite, !noRefresh);
	}
	refreshVehicle() {
		return this._refreshAsset("vehicle");
	}
	deleteVehicle(mo_id, noRefresh) {
		return this._deleteAsset("vehicle", mo_id, !noRefresh);
	}

	/*
	 * Driver apis
	 */
	getDriverList(params) {
		return this._getAssetList("driver", params);
	}
	getDriver(driver_id) {
		return this._getAsset("driver", driver_id);
	}
	addDriver(driver, noRefresh) {
		driver = this._mergeObject({ "status": "active" }, driver || {});
		return this._addAsset("driver", driver.driver_id, driver, !noRefresh);
	}
	updateDriver(id, driver, overwrite, noRefresh) {
		return this._updateAsset("driver", id || driver.driver_id, driver, overwrite, !noRefresh);
	}
	refreshDriver() {
		return this._refreshAsset("driver");
	}
	deleteDriver(driver_id, noRefresh) {
		return this._deleteAsset("driver", driver_id, !noRefresh);
	}

	/*
	 * Vendor api
	 */
	getVendorList(params) {
		return this._getAssetList("vendor", params);
	}
	getVendor(vendor_id) {
		return this._getAsset("vendor", vendor_id);
	}
	addVendor(vendor) {
		vendor = this._mergeObject({ "status": "active" }, vendor || {});
		return this._addAsset("vendor", vendor.vendor, vendor, false /* Vendor doesn't need to be synchronized with agent. */);
	}
	updateVendor(id, vendor, overwrite) {
		return this._updateAsset("vendor", id || vendor.vendor, vendor, overwrite, false);
	}
	deleteVendor(vendor_id) {
		return this._deleteAsset("vendor", vendor_id, false);
	}

	/*
	 * EventType api
	 */
	getEventTypeList(params) {
		return this._getAssetList("eventtype", params);
	}
	getEventType(id) {
		return this._getAsset("eventtype", id);
	}
	addEventType(event_type, noRefresh) {
		return this._addAsset("eventtype", event_type.event_type, event_type, !noRefresh);
	}
	updateEventType(id, event_type, overwrite, noRefresh) {
		return this._updateAsset("eventtype", id || event_type.event_type, event_type, overwrite, !noRefresh);
	}
	refreshEventType() {
		return this._refreshAsset("eventtype");
	}
	deleteEventType(id, noRefresh) {
		return this._deleteAsset("eventtype", id, !noRefresh);
	}

	/*
	 * Rule api
	 */
	getRuleList(params) {
		return this._getAssetList("rule", params);
	}
	getRule(id) {
		return this._getAsset("rule", id);
	}
	getRuleXML(id) {
		return this._query('rule', ['rule'], null, id).then(result => {
			return result.rule;
		});
	}
	addRule(rule, ruleXML, noRefresh) {
		const context = 'rule';
		if (ruleXML) {
			rule.rule = ruleXML;
		}
		return this._addOrUpdateAsset(context, rule.rule_id, rule, !noRefresh);
	}
	updateRule(id, rule, ruleXML, overwrite, noRefresh) {
		if (overwrite) {
			return this._updateRule(id, rule, ruleXML, !noRefresh);
		} else {
			let self = this;
			return this.getRule(id)
				.then(existingRule => {
					rule = self._mergeObject(existingRule, rule);
					return self.getRuleXML(id)
						.then(existingXML => {
							ruleXML = ruleXML || existingXML;
							return self.updateRule(id, rule, ruleXML, true, noRefresh);
						});
				});
		}
	}
	_updateRule(id, rule, ruleXML, refresh) {
		const context = 'rule';
		if (ruleXML) {
			rule.rule = ruleXML.replace(/\n|\r/g, '');
		}
		return this._addOrUpdateAsset(context, id, rule, refresh);
	}
	refreshRule() {
		return this._refreshAsset("rule");
	}
	deleteRule(id, noRefresh) {
		return this._deleteAsset("rule", id, !noRefresh);
	}

	getClassificationList(params) {
		return this._getAssetList("classification", params);
	}
	getClassification(id) {
		return this._getAsset("classification", id);
	}
	addClassification(classification) {
		return this._addAsset("classification", classification.classificationid, classification, false);
	}
	updateClassification(id, classification, overwrite) {
		return this._updateAsset("classification", id || classification.classificationid, classification, overwrite, false);
	}
	deleteClassification(id) {
		return this._deleteAsset("classification", id, false);
	}
	_createVehicleClassificationObject(id, props, description) {
		if (!id) {
			return null;
		}
		props = props || [];
		const orgid = this.assetConfig.maximo.orgid;
		return {
			"classificationid": id,
			"description": description || `${id} - Classification for vehicles`,
			"hierarchypath": id,
			"classusewith": [{
				"objectvalue": "ASSET",
				"objectname": "ASSET",
				"description": `${id} use with ASSET.`
			}],
			"classspec": props.map((prop, index) => {
				return {
					"assetattrid": prop.id,
					"datatype": prop.datatype,
					"orgid": orgid,
					// "siteid": "",
					"classspecusewith": [{
						"useinspec": false,
						"sequence": index + 1,
						"objectvalue": "ASSET",
						"objectname": "ASSET"
					}]
				};
			})
		}
	}

	/**
	 * Get list of assets
	 *
	 * @param {Object} properties Properties of vehicle
	 */
	_getAssetList(context, params, properties) {
		params = params || { num_rec_in_page: 50, num_page: 1 };
		const attributes = this._getResourceObjectAttributes(context);
		const conditions = this._getSearchCondition(context, params);
		params = params || {};
		return this._query(context, attributes, conditions, /*id*/null, params.num_rec_in_page, params.num_page, properties)
			.then(result => {
				return { data: result };
			});
	}

	/*
	 * Get an asset
	 */
	_getAsset(context, id) {
		if (!id) {
			return Promise.reject({ message: "id must be specified." });
		}
		id = this._extractId(context, id);
		const self = this;
		return this._query(context, null, null, id).then(result => {
			return self._run(result.href + '?lean=1', 'GET').then(result => {
				return self._getAssetObject(context, result);
			});
		});
	}

	/*
	 * Add an asset
	 */
	_addAsset(context, id, asset, refresh) {
		return this._addOrUpdateAsset(context, id, asset, refresh);
	}

	/*
	 * Refresh asset information
	 */
	_refreshAsset(context) {
		const config = this.assetConfig.maximo;
		const assettype = (context == "vehicle" || context == "driver") ? (context + "_update") : context;
		let url = config.restURL + "/issueassetrefresh?lean=1";

		return this._run(url, 'POST', null, { "type": assettype });
	}
	/*
	 * Refresh assets
	 */
	refreshAsset(context) {
		let queue = this._refreshQueue[context];
		if (!queue) {
			queue = this._refreshQueue[context] = {};
		}
		if (queue.onGoing) {
			if (!queue.waiting) {
				const self = this;
				queue.waiting = new Promise((resolve, reject) => {
					queue.onGoing.then(() => {
						queue.onGoing = self._refreshAsset(context);
						delete queue.waiting;
						queue.onGoing.then(result => {
							resolve(result);
							delete queue.onGoing;
						}).catch(err => {
							reject(err);
							delete queue.onGoing;
						});
					}).catch(err => {
						queue.onGoing = self._refreshAsset(context);
						delete queue.waiting;
						queue.onGoing.then(result => {
							resolve(result);
							delete queue.onGoing;
						}).catch(err => {
							reject(err);
							delete queue.onGoing;
						});
					});
				});
			}
			return queue.waiting;
		} else {
			queue.onGoing = this._refreshAsset(context);
			return queue.onGoing;
		}
	}
	/*
	 * Update an asset
	 */
	_updateAsset(context, id, asset, overwrite, refresh) {
		if (!id) {
			return Promise.reject({ message: "id must be specified." });
		}
		if (overwrite) {
			return this._addOrUpdateAsset(context, id, asset, refresh);
		} else {
			const self = this;
			return this._getAsset(context, id)
				.then(existingAsset => {
					asset = self._mergeObject(existingAsset, asset);
					return self._addOrUpdateAsset(context, id, asset, refresh);
				});
		}
	}

	_addOrUpdateAsset(context, id, asset, refresh) {
		id = this._extractId(context, id);
		const self = this;
		const promise = id ? this._query(context, null, null, id) : Promise.resolve(true);
		return promise.then(result => {
			const existing = id && result;
			const url = existing ? result.href + '?lean=1' : self._getUrl(context, true);
			const method_override = existing ? 'PATCH' : null;
			return self._addAditionalInfo(context, asset, existing).then(asset => {
				const maximoAsset = self._getMaximoObject(context, asset, !existing);
				return self._run(url, 'POST', method_override, maximoAsset).then(result => {
					result = result || asset;
					if (refresh) {
						return self._refreshAsset(context).then(refreshed => {
							return result;
						});
					} else {
						return result;
					}
				});
			});
		}).catch(error => {
			if (error && error.statusCode === 404) {
				const url = self._getUrl(context, true);
				return self._addAditionalInfo(context, asset, false).then(asset => {
					const maximoAsset = self._getMaximoObject(context, asset, true);
					return self._run(url, 'POST', null, maximoAsset).then(result => {
						result = result || asset;
						if (refresh) {
							return self._refreshAsset(context).then(refreshed => {
								return result;
							});
						} else {
							return result;
						}
					});
				});
			}
		});
	}
	/*
	 * Delete an asset
	 */
	_deleteAsset(context, id, refresh) {
		if (!id) {
			return Promise.reject({ message: "id must be specified." });
		}
		id = this._extractId(context, id);
		const self = this;
		return this._query(context, null, null, id).then(result => {
			return self._run(result.href + '?lean=1', 'POST', 'DELETE').then(result => {
				const attrKey = attributesMap[context].id;
				if (!result) {
					result = {};
					result[attrKey] = id;
				}
				result = self._getAssetObject(context, result);
				if (refresh) {
					return self._refreshAsset(context).then(refreshed => {
						return result;
					});
				} else {
					return result;
				}
			});
		});
	}

	_extractId(context, id) {
		// vehicle id might contain siteId. remove it.
		if (id && context === "vehicle" && id.indexOf(":") > 0) {
			const strs = id.split(":");
			if (strs.length > 1) {
				return strs[1];
			}
		}
		return id;
	}
	_query(context, attributes, conditions, id, pagesize, pageno, properties) {
		const config = this.assetConfig.maximo;
		let where = conditions || [];
		if (id) {
			const idname = attributesMap[context] ? attributesMap[context].id : null;
			where.push(idname + '="' + id + '"');
		}
		if (attributesMap[context] && attributesMap[context].tenant) {
			if (!this.assetConfig.tenant_id || this.assetConfig.tenant_id.toUpperCase() === 'PUBLIC') {
				where.push(attributesMap[context].tenant + '!="*"');
			} else {
				where.push(attributesMap[context].tenant + '="' + this.assetConfig.tenant_id.toUpperCase() + '"');
			}
		}
		where = _.uniq(where);

		let url = this._getUrl(context, true);
		if (attributes && attributes.length > 0) {
			url += '&oslc.select=' + attributes.join(',');
		}
		if (properties && Object.keys(properties).length > 0) {
			url += '&attributesearch=['
				+ _.map(properties, (value, key) => { return `${key}:=${value}`; }).join(";")
				+ ']';
		}
		if (where && where.length > 0) {
			url += '&oslc.where=' + where.join(' and ');
		}
		if (pagesize) {
			url += '&oslc.pageSize=' + pagesize;
		}
		if (pageno > 1) {
			url += '&pageno=' + pageno;
		}
		const options = this._createOptions(url, 'GET');

		const self = this;
		return this._maximoRequest(options, (error, response, result, resolve, reject) => {
			if (!error && response.statusCode >= 200 && response.statusCode < 300) {
				const member = result.member;
				if (id) {
					if (member && member.length > 0) {
						if (config.internalURL) {
							// workaround for secure gateway. maximo api may return internal resource uri
							member[0].href = member[0].href.replace(config.internalURL, config.baseURL);
						}
						resolve(attributes ? self._getAssetObject(context, member[0]) : member[0]);
					} else {
						reject({ statusCode: 404, message: "Not found", response: { statusCode: 404, message: "Not found" } });
					}
				} else {
					resolve(attributes ? _.map(self._filterAssets(context, member), function (m) { return self._getAssetObject(context, m); }) : member);
				}
			} else {
				const msg = 'asset: error(' + _.escape(url) + '): ' + result;
				reject({ message: msg, error: error, response: response });
			}
			return true;
		});
	}

	_run(url, method, method_override, body, config) {
		const options = this._createOptions(url, method, method_override, body, config);
		return this._maximoRequest(options);
	}
	_maximoRequest(options, callback) {
		return this._request(options, (error, response, result, resolve, reject) => {
			const cookie = response && response.headers["set-cookie"];
			if (cookie && cookie.length) {
				if (Asset.cookie) {
					// Logout previous session in case multiple requests were sent before first session id responded.
					this.logout();
				}
				Asset.cookie = cookie[0];
			}
			if (callback) {
				if (callback(error, response, result, resolve, reject)) {
					return true;
				}
			} else {
				if (!error && response && 200 <= response.statusCode && response.statusCode < 300) {
					resolve(result);
				} else {
					reject(error || { statusCode: response.statusCode || 500, message: response.message || response.statusText || "Authorization failed." });
				}
				return true;
			}
		});
	}
	_createOptions(url, method, method_override, body, basicauth) {
		const options = {
			method: method,
			url: url,
			headers: {
				"Content-Type": "application/json"
			}
		};
		if (Asset.cookie) {
			options.headers.cookie = Asset.cookie;
		}
		if (basicauth) {
			options.rejectUnauthorized = false;
			options.auth = {
				username: basicauth.username,
				password: basicauth.password,
				sendImmediately: true
			};
		} else {
			const creds = this.assetConfig.maximo;
			const maxauth = creds.username + ':' + creds.password;
			options.headers.maxauth = new Buffer.from(maxauth).toString('base64');
		}
		if (method_override) {
			if (method_override === 'MERGE') {
				options.headers.patchtype = 'MERGE';
				options.headers['x-method-override'] = 'PATCH';
			} else {
				options.headers['x-method-override'] = method_override;
			}
		}
		if (body) {
			options.data = body;
		}
		return options;
	}

	_addAditionalInfo(context, asset, existing) {
		if (!existing && context === "vehicle") {
			const lon = asset && asset.defaultLocation && asset.defaultLocation.longitude;
			const lat = asset && asset.defaultLocation && asset.defaultLocation.latitude;

			const defs = [];
			if (!asset.mo_id) {
				defs.push(this._setAssetId(context, 6, asset));
			}
			defs.push(this._setSiteId(lon, lat, asset));
			defs.push(this._setClassificationId(asset));
			return Promise.all(defs).then(() => {
				return asset;
			});
		} else {
			return Promise.resolve(asset);
		}
	}

	_setClassificationId(asset) {
		const config = this.assetConfig.maximo;
		let url = this._getUrl("mxclassification", true);
		const classificationid = config.classificationid;
		if (classificationid) {
			url += ('&oslc.select=classstructureid');
			url += ('&oslc.where=classificationid="' + classificationid + '"');
			return this._run(url, "GET").then(result => {
				const member = result.member;
				if (member && member.length > 0) {
					asset.classstructureid = member[0].classstructureid;
				}
				return asset;
			});
		} else {
			return Promise.resolve(asset);
		}
	}

	_setAssetId(context, length, asset, resolve, reject) {
		let id = "", i, random;
		for (i = 0; i < length; i++) {
			random = Math.random() * 16 | 0;
			id += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random))
				.toString(16);
		}
		id = id.toUpperCase();

		const self = this;
		return this._getAsset(context, id).then(result => {
			return self._setAssetId(context, length, asset, resolve, reject);
		}).catch(err => {
			const status = (err.response && (err.response.status || err.response.statusCode)) || 500;
			if (status === 404) {
				asset.mo_id = id;
				return Promise.resolve(asset);
			} else {
				return Promise.reject(err);
			}
		});
	}

	_setSiteId(lon, lat, asset) {
		const self = this;
		const promise = this.sites ? Promise.resolve(this.sites) : this._getAsset("organization", this.assetConfig.maximo.orgid);
		return promise.then(result => {
			if (!self.sites) {
				self.sites = _.map(_.filter(result.site, function (s) { return s.active; }), function (s) {
					return { id: s.siteid, slon: s.startlongitude, slat: s.startlatitude, elon: s.endlongitude, elat: s.endlatitude };
				});
			}
			let siteid = null;
			_.each(self.sites, function (s) {
				if (!siteid || (lon && lat && s.slon <= lon && lon <= s.elon && s.slat <= lat && lat <= s.elat)) {
					siteid = s.id;
				}
			});
			if (siteid) {
				asset.siteid = siteid;
			}
			return asset;
		});
	}
	_getUrl(context, islean) {
		const cred = this.assetConfig.maximo;
		const objectName = this._getResourceObjectName(context).toLowerCase();
		const api = cred.baseURL || (cred.protocol + '://' + cred.hostname + ':' + cred.port + cred.auth_schema);
		let url = api + '/oslc/os/' + objectName;
		if (islean) {
			url += '?lean=1';
		}
		return url;
	}
	_getResourceObjectName(context) {
		return attributesMap[context] ? attributesMap[context].objectstructure : context;
	}
	_getResourceObjectAttributes(context) {
		const map = attributesMap[context] ? attributesMap[context].map : null;
		return map ? _.keys(map) : null;
	}
	_getSearchCondition(context, params) {
		const makeCondition = function (value, key) {
			if (_.isString(value)) {
				return key + '=' + '"' + value + '"';
			} else {
				return key + '=' + value;
			}
		};
		const obj = this._getMaximoObject(context, params, true);
		const conditions = (attributesMap[context] && attributesMap[context].searchCondition) ? attributesMap[context].searchCondition() : null;
		return _.map(obj, makeCondition).concat(_.map(conditions, makeCondition));
	}
	_filterAssets(context, assets) {
		return (attributesMap[context] && attributesMap[context].filter) ? attributesMap[context].filter(assets) : assets;
	}
	_getAssetObject(context, maximoAsset) {
		if (!attributesMap[context]) {
			return maximoAsset;
		}
		return this._convert(maximoAsset, attributesMap[context].map, attributesMap[context].extend);
	}
	_getMaximoObject(context, asset, tenantAware) {
		if (!attributesMap[context]) {
			return asset;
		}
		const map = {};
		_.each(attributesMap[context].map, function (value, key) {
			if (_.isObject(value)) {
				map[value.name] = { name: key, value: value.rvalue };
			} else {
				map[value] = key;
			}
		});
		const maximoAsset = this._convert(asset, map, attributesMap[context].rextend);

		// Set tenant id. Maximo returns an error when tenant is specified for updating.
		if (tenantAware && this.assetConfig.tenant_id && attributesMap[context] && attributesMap[context].tenant) {
			var tenant = this.assetConfig.tenant_id.toUpperCase();
			if (tenant !== 'PUBLIC')
				maximoAsset[attributesMap[context].tenant] = tenant;
		}
		return maximoAsset;
	}
	_convert(org, map, extend) {
		const asset = {};
		_.each(org, function (value, key) {
			const assetElement = map[key];
			if (assetElement) {
				if (_.isObject(assetElement)) {
					if (assetElement.name) {
						asset[assetElement.name] =
							_.isFunction(assetElement.value) ? assetElement.value(value) : assetElement.value;
					}
				} else {
					asset[assetElement] = value;
				}
			}
		});
		if (_.isFunction(extend)) {
			extend(asset);
		}
		return asset;
	}
}
const attributesMap = {
	"vehicle": {
		id: "assetnum", tenant: "pluspcustomer", objectstructure: "IOTCVASSET", map: {
			"assetnum": "mo_id",
			"assetuid": "internal_mo_id",
			"iotcvmodel": "model",
			"iotcvaltmoid": "iotcvaltmoid",
			"iotcvusealtid": "iotcvusealtid",
			"serialnum": "serial_number",
			"status": {
				"name": "status", "value": function (val) {
					return val === "OPERATING" ? "active" : "inactive";
				}, "rvalue": function (val) {
					return (val && val.toLowerCase()) === "active" ? "OPERATING" : "NOT READY";
				}
			},
			"vendor": "vendor",
			"iotcvwidth": "width",
			"iotcvheight": "height",
			"iotcvtype": "type",
			"iotcvusage": "usage",
			"personid": "driver_id",
			"description": "description",
			"siteid": "siteid",
			"classstructureid": "classstructureid",
			"assetspec": {
				"name": "properties", "value": function (val) {
					const props = {};
					_.each(val, function (obj) {
						if (obj.assetattrid) {
							const key = obj.assetattrid.toLowerCase();
							if (obj.alnvalue !== undefined)
								props[key] = obj.alnvalue;
							else if (obj.numvalue !== undefined)
								props[key] = obj.numvalue;
						}
					});
					return props;
				}, "rvalue": function (val) {
					const assetspec = [];
					_.each(val, function (value, key) {
						const spec = { assetattrid: key.toUpperCase(), linearassetspecid: 0 };
						if (value === undefined) {
							return;
						}
						if (_.isNumber(value)) {
							spec.numvalue = value;
						} else {
							spec.alnvalue = value.toString();
						}
						assetspec.push(spec);
					});
					return assetspec;
				}
			}
		}, "rextend": function (asset) {
			asset.assettype = "CV";
		}
	},
	"driver": {
		id: "personid", tenant: "pluspcustomer", objectstructure: "IOTCVDRIVER", map: {
			"personid": "driver_id",
			"personuid": "internal_driver_id",
			"displayname": "name",
			"iotcvcontract": "contract_id",
			"status": {
				"name": "status", "value": function (val) {
					return val.toLowerCase();
				}, "rvalue": function (val) {
					return val && val.toUpperCase();
				}
			}
		}
	},
	"vendor": {
		id: "company", tenant: "pluspinsertcustomer", objectstructure: "MXVENDOR", map: {
			"company": "vendor",
			"name": "name",
			"homepage": "website",
			"type": {
				"name": "type", "value": function (val) {
					if (!val) return val;
					val = val.toUpperCase();
					if (val === "V") {
						return "Vendor";
					} else if (val === "M") {
						return "Manufacturer";
					} else if (val === "C") {
						return "Courier";
					} else if (val === "I") {
						return "Internal";
					}
				}, "rvalue": function (val) {
					if (!val) return val;
					return val.charAt(0).toUpperCase();
				}
			},
			"description": "description",
			"disabled": {
				"name": "status", "value": function (val) {
					return val ? "active" : "inactive";
				}, "rvalue": function (val) {
					return (val && val.toLowerCase()) !== "active";
				}
			},
		}, "rextend": function (asset) {
			asset.currencycode = "USD";
			asset.orgid = Asset.assetConfig.maximo.orgid;
		}
	},
	"eventtype": {
		id: "assetattrid", /*tenant: "pluspcustomer", */objectstructure: "IOTCVEVENTTYPE", map: {
			"assetattrid": "event_type",
			"assetattributeid": "internal_event_type_id",
			"iotcvaffecttype": "affected_type",
			"iotcvcategory": "category",
			"iotcvactive": {
				"name": "status", "value": function (val) {
					return val ? "active" : "inactive";
				}, "rvalue": function (val) {
					return (val && val.toLowerCase()) === "active";
				}
			},
			"description": "description"
		}, "rextend": function (asset) {
			asset.datatype = "ALN";
		}, "searchCondition": function () {
			return { iotcvactive: true };
		}
	},
	"rule": {
		id: "rulenum", tenant: "pluspcustomer", objectstructure: "IOTCVRULE", map: {
			"rulenum": "rule_id",
			"iotcvruleid": "internal_rule_id",
			"type": "type",
			"active": {
				"name": "status", "value": function (val) {
					return val ? "active" : "inactive";
				}, "rvalue": function (val) {
					return (val && val.toLowerCase()) === "active";
				}
			},
			"description": "description",
			"rule": "rule"
		}
	},
	"organization": {
		id: "orgid", objectstructure: "MXORGANIZATION", map: {
			"orgid": "orgid",
			"site": {
				"name": "site", "value": function (val) {
					const sites = [];
					const attrs = ["siteid", "maxcelly", "maxcellx", "startlongitude", "startlatitude", "endlongitude", "endlatitude", "description", "active"];
					_.each(val, function (obj) {
						const site = {};
						_.each(attrs, function (attr) {
							if (obj[attr]) {
								site[attr] = obj[attr];
							}
						});
						sites.push(site);
					});
					return sites;
				}, "rvalue": function (val) {
				}
			}
		}
	},
	"classification": {
		id: "classificationid", objectstructure: "MXCLASSIFICATION", map: {
			"classificationid": "classificationid",
			"useclassindesc": "useclassindesc",
			"description": "description",
			// "genassetdesc": "genassetdesc", // default value = true
			// "classstructureid": "classstructureid", // default value = &AUTOKEY&
			// "pluspisglobal": "pluspisglobal", //defaul tvalue = true
			// "plusprolldownattr": "plusprolldownattr", //default value = true
			// "plusprolldown": "plusprolldown", // default value = true
			"hierarchypath": "hierarchypath",
			"classusewith": {
				"name": "classusewith", "value": function (val) {
					return val;
				}, "rvalue": function (val) {
					return val;
				}
			},
			"classspec": {
				"name": "classspec", "value": function (val) {
					return val;
				}, "rvalue": function (val) {
					return val;
				}
			}
		}
	}
};

module.exports = Asset = new Asset();
