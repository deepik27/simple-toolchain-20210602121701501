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
var driverBehavior = module.exports = {};

var _ = require("underscore");
var Q = require("q");
var request = require('request'); 
var debug = require('debug')('driverBehavior');
debug.log = console.log.bind(console);


/*
 * driverInsightsAnalyze is an exported module
 */
_.extend(driverBehavior, {
	// Configurations for Driver Behavior service is specified in ./probe.js
	driverBehaviorConfig: function(){
		var userVcapSvc = JSON.parse(process.env.USER_PROVIDED_VCAP_SERVICES || '{}');
		var vcapSvc = userVcapSvc.iotforautomotive || VCAP_SERVICES.iotforautomotive;
		if (vcapSvc) {
			var creds = vcapSvc[0].credentials;
			return {
				baseURL: (creds.driverinsights && creds.driverinsights.api) ? 
						creds.driverinsights.api : (creds.api + "driverinsights"),
				tenant_id : creds.tenant_id,
				username : creds.username,
				password : creds.password
			};
		}
		throw new Exception("!!! no provided credentials for DriverInsights. using shared one !!!");
	}(),
		
	_makeRequestOptions: function(config, options) {
		// Add query parameters to options.url if tenant id exists
		if (config.tenant_id) {
			if (!options.qs) options.qs = {};
			options.qs.tenant_id = config.tenant_id;
		}
		
		// Add basic authentication if username and password are specified
		if (config.username && config.password) {
			return _.extend(options, {
				rejectUnauthorized: false,
				auth: {
					user: config.username,
					pass: config.password,
					sendImmediately: true
				}
			});
		}
		return options;
	},
	
	_request: function(options) {
		var deferred = Q.defer();
		request(options, function(error, response, body){
			if (!error && response.statusCode >= 200 && response.statusCode < 300) {
				deferred.resolve(body);
			} else {
				deferred.reject(error || {statusCode: response.statusCode || 500, message: response.body || "Function is not supported or not available temporarily."});
			}
		});
		return deferred.promise;
	},

	/*
	 * Datastore APIs
	 */
	getCarProbe: function(params) {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/datastore/carProbe',
			qs: params,
			json: true
		}));
	},

	getCarProbeCount: function(params) {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/datastore/carProbe/count',
			qs: params,
			json: true
		}));
	},

	sendCarProbe: function(params) {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'POST',
			url: node.baseURL + '/datastore/carProbe',
			qs: params,
			json: true
		}));
	},

	deleteCarProbe: function(params) {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'DELETE',
			url: node.baseURL + '/datastore/carProbe',
			qs: params,
			json: true
		}));
	},

	getDateList: function(params) {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/datastore/dateList',
			qs: params,
			json: true
		}));
	},

	getTrip: function(params) {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/datastore/trip',
			qs: params,
			json: true
		}));
	},

	getTripCarProbe: function(params) {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/datastore/trip/carProbe',
			qs: params,
			json: true
		}));
	},

	getTripCarProbeCount: function(params) {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/datastore/trip/carProbe/count',
			qs: params,
			json: true
		}));
	},

	deleteTrip: function(params) {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'DELETE',
			url: node.baseURL + '/datastore/carProbe',
			qs: params,
			json: true
		}));
	},

	/*
	 * Offline Behavior APIs
	 */
	getOnlineJobPerTrip: function(params) {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/jobcontrol/online/job/pertrip',
			qs: params,
			json: true
		}));
	},

	requestOnlineJobPerTrip: function(params) {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'POST',
			url: node.baseURL + '/jobcontrol/online/job/pertrip',
			body: params,
			json: true
		}));
	},
	
	/*
	 * Online Behavior APIs
	 */
	getJobList: function() {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/jobcontrol/jobList',
			json: true
		}));
	},

	getJobDetails: function(params) {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/jobcontrol/job',
			qs: params,
			json: true
		}));
	},

	requestJob: function(params) {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'POST',
			url: node.baseURL + '/jobcontrol/job',
			qs: params,
			json: true
		}));
	},

	deleteJobResults: function(params) {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/drbresult/jobResult',
			qs: params,
			json: true
		}));
	},

	getTripAnalysis: function(params) {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/drbresult/trip',
			qs: params,
			json: true
		}));
	},

	getAnalyzedTripSummaryList: function(params) {
		var node = this.driverBehaviorConfig;
		return this._request(this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/drbresult/tripSummaryList',
			qs: params,
			json: true
		}));
	}
});