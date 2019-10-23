/**
 * Copyright 2016, 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
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
					baseURL: process.env.AUTOMOTIVE_VDH_URL || (process.env.AUTOMOTIVE_URL + "vehicle"),
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
			body: action,
			json: true
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
			qs: params,
			json: true
		});

		return this._request(options, function (error, response, result, resolve, reject) {
			if (!error && response && 200 <= response.statusCode && response.statusCode < 300) {
				if (!result.contents) {
					console.warning("getCarProbe: <contents> is missing in the result.");
				}
				return resolve(result && result.contents);
			} else {
				const statusCode = response ? response.statusCode : 500;
				console.error("getCarProbe: " + JSON.stringify(options.qs));
				console.error("getCarProbe error(" + (response ? response.statusCode : "no response") + "): " + error + ": " + JSON.stringify(result));
				return reject({ error: "(getCarProbe): " + JSON.stringify(result), statusCode: statusCode });
			}
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
			qs: op === 'sync' ? { op: op } : {},
			body: carProbeData,
			json: true
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
				return resolve(result && result.contents);
			} else {
				const statusCode = response ? response.statusCode : 500;
				const resultStr = JSON.stringify(result);
				console.error('sendCarProbe error(' + (response ? response.statusCode : 'no response') + '): ' + error + ': ' + resultStr);
				console.error("sendCarProbe:" + JSON.stringify(options.body));
				return reject({ error: "(sendCarProbe): " + resultStr, statusCode: statusCode });
			}
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
			qs: op === 'sync' ? { op: op } : {},
			body: probes,
			json: true
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
			json: true,
			qs: params
		});

		return this._request(options, function (error, response, result, resolve, reject) {
			if (!error && response && 200 <= response.statusCode && response.statusCode < 300) {
				return resolve(result.contents);
			} else {
				return reject(error || response.toJSON());
			}
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
			json: true,
			qs: op === 'sync' ? { op: op } : {},
			body: { event: event }
		});

		return this._request(options, function (error, response, result, resolve, reject) {
			if (!error && response && 200 <= response.statusCode && response.statusCode < 300) {
				return resolve(result);
			} else {
				return reject(error || response.toJSON());
			}
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
			json: true,
			qs: params
		});
		return this._request(options);
	}
};

module.exports = new vehicleDataHub();