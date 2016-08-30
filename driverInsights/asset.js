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
var debug = require('debug')('asset');
debug.log = console.log.bind(console);

var driverInsightsAsset = {
	assetConfig: function(){
		var userVcapSvc = JSON.parse(process.env.USER_PROVIDED_VCAP_SERVICES || '{}');
		var vcapSvc = userVcapSvc.iotforautomotive || VCAP_SERVICES.iotforautomotive;
		if (vcapSvc) {
			var assetCreds = vcapSvc[0].credentials;
			return {
				baseURL: assetCreds.api + "asset",
				tenant_id : assetCreds.tenant_id,
				username : assetCreds.username,
				password : assetCreds.password
			};
		}
		throw new Exception("!!! no provided credentials for Asset Data Management. using shared one !!!");
	}(),

	/**
	 * Vehicle list api returns the first 10 vehicles as default
	 */
	VEHICLE_VENDOR_IBM: "IBM",
	getVehicleList: function(){
		return this._run("GET", "/vehicle");
	},
	getVehicle: function(mo_id){
		if(!mo_id){
			return Q.reject({message: "mo_id must be specified."});
		}
		var api = "/vehicle/" + mo_id;
		return this._run("GET", api);
	},
	addVehicle: function(){
		var deferred = Q.defer();
		var self = this;
		var vehicle = {
			status:"Inactive",
			properties: {
				fuelTank: 60
			}
		};
		Q.when(this._run("POST", "/vehicle", null, vehicle), function(response){
			Q.when(self._run("POST", "/vehicle/refresh"), function(refreshed){
				deferred.resolve(response);
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	updateVehicle: function(vehicle){
		if(!vehicle.mo_id){
			return Q.reject({message: "mo_id must be specified."});
		}
		var deferred = Q.defer();
		var self = this;
		var api = "/vehicle/" + vehicle.mo_id;
		Q.when(this._run("PUT", api, null, vehicle), function(response){
			Q.when(self._run("POST", "/vehicle/refresh"), function(refreshed){
				deferred.resolve(response);
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	deleteVehicle: function(mo_id){
		if(!mo_id){
			return Q.reject({message: "mo_id must be specified."});
		}
		var api = "/vehicle/" + mo_id;
		return this._run("DELETE", api);
	},

	/**
	 * Vehicle list api returns the first 10 vehicles as default
	 */
	getDriverList: function(){
		return this._run("GET", "/driver");
	},
	getDriver: function(driver_id){
		if(!driver_id){
			return Q.reject({message: "driver_id must be specified."});
		}
		var api = "/driver/" + driver_id;
		return this._run("GET", api);
	},
	addDriver: function(){
		var deferred = Q.defer();
		var self = this;
		Q.when(this._run("POST", "/driver", null, {"status":"Active"}), function(response){
			Q.when(self._run("POST", "/driver/refresh"), function(refreshed){
				deferred.resolve(response);
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	updateDriver: function(driver){
		if(!driver.driver_id){
			return Q.reject({message: "driver_id must be specified."});
		}
		var deferred = Q.defer();
		var self = this;
		var api = "/driver/" + driver.driver_id;
		Q.when(this._run("PUT", api, null, driver), function(response){
			Q.when(self._run("POST", "/driver/refresh"), function(refreshed){
				deferred.resolve(response);
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	deleteDriver: function(driver_id){
		if(!driver_id){
			return Q.reject({message: "driver_id must be specified."});
		}
		var api = "/driver/" + driver_id;
		return this._run("DELETE", api);
	},

	/*
	 * Internal methods
	 */
	_run: function(method, api, uriParam, body){
		if(!api){
			errorback();
			return;
		}
		var config = this.assetConfig;
		var uri = config.baseURL + api + "?tenant_id=" + config.tenant_id;
		if(uriParam === null || uriParam === undefined){
			//do nothing
		}else if(typeof uriParam === "string"){
			uri += uriParam; // "&key1=value1&key2=value2..."
		}else if(typeof uriParam === "object"){
			uri += "&" + Object.keys(uriParam).map(function(key){return key + "=" + uriParam[key];}).join("&");
		}
		var options = {
				method: method,
				url: uri,
				headers: {
					"Content-Type": "application/json; charset=UTF-8"
				},
				rejectUnauthorized: false,
				auth: {
					user: config.username,
					pass: config.password,
					sendImmediately: true
				}
		};
		if(body){
			options.body = JSON.stringify(body);
			options.headers["Content-Length"] = Buffer.byteLength(options.body);
		}

		debug("Request: " + JSON.stringify(options));
		var deferred = Q.defer();
		request(options, function(error, response, body){
			if (!error && response.statusCode >= 200 && response.statusCode < 300) {
				deferred.resolve(JSON.parse(body));
			} else {
				var msg = 'asset: error(' + method + ":" + api + '): '+ body;
				console.error(msg);
				deferred.reject({message: msg, error: error, response: response});
			}
		});
		return deferred.promise;
	}
};

module.exports = driverInsightsAsset;
