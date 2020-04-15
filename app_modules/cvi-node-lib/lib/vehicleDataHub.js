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
const BaseApi = require('./BaseApi.js');

/**
 * http://ibm.biz/IoT4Auto_VDH_APIdoc
 */

const SEND_PROBE_USER_AGENT = process.env.SEND_PROBE_USER_AGENT || "IBM IoT Connected Vehicle Insights Client";

class vehicleDataHub extends BaseApi {
	constructor() {
		super();
		this.vdhConfig = (function () {
			const vdhCreds = this._getVCAPCredentials();
			if (vdhCreds) {
				const vdh = vdhCreds.vehicle_data_hub && vdhCreds.vehicle_data_hub.length > 0 && vdhCreds.vehicle_data_hub[0];
				return {
					baseURL: vdh ? ("https://" + vdh) : (vdhCreds.api + "vehicle"),
					tenant_id: vdhCreds.tenant_id,
					username: vdhCreds.username,
					password: vdhCreds.password
				};
			}
			if (process.env.AUTOMOTIVE_URL) {
				return {
					baseURL: process.env.AUTOMOTIVE_VDH_URL || (process.env.AUTOMOTIVE_URL + "/vehicle"),
					tenant_id: process.env.AUTOMOTIVE_TENANTID,
					username: process.env.AUTOMOTIVE_USERNAME,
					password: process.env.AUTOMOTIVE_PASSWORD
				};
			}
			throw new Exception("!!! no provided credentials for Vehicle Data Hub. using shared one !!!");
		}.bind(this))();
	}

