/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
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

var _ = require("underscore");
var Q = new require('q');
var request = require("request");
var cfenv = require("cfenv");
var fs = require("fs-extra");
var moment = require("moment");
//var IOTF = require('../watsonIoT');
var driverInsightsAlert = require("./fleetalert.js");
var driverInsightsTripRoutes = require("./tripRoutes.js");
var debug = require('debug')('probe');
debug.log = console.log.bind(console);

var tripRouteCache = {};
var insertTripRouteTimer = null;


var driverInsightsProbe = {
	last_prob_ts: moment().valueOf(),

	driverInsightsConfig: function(){
		var userVcapSvc = JSON.parse(process.env.USER_PROVIDED_VCAP_SERVICES || '{}');
		var vcapSvc = userVcapSvc.iotforautomotive || VCAP_SERVICES.iotforautomotive;
		if (vcapSvc) {
			var dirverInsightsCreds = vcapSvc[0].credentials;
			return {
				baseURL: dirverInsightsCreds.api + "driverinsights",
				tenant_id : dirverInsightsCreds.tenant_id,
				username : dirverInsightsCreds.username,
				password : dirverInsightsCreds.password
			};
		}
		throw new Exception("!!! no provided credentials for DriverInsights. using shared one !!!");
	}(),

	vdhConfig: function(){
		var userVcapSvc = JSON.parse(process.env.USER_PROVIDED_VCAP_SERVICES || '{}');
		var vcapSvc = userVcapSvc.iotforautomotive || VCAP_SERVICES.iotforautomotive;
		if (vcapSvc) {
			var vdhCreds = vcapSvc[0].credentials;
			var vdh = vdhCreds.vehicle_data_hub.length > 0 && vdhCreds.vehicle_data_hub[0];
			return {
				baseURL: "https://" + vdh,
				tenant_id : vdhCreds.tenant_id,
				username : vdhCreds.username,
				password : vdhCreds.password
			};
		}
		throw new Exception("!!! no provided credentials for Vehicle Data Hub. using shared one !!!");
	}(),

	sendRawData: function(carProbeData, callback) {
		var deviceType = "User Own Device";
		var deviceId = carProbeData.mo_id;

		// check mandatory field
		if(!carProbeData.trip_id || carProbeData.trip_id.length === 0 || !carProbeData.lng || !carProbeData.lat || isNaN(carProbeData.lng) || isNaN(carProbeData.lat) || isNaN(carProbeData.speed)){
			callback("error");
			return;
		}
		var ts = carProbeData.ts || Date.now();
		var payload = {
				// assign ts if missing
				timestamp: moment(ts).format(), // ISO8601
				trip_id: carProbeData.trip_id,
				speed: carProbeData.speed,
				mo_id: carProbeData.mo_id,
				driver_id: carProbeData.driver_id, //FIXME Get car probe requires driver_id as of 20160731
				longitude: carProbeData.lng,
				latitude: carProbeData.lat,
				heading: carProbeData.heading || 0
			};
		if(carProbeData.props){
			payload.props = carProbeData.props;
		}

		Q.when(driverInsightsProbe.sendProbeData([payload], "sync"), function(events){
			debug("events: " + events);
			if(events){
				var _events = JSON.parse(events);
				_events.forEach(function(event){
					driverInsightsAlert.addAlertFromEvent(event);
				});
			}

			Q.when(driverInsightsProbe.getProbeData([payload]), function(response){
				var parsed = JSON.parse(response);
				var probe;
				if(parsed.contents && parsed.contents.length > 0){
					probe = parsed.contents[0];
					_.extend(payload, probe, {ts: ts});
				}

				// Process alert probe rule
				driverInsightsAlert.evaluateAlertRule(payload);

				// Insert trip routes
				var trip_id = payload.trip_id;
				var routeCache = tripRouteCache[trip_id];
				if(!routeCache){
					tripRouteCache[trip_id] = routeCache = {routes: [], deviceType: deviceType, deviceID: deviceId };
				}
				routeCache.routes.push(payload);
				if(!insertTripRouteTimer){
					insertTripRouteTimer = setTimeout(function(){
						var tmp = Object.assign({}, tripRouteCache);
						tripRouteCache = {};
						driverInsightsTripRoutes.insertTripRoutes(tmp);
						insertTripRouteTimer = null;
					}, 5000);
				}

				callback(payload);
			})["catch"](function(err){
				console.error("error: " + JSON.stringify(err));
			}).done();
		})["catch"](function(err){
			console.error("error: " + JSON.stringify(err));
		}).done();
	},
	/*
	 * @param carProbeData a JSON array like
	 * [
	 *   {"timestamp":"2014-08-16T08:42:51.000Z","trip_id":"86d50022-45d5-490b-88aa-30b6d286938b","speed":0.0,"mo_id":"DBA-6RCBZ","longitude":139.72317575,"latitude":35.68494402,"heading":90.0},
	 *   {"timestamp":"2014-08-16T08:42:52.000Z","trip_id":"86d50022-45d5-490b-88aa-30b6d286938b","speed":0.0,"mo_id":"DBA-6RCBZ","longitude":139.72317628,"latitude":35.68494884,"heading":360.0}
	 *  ]
	 * @param op sync or async (default is async)
	 */
	sendProbeData: function(carProbeData, op) {
		var deferred = Q.defer();
		var self = this;
		var node = this.vdhConfig;
		var api = "/carProbe";
		opparam = op === "sync" ? "&op=sync" : "";
		
		var options = {
				method: 'POST',
				url: node.baseURL+api+'?tenant_id='+node.tenant_id+opparam,
				headers: {
					'Content-Type':'application/json; charset=UTF-8'
				},
				rejectUnauthorized: false,
				auth: {
					user: node.username,
					pass: node.password,
					sendImmediately: true
				},
		};
		for (var index = 0, len = carProbeData.length; index < len; index++) {
			options.body = JSON.stringify(carProbeData[index]);
			options.headers["Content-Length"] = Buffer.byteLength(options.body);
			debug("sendProbeData(url): " + options.url);
			debug("sendProbeData:" + options.body);
			request(options, function(error, response, body){
				if (!error && response.statusCode === 200) {
					debug('sendProbData response: '+ body);
					self.last_prob_ts = moment().valueOf(); //TODO Need to care in the case that payload.ts is older than last_prob_ts
					deferred.resolve(body);
				} else {
					console.error("sendProbeData:" + options.body);
					console.error('sendProbeData error(' + (response ? response.statusCode : 'no response') + '): '+ error + ': ' + body);
					deferred.reject({error: "(sendProbeData)" + body});
				}
			});
		}

		return deferred.promise;
	},
	getProbeData: function(carProbeData){
		var deferred = Q.defer();
		var node = this.vdhConfig;
		var api = "/carProbe";
		var options = {
				method: "GET",
				url: node.baseURL + api + "?tenant_id=" + node.tenant_id,
				rejectUnauthorized: false,
				auth: {
					user: node.username,
					pass: node.password,
					sendImmediately: true
				}
		};
		for(var i = 0; i < carProbeData.length; i++){
			var probe = carProbeData[i];
			options.url += ("&min_longitude=" + (probe.longitude-0.1) +
							"&max_longitude=" + (probe.longitude+0.1) +
							"&min_latitude=" + (probe.latitude-0.1) +
							"&max_latitude=" + (probe.latitude+0.1)) +
							"&mo_id=" + probe.mo_id,
							"&driver_id=" + probe.driver_id;
			debug("getProbeData(url): " + options.url);
			request(options, function(error, response, body){
				if(!error && response.statusCode === 200){
					debug("getProbeData response: " + body);
					deferred.resolve(body);
				}else{
					console.error("getProbeData: " + options.body);
					console.error("getProbeData error(" + (response ? response.statusCode : "no response") + "): " + error + ": " + body);
					deferred.reject({error: "(getProbeData)" + body});
				}
			});
		}
		return deferred.promise;
	},
	
	getCarProbeDataListAsDate: function(callback) {
		var deferred = Q.defer();
		
		var node = this.driverInsightsConfig;
		var api = "/datastore/carProbe/dateList";
		var options = {
				method: 'GET',
				url: node.baseURL+api+'?tenant_id='+node.tenant_id,
				headers: {
//					'Content-Type':'application/json; charset=UTF-8',
				},
				rejectUnauthorized: false,
				auth: {
					user: node.username,
					pass: node.password,
					sendImmediately: true
				},
		};
		request(options, function(error, response, body){
			if (!error && response.statusCode === 200) {
				callback && callback(body);
				deferred.resolve(body);
			} else {
				console.error('error: '+ body );
				callback && callback("{ \"error(getCarProbeDataListAsDate)\": \"" + body + "\" }");
				deferred.reject(error||body);
			}
		});
		return deferred.promise;
	}
};

// Update last_prob_ts
driverInsightsProbe.getCarProbeDataListAsDate(function(body){
	try{
		var parsed = JSON.parse(body);
		var probeDateList = parsed && parsed.return_code === 0 && parsed.date;
		if(Array.isArray(probeDateList) && probeDateList.length > 0){
			driverInsightsProbe.last_prob_ts = probeDateList.map(function(probeDate){return moment(probeDate).valueOf();}).sort(function(a, b){return b - a;})[0];
		}
	}catch(ex){
		debug(ex);
		// Don't update last_prob_ts
	}
});

// Export module	
module.exports = driverInsightsProbe;