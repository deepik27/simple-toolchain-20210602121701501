/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
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
const BaseApi = require('./BaseApi.js');
const asset = require("./asset.js");
require('dotenv').config();

/*
 * driverInsightsAnalyze is an exported module
 */
class driverBehavior extends BaseApi {
	constructor() {
		super();
		// Configurations for Driver Behavior service is specified in ./probe.js
		this.driverBehaviorConfig = (function () {
			const creds = this._getVCAPCredentials();
			if (creds) {
				return {
					baseURL: (creds.driverinsights && creds.driverinsights.api) ?
						creds.driverinsights.api : (creds.api + "driverinsights"),
					tenant_id: creds.tenant_id || "public",
					username: creds.username,
					password: creds.password
				};
			}
			if (process.env.AUTOMOTIVE_URL) {
				return {
					baseURL: process.env.AUTOMOTIVE_DRB_URL || (process.env.AUTOMOTIVE_URL + "driverinsights"),
					tenant_id: process.env.AUTOMOTIVE_TENANTID || "public",
					username: process.env.AUTOMOTIVE_USERNAME,
					password: process.env.AUTOMOTIVE_PASSWORD
				};
			}
			throw new Exception("!!! no provided credentials for DriverInsights. using shared one !!!");
		}.bind(this))();
	}