	/**
	 * @param {Object} action - action object like
	 * {"action_id": "", "action_type": "", "start_time": "", "end_time": "", "target_vehicles": [], "target": ""}
	 */
	pushAction(action) {
		const node = this.vdhConfig;
		const options = this._makeRequestOptions(node, {
			method: 'POST',
			url: node.baseURL + '/action',
			data: action
		});
		return this._request(options);
	}
	/**
	  * @param {Object} params
	  *   - REQURES: min_longitude, max_longitude, min_latitude, max_latitude
	*/
	getCarProbe(params) {
		const node = this.vdhConfig;
		const options = this._makeRequestOptions(node, {
			method: "GET",
			url: node.baseURL + '/carProbe',
			params: params
		});

		return this._request(options, function (error, response, result, resolve, reject) {
			if (!error && response && 200 <= response.statusCode && response.statusCode < 300) {
				if (!result.contents) {
					console.warning("getCarProbe: <contents> is missing in the result.");
				}
				resolve(result && result.contents);
			} else {
				const statusCode = response ? response.statusCode : 500;
				console.error("getCarProbe: " + JSON.stringify(options.params));
				console.error("getCarProbe error(" + (response ? response.statusCode : "no response") + "): " + error + ": " + JSON.stringify(result));
				reject({ error: "(getCarProbe): " + JSON.stringify(result), statusCode: statusCode });
			}
			return true;
		});
	}
	/**
	 * @param {Object} carProbeData - probe object like
	 * {"timestamp":"2014-08-16T08:42:51.000Z","trip_id":"86d50022-45d5-490b-88aa-30b6d286938b","speed":0.0,"mo_id":"DBA-6RCBZ","longitude":139.72317575,"latitude":35.68494402,"heading":90.0}
	 * @param {string} [op="async"] - sync or async (default is async)
	 * @return {Promise}
	 */
	sendCarProbe(carProbeData, op) {
		const node = this.vdhConfig;
		const options = this._makeRequestOptions(node, {
			method: 'POST',
			url: node.baseURL + '/carProbe',
			params: op === 'sync' ? { op: op } : {},
			data: carProbeData
		});
		if (SEND_PROBE_USER_AGENT) {
			if (options.headers) {
				Object.assign(options.headers, { "User-Agent": SEND_PROBE_USER_AGENT });
			} else {
				Object.assign(options, { headers: { "User-Agent": SEND_PROBE_USER_AGENT } });
			}
		}
		return this._request(options, function (error, response, result, resolve, reject) {
			if (!error && response && 200 <= response.statusCode && response.statusCode < 300) {
				resolve(result && result.contents);
			} else {
				const statusCode = response ? response.statusCode : 500;
				const resultStr = JSON.stringify(result);
				console.error('sendCarProbe error(' + (response ? response.statusCode : 'no response') + '): ' + error + ': ' + resultStr);
				console.error("sendCarProbe:" + JSON.stringify(options.data));
				reject({ error: "(sendCarProbe): " + resultStr, statusCode: statusCode });
			}
			return true;
		});
	}
	/**
	 * @param {Array} probes - a JSON array like
	 * [
	 *   {"timestamp":"2014-08-16T08:42:51.000Z","trip_id":"86d50022-45d5-490b-88aa-30b6d286938b","speed":0.0,"mo_id":"DBA-6RCBZ","longitude":139.72317575,"latitude":35.68494402,"heading":90.0},
	 *   {"timestamp":"2014-08-16T08:42:52.000Z","trip_id":"86d50022-45d5-490b-88aa-30b6d286938b","speed":0.0,"mo_id":"DBA-6RCBZ","longitude":139.72317628,"latitude":35.68494884,"heading":360.0}
	 *  ]
	 * @param {string} [op="async"] - sync or async (default is async)
	 * @return {Promise}

	 */
	sendCarProbeList(probes, op) {
		const node = this.vdhConfig;
		const options = this._makeRequestOptions(node, {
			method: 'POST',
			url: node.baseURL + '/carProbeList',
			params: op === 'sync' ? { op: op } : {},
			data: probes
		});
		if (SEND_PROBE_USER_AGENT) {
			if (options.headers) {
				Object.assign(options.headers, { "User-Agent": SEND_PROBE_USER_AGENT });
			} else {
				Object.assign(options, { headers: { "User-Agent": SEND_PROBE_USER_AGENT } });
			}
		}
		return this._request(options);
	}
	/**
	 * Get events in the VDH service
	 *
	 * @param {Object} params - {min_latitude: number, min_longitude: number, max_latitude: number, max_longitude: number, [event_type]: string, [status]: number}
	 * @return {Promise}
	 */
	getEvent(params) {
		params.process_type = 'get';
		return this._getOrQueryEvent(params);
	}
	/**
	 * Query events in the VDH service
	 *
	 * @param {Object} params - {latitude: number, longitude: number, distance: number, heading: number, [event_type]: string, [status]: number}
	 * @return {Promise}
	 */
	queryEvent(params) {
		params.process_type = 'query';
		return this._getOrQueryEvent(params);
	}
	/**
	 * Get or query events in the VDH service
	 *
	 * @param {Object} params
	 * @return {Promise}
	 */
	_getOrQueryEvent(params) {
		const node = this.vdhConfig;
		const options = this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/event',
			params: params
		});

		return this._request(options, function (error, response, result, resolve, reject) {
			if (!error && response && 200 <= response.statusCode && response.statusCode < 300) {
				resolve(result.contents);
			} else {
				reject(error || response.toJSON());
			}
			return true;
		});
	}

	/**
	 * Create an event in the Context Mapping servie
	 *
	 * @param {Object} event - a JSON object w/ s_latitude, s_longitude, event_type properties.
	 * @param {string} [op="async"]
	 * @return {Promise} - successful result returns the event ID (integer).
	 */
	createEvent(event, op) {
		const node = this.vdhConfig;
		const options = this._makeRequestOptions(node, {
			method: 'POST',
			url: node.baseURL + '/event',
			params: op === 'sync' ? { op: op } : {},
			data: { event: event }
		});

		return this._request(options, function (error, response, result, resolve, reject) {
			if (!error && response && 200 <= response.statusCode && response.statusCode < 300) {
				resolve(result);
			} else {
				reject(error || response.toJSON());
			}
			return true;
		});
	}

	/**
	 * @param {Object} params
	 */
	getVehicle(params) {
		params = params || {};
		const node = this.vdhConfig;
		const options = this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/vehicle',
			params: params
		});
		return this._request(options);
	}
};

module.exports = new vehicleDataHub();