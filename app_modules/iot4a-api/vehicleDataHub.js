/**
 * Copyright 2016, 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var vehicleDataHub = module.exports = {};

var _ = require("underscore");
var Q = new require('q');
var request = require('./requestSecureGw.js'); 
var debug = require('debug')('vehicleDataHub');
debug.log = console.log.bind(console);

var SEND_PROBE_USER_AGENT = process.env.SEND_PROBE_USER_AGENT || "IoT4A Starter App Fleet Management";

_.extend(vehicleDataHub, {

	vdhConfig: function(){
		var userVcapSvc = JSON.parse(process.env.USER_PROVIDED_VCAP_SERVICES || '{}');
		var vcapSvc = userVcapSvc.iotforautomotive || VCAP_SERVICES.iotforautomotive;
		if (vcapSvc) {
			var vdhCreds = vcapSvc[0].credentials;
			var vdh = vdhCreds.vehicle_data_hub && vdhCreds.vehicle_data_hub.length > 0 && vdhCreds.vehicle_data_hub[0];
			return {
				baseURL: vdh ? ("https://" + vdh) : (vdhCreds.api + "vehicle"),
				tenant_id : vdhCreds.tenant_id,
				username : vdhCreds.username,
				password : vdhCreds.password
			};
		}
		throw new Exception("!!! no provided credentials for Vehicle Data Hub. using shared one !!!");
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

	/**
	 * @param carProbeData a JSON array like
	 * [
	 *   {"timestamp":"2014-08-16T08:42:51.000Z","trip_id":"86d50022-45d5-490b-88aa-30b6d286938b","speed":0.0,"mo_id":"DBA-6RCBZ","longitude":139.72317575,"latitude":35.68494402,"heading":90.0},
	 *   {"timestamp":"2014-08-16T08:42:52.000Z","trip_id":"86d50022-45d5-490b-88aa-30b6d286938b","speed":0.0,"mo_id":"DBA-6RCBZ","longitude":139.72317628,"latitude":35.68494884,"heading":360.0}
	 *  ]
	 * @param op sync or async (default is async)
	 */
	sendCarProbe: function(carProbeData, op) {
		var node = this.vdhConfig;
		var options = this._makeRequestOptions(node, {
			method: 'POST',
			url: node.baseURL + '/carProbe',
			qs: op === 'sync' ? {op: op} : {},
			body: carProbeData,
			json: true
		});
		if(SEND_PROBE_USER_AGENT){
			if(options.headers){
				_.extend(options.headers, {"User-Agent": SEND_PROBE_USER_AGENT});
			}else{
				_.extend(options, {headers: {"User-Agent": SEND_PROBE_USER_AGENT}});
			}
		}
		var deferred = Q.defer();
		debug("sendCarProbe(url): " + options.url);
		debug("sendCarProbe:" + JSON.stringify(options.body));
		request(options, function(error, response, result){
			if(!error && response && 200 <= response.statusCode && response.statusCode < 300) {
				deferred.resolve(result && result.contents);
			} else {
				var statusCode = response ? response.statusCode : 500;
				var resultStr = JSON.stringify(result);
				console.error("sendCarProbe:" + JSON.stringify(options.body));
				console.error('sendCarProbe error(' + (response ? response.statusCode : 'no response') + '): '+ error + ': ' + resultStr);
				deferred.reject({error: "(sendCarProbe): " + resultStr, statusCode: statusCode});
			}
		});

		return deferred.promise;
	},	
	/**
	  * @param qs as dict: see https://developer.ibm.com/api/view/id-265:title-IBM_IoT_for_Automotive___Vehicle_Data_Hub#GetCarProbe
		*   - REQURES: min_longitude, max_longitude, min_latitude, max_latitude
		*/
	getCarProbe: function(qs) {
		var node = this.vdhConfig;
		var options =  this._makeRequestOptions(node, {
			method: "GET",
			url: node.baseURL + '/carProbe',
			qs: qs,
			json: true
		});

		var deferred = Q.defer();
		debug("getCarProbe(url): " + options.url);
		request(options, function(error, response, result){
			if(!error && response && 200 <= response.statusCode && response.statusCode < 300) {
				if(!result.contents){
					console.warning("getCarProbe: <contents> is missing in the result.");
				}
				return deferred.resolve(result && result.contents);
			}else{
				var statusCode = response ? response.statusCode : 500;
				console.error("getCarProbe: " + JSON.stringify(options.qs));
				console.error("getCarProbe error(" + (response ? response.statusCode : "no response") + "): " + error + ": " + JSON.stringify(result));
				deferred.reject({error: "(getCarProbe): " + JSON.stringify(result), statusCode: statusCode});
			}
		});
		return deferred.promise;
	},	
	/**
	 * Create an event in the Context Mapping servie
	 * https://developer.ibm.com/api/view/id-194:title-IBM__Watson_IoT_Context_Mapping#POST/eventservice/event
	 * @param event: a JSON object w/ s_latitude, s_longitude, event_type properties. 
	 * @returns deferred. successful result returns the event ID (integer).
	 */
	createEvent: function(event, op) {
		var node = this.vdhConfig;
		var options = this._makeRequestOptions(node, {
			method: 'POST',
			url: node.baseURL + '/event',
			json: true,
			qs: op === 'sync' ? {op: op} : {},
			body: {event: event}
		});

		var deferred = Q.defer();
		debug('Creating a new event: ', options);
		request(options, function(error, response, result){
			if(!error && response && 200 <= response.statusCode && response.statusCode < 300) {
				debug('Event created: ', result);
				return deferred.resolve(result.contents);
			}else {
				return deferred.reject(error || response.toJSON());
			}
		});
		return deferred.promise;
	},	
	/**
	 * Get events in the VDH service
	 * https://developer.ibm.com/api/view/id-194:title-IBM__Watson_IoT_Context_Mapping#GET/eventservice/event/query
	 * @param min_lat, min_lng, max_lat, max_lng: areas to query
	 * @param event_type: optional
	 * @param status: optional
	 * @returns deferred.
	 */
	getEvent: function(min_lat, min_lng, max_lat, max_lng, event_type, status) {
		var qs = {
				process_type: 'get',
				min_latitude: min_lat,
				min_longitude: min_lng,
				max_latitude: max_lat,
				max_longitude: max_lng
		};
		if (event_type) qs.event_type = event_type;
		if (status) qs.status = status;
		return this.getOrQueryEvent(qs);
	},
	
	/**
	 * Query events in the VDH service
	 * @param lat, lng, distance, hedding: areas to query
	 * @param event_type: optional
	 * @param status: optional
	 * @returns deferred.
	 */
	queryEvent: function(lat, lng, distance, heading, event_type, status) {
		var qs = {
				process_type: 'query',
				latitude: lat,
				longitude: lng,
				distance: distance,
				heading: heading
		};
		if (event_type) qs.event_type = event_type;
		if (status) qs.status = status;
		return this.getOrQueryEvent(queryParams);
	},	
	/**
	 * Get or query events in the VDH service
	 * @returns deferred.
	 */
	getOrQueryEvent: function(qs) {
		var node = this.vdhConfig;
		var options = this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/event',
			json: true,
			qs: qs
		});

		var deferred = Q.defer();
		request(options, function(error, response, result) {
			if(!error && response && 200 <= response.statusCode && response.statusCode < 300) {
				deferred.resolve(result.contents);
			}else{
				return deferred.reject(error || response.toJSON());
			}
		});
		return deferred.promise;
	}
});