	/*
	 * Datastore APIs
	 */
	/**
	 * @param {Object} params - {mo_id: string, from: "YYYY-MM-DDTHH:mm:ss.SSSZ", to: "YYYY-MM-DDTHH:mm:ss.SSSZ", [limit]: number, [offset]: number, [trip_id]: string}
	 * @return {Promise} - Array of probes
	 */
	getCarProbe(params) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/datastore/carProbe',
			qs: params,
			json: true
		}));
	}

	/**
	 * @param {Object} params - {mo_id: string, from: "YYYY-MM-DDTHH:mm:ss.SSSZ", to: "YYYY-MM-DDTHH:mm:ss.SSSZ"}
	 * @return {Promise} - {count: number}
	 */
	getCarProbeCount(params) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/datastore/carProbe/count',
			qs: params,
			json: true
		}));
	}

	/**
	 * @deprecated
	 * @param {Object} probe - probe data with matched lon/lat/heading
	 */
	sendCarProbe(probe) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'POST',
			url: node.baseURL + '/datastore/carProbe',
			body: probe,
			json: true
		}));
	}

	/**
	 *
	 * @param {Object} params - SaaS: {[mo_id]: string, [driver_id]: string, [date]: "YYYY-MM-DD"}
	 * IBM Cloud: {date: "YYYY-MM-DD"}
	 */
	deleteCarProbe(params) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'DELETE',
			url: node.baseURL + '/datastore/carProbe',
			qs: params,
			json: true
		}));
	}

	/**
	 * @deprecated
	 */
	getDateList() {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/datastore/carProbe/dateList',
			json: true
		}));
	}

	/**
	 *
	 * @param {Object} params - {mo_id: string, [from]: "YYYY-MM-DD", [to]: "YYYY-MM-DD", [limit]: number, [offset]: number}
	 */
	getTrip(params) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/datastore/trip',
			qs: params,
			json: true
		}));
	}

	/**
	 *
	 * @param {Object} params - {mo_id: string, trip_id: string, [limit]: number, [offset]: number}
	 */
	getTripCarProbe(params) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/datastore/trip/carProbe',
			qs: params,
			json: true
		}));
	}

	/**
	 *
	 * @param {Object} params - {mo_id: string, trip_id: string}
	 */
	getTripCarProbeCount(params) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/datastore/trip/carProbe/count',
			qs: params,
			json: true
		}));
	}

	deleteTrip(params) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'DELETE',
			url: node.baseURL + '/datastore/trip',
			qs: params,
			json: true
		}));
	}

	/*
	 * Online Behavior APIs
	 */
	/**
	 *
	 * @param {Object} params - {mo_id: string, trip_id: string}
	 */
	getOnlineJobPerTrip(params) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/jobcontrol/online/job/pertrip',
			qs: params,
			json: true
		}));
	}

	/**
	 *
	 * @param {Object} params - {}
	 */
	requestOnlineJobPerTrip(params) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'POST',
			url: node.baseURL + '/jobcontrol/online/job/pertrip',
			body: params,
			json: true
		}));
	}

	/*
	 * Offline Behavior APIs
	 */
	getJobList() {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/jobcontrol/jobList',
			json: true
		}));
	}

	getJobDetails(params) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/jobcontrol/job',
			qs: params,
			json: true
		}));
	}

	requestJob(params) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'POST',
			url: node.baseURL + '/jobcontrol/job',
			body: params,
			json: true
		}));
	}

	deleteJobResults(params) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/drbresult/jobResult',
			qs: params,
			json: true
		}));
	}

	getTripAnalysis(params) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/drbresult/trip',
			qs: params,
			json: true
		}));
	}

	getAnalyzedTripSummaryList(params) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/drbresult/tripSummaryList',
			qs: params,
			json: true
		}));
	}

	/**
	 * Generates the most probable path and destination prediction model data from historical car probe data.
	 *
	 * @param {*} params
	 * {
	 * 	tenant_id: string,
	 * 	from: "yyyy-MM-ddTHH:mm:ss.fff[(Z|+hh:mm|-hh:mm)]", // required
	 * 	to: "yyyy-MM-ddTHH:mm:ss.fff[(Z|+hh:mm|-hh:mm)]", // required
	 * 	type: "vehicle"|"driver", // The type of target data. “vehicle” or “driver” can be specified. Default value is "vehicle".
	 * 	mo_id: string, // This is mandatory when type is “vehicle” or not specified.
	 * 	driver_id: string, // This is mandatory when type is "driver".
	 * 	time_zone: string, // Time zone in the format of [Z|+hh:mm|-hh:mm]
	 * 	re_map_matching: boolean,
	 * 	interpolate: boolean,
	 * 	interpolate_distance_threshold: number
	 * }
	 * @param {Object} trips List of driver’s trips. This is mandatory when type is "driver".
	 */
	generateMPPDPModel(params, trips) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: "PUT",
			url: node.baseURL + "/mppdp/model",
			qs: params,
			body: trips,
			json: true
		}));
	}
	/**
	 * Gets the Origin/Destination (O/D) and route pattern model which is generated by MPP&DP model generation API.
	 *
	 * @param {*} params
	 * {
	 * 	tenant_id: string,
	 * 	type: "vehicle"|"driver", // The type of target data. “vehicle” or “driver” can be specified. Default value is "vehicle".
	 * 	mo_id: string, // This is mandatory when type is “vehicle” or not specified.
	 * 	driver_id: string, // This is mandatory when type is "driver".
	 * 	od_pattern_id: string, // The origin/destination (O/D) pattern ID that is generated by the MPP&DP component of the service.
	 * 	o_longitude: number,
	 * 	o_latitude: number,
	 * 	d_longitude: number,
	 * 	d_latitude: number
	 * }
	 */
	getODPattern(params) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: "GET",
			url: node.baseURL + "/mppdp/odpattern",
			qs: params,
			json: true
		}));
	}

	/**
	 * Predict with the stored car probe data
	 *
	 * @param {*} params
	 * {
	 * 	tenant_id: string,
	 * 	type: "vehicle"|"driver", // The type of target data. “vehicle” or “driver” can be specified. Default value is "vehicle".
	 * 	mo_id: string, // This is mandatory when type is “vehicle” or not specified.
	 * 	driver_id: string, // This is mandatory when type is "driver".
	 * 	trip_id: string, // This is mandatory
	 * 	time_zone: string, // Time zone in the format of [Z|+hh:mm|-hh:mm]
	 * 	tpm_weight: number, // Trajectory pattern model weight. Must be 0 <= tpm_weight <= 1.0. Sum of tpm_weight and hmm_weight must be 1.0.
	 * 	hmm_weight: number, // Hidden markov model weight. Must be 0 <= hmm_weight <= 1.0. Sum of tpm_weight and hmm_weight must be 1.0.
	 * 	min_probability: number, // The minimum probability to return the prediction result. Must be 0 <= min_probability <= 1.0. Default value is 0.01.
	 * 	re_map_matching: boolean,
	 * 	consider_unknown: boolean
	 * }
	 */
	getPrediction(params) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: "GET",
			url: node.baseURL + "/mppdp/stateless/prediction",
			qs: params,
			json: true
		}));
	}
	/**
	 * Predict with the posted car probe data
	 *
	 * @param {*} params
	 * {
	 * 	tenant_id: string,
	 * 	type: "vehicle"|"driver", // The type of target data. “vehicle” or “driver” can be specified. Default value is "vehicle".
	 * 	mo_id: string, // This is mandatory when type is “vehicle” or not specified.
	 * 	driver_id: string, // This is mandatory when type is "driver".
	 * 	time_zone: string, // Time zone in the format of [Z|+hh:mm|-hh:mm]
	 * 	tpm_weight: number, // Trajectory pattern model weight. Must be 0 <= tpm_weight <= 1.0. Sum of tpm_weight and hmm_weight must be 1.0.
	 * 	hmm_weight: number, // Hidden markov model weight. Must be 0 <= hmm_weight <= 1.0. Sum of tpm_weight and hmm_weight must be 1.0.
	 * 	min_probability: number, // The minimum probability to return the prediction result. Must be 0 <= min_probability <= 1.0. Default value is 0.01.
	 * 	re_map_matching: boolean,
	 * 	consider_unknown: boolean
	 * }
	 * @param {Array} probes Array of car probe data. This is mandatory
	 */
	getPredictionWithProbe(params, probes) {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: "POST",
			url: node.baseURL + "/mppdp/stateless/prediction",
			qs: params,
			body: probes,
			json: true
		}));
	}
	/**
	 * Clear cached prediction pattern data
	 *
	 */
	deletePredictionCache() {
		const node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: "DELETE",
			url: node.baseURL + "/mppdp/stateless/prediction/cache",
			json: true
		}));
	}
};
module.exports = new driverBehavior();
