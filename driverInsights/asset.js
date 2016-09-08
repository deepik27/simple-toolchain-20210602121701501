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

	/*
	 * Vehicle apis
	 */
	getVehicleList: function(params){
		return this._getAssetList("vehicle", params);
	},
	getVehicle: function(mo_id){
		return this._getAsset("vehicle", mo_id);
	},
	addVehicle: function(vehicle){
		vehicle = _.extend({
					status:"inactive",
					properties: {
						fuelTank: 60
					}
				}, vehicle||{});
		return this._addAsset("vehicle", vehicle, true);
	},
	updateVehicle: function(id, vehicle, overwrite){
		return this._updateAsset("vehicle", id || vehicle.mo_id, vehicle, overwrite, true);
	},
	deleteVehicle: function(mo_id){
		return this._deleteAsset("vehicle", mo_id);
	},

	/*
	 * Driver apis
	 */
	getDriverList: function(params){
		return this._getAssetList("driver", params);
	},
	getDriver: function(driver_id){
		return this._getAsset("driver", driver_id);
	},
	addDriver: function(driver){
		driver = _.extend({"status":"active"}, driver||{});
		return this._addAsset("driver", driver, true);
	},
	updateDriver: function(id, driver, overwrite){
		return this._updateAsset("driver", id || driver.driver_id, driver, overwrite, true);
	},
	deleteDriver: function(driver_id){
		return this._deleteAsset("driver", driver_id);
	},

	/*
	 * Vendor api
	 */
	getVendorList: function(params){
		return this._getAssetList("vendor", params);
	},
	getVendor: function(vendor){
		return this._getAsset("vendor", vendor);
	},
	addVendor: function(vendor){
		vendor = _.extend({"status":"active"}, vendor||{});
		return this._addAsset("vendor", vendor, false);
	},
	updateVendor: function(id, vendor, overwrite){
		return this._updateAsset("vendor", id || vendor.vendor, vendor, overwrite, false);
	},
	deleteVendor: function(vendor){
		return this._deleteAsset("vendor", vendor);
	},

	/*
	 * EventType api
	 */
	getEventTypeList: function(params){
		return this._getAssetList("eventtype", params);
	},
	getEventType: function(id){
		return this._getAsset("eventtype", id);
	},
	addEventType: function(event_type){
		return this._addAsset("eventtype", event_type, true);
	},
	updateEventType: function(id, event_type, overwrite) {
		return this._updateAsset("eventtype", id || event_type.event_type, event_type, overwrite, true);
	},
	deleteEventType: function(id){
		return this._deleteAsset("eventtype", id);
	},

	/*
	 * Rule api
	 */
	getRuleList: function(params){
		return this._getAssetList("rule", params);
	},
	getRule: function(rule){
		return this._getAsset("rule", rule);
	},
	addRule: function(rule){
		var deferred = Q.defer();
		deferred.reject("Not implemented yet");
		return deferred.promose;
	},
	
	deleteRule: function(rule){
		return this._getAsset("rule", rule);
	},

	/*
	 * Get list of assets
	 */
	_getAssetList: function(context, params){
		return this._run("GET", "/" + context, params || {num_rec_in_page: 25, num_page: 1});
	},

	/*
	 * Get an asset
	 */
	_getAsset: function(context, id){
		if(!id){
			return Q.reject({message: "id must be specified."});
		}
		var api = "/" + context + "/" + id;
		return this._run("GET", api);
	},

	/*
	 * Add an asset
	 */
	_addAsset: function(context, asset, refresh){
		var deferred = Q.defer();
		var self = this;
		Q.when(this._run("POST", "/" + context, null, asset), function(response){
			if (refresh) {
				Q.when(self._run("POST", "/" + context + "/refresh"), function(refreshed){
					deferred.resolve(response);
				})["catch"](function(err){
					deferred.reject(err);
				}).done();
			} else {
				deferred.resolve(response);
			}
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},

	/*
	 * Update an asset
	 */
	_updateAsset: function(context, id, asset, overwrite, refresh){
		if(!id){
			return Q.reject({message: "id must be specified."});
		}
		var deferred = Q.defer();
		var self = this;
		if (overwrite) {
			var api = "/" + context + "/" + id;
			Q.when(this._run("PUT", api, null, asset), function(response){
				if (refresh) {
					Q.when(self._run("POST", "/" + context + "/refresh"), function(refreshed){
						deferred.resolve(response);
					})["catch"](function(err){
						deferred.reject(err);
					}).done();
				} else {
					deferred.resolve(response);
				}
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		} else {
			Q.when(this._getAsset(context, id), function(existingAsset) {
				asset = _.extend(existingAsset, asset);
				Q.when(self._updateAsset(context, id, asset, true, refresh), function(response) {
					deferred.resolve(response);
				})["catch"](function(err){
					deferred.reject(err);
				}).done();
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		}
		return deferred.promise;
	},

	/*
	 * Delete an asset
	 */
	_deleteAsset: function(context, id){
		if(!id){
			return Q.reject({message: "id must be specified."});
		}
		var api = "/" + context + "/" + id;
		return this._run("DELETE", api);
	},

	/*
	 * Internal methods
	 */
	_run: function(method, api, uriParam, body, headers){
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
				headers: headers || {
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
