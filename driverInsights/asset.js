/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 *
 * Data Privacy Disclaimer
 * 
 * This Program has been developed for demonstration purposes only to illustrate the technical
 * capabilities and potential business uses of the IBM IoT for Automotive
 * 
 * The components included in this Program may involve the processing of personal information
 * (for example location tracking and behavior analytics). When implemented in practice such
 * processing may be subject to specific legal and regulatory requirements imposed by country
 * specific data protection and privacy laws. Any such requirements are not addressed in
 * this Program.
 * 
 * Licensee is responsible for the ensuring Licensee's use of this Program and any deployed
 * solution meets applicable legal and regulatory requirements. This may require the implementation
 * of additional features and functions not included in the Program.
 * 
 * Apple License issue
 * 
 * This Program is intended solely for use with an Apple iOS product and intended to be used
 * in conjunction with officially licensed Apple development tools and further customized
 * and distributed under the terms and conditions of Licensee's licensed Apple iOS Developer
 * Program or Licensee's licensed Apple iOS Enterprise Program.
 * 
 * Licensee agrees to use the Program to customize and build the application for Licensee's own
 * purpose and distribute in accordance with the terms of Licensee's Apple developer program
 * 
 * Risk Mitigation / Product Liability Issues
 * 
 * The Program and any resulting application is not intended for design, construction, control,
 * or maintenance of automotive control systems where failure of such sample code or resulting
 * application could give rise to a material threat of death or serious personal injury.
 * 
 * IBM shall have no responsibility regarding the Program's or resulting application's compliance
 * with laws and regulations applicable to Licensee's business and content. Licensee is responsible
 * for use of the Program and any resulting application.
 * 
 * As with any development process, Licensee is responsible for developing, sufficiently testing
 * and remediating Licensee's products and applications and Licensee is solely responsible for any
 * foreseen or unforeseen consequences or failures of Licensee's products or applications.
 * 
 * REDISTRIBUTABLES
 * 
 * If the Program includes components that are Redistributable, they will be identified 
 * in the REDIST file that accompanies the Program. In addition to the license rights granted
 * in the Agreement, Licensee may distribute the Redistributables subject to the following terms:
 * 
 * 1) Redistribution must be in source code form only and must conform to all directions,
 *    instruction and specifications in the Program's accompanying REDIST or documentation;
 * 2) If the Program's accompanying documentation expressly allows Licensee to modify
 *    the Redistributables, such modification must conform to all directions, instruction and
 *    specifications in that documentation and these modifications, if any, must be treated
 *    as Redistributables;
 * 3) Redistributables may be distributed only as part of Licensee's application that was developed
 *    using the Program ("Licensee's Application") and only to support Licensee's customers
 *    in connection with their use of Licensee's Application. Licensee's application must constitute
 *    significant value add such that the Redistributables are not a substantial motivation
 *    for the acquisition by end users of Licensee's software product;
 * 4) If the Redistributables include a Java Runtime Environment, Licensee must also include other
 *    non-Java Redistributables with Licensee's Application, unless the Application is designed to
 *    run only on general computer devices (e.g., laptops, desktops and servers) and not on handheld
 *    or other pervasive devices (i.e., devices that contain a microprocessor but do not have
 *    computing as their primary purpose);
 * 5) Licensee may not remove any copyright or notice files contained in the Redistributables;
 * 6) Licensee must hold IBM, its suppliers or distributors harmless from and against any claim
 *    arising out of the use or distribution of Licensee's Application;
 * 7) Licensee may not use the same path name as the original Redistributable files/modules;
 * 8) Licensee may not use IBM's, its suppliers or distributors names or trademarks in connection
 *    with the marketing of Licensee's Application without IBM's or that supplier's
 *    or distributor's prior written consent;
 * 9) IBM, its suppliers and distributors provide the Redistributables and related documentation
 *    without obligation of support and "AS IS", WITH NO WARRANTY OF ANY KIND, EITHER EXPRESS
 *    OR IMPLIED, INCLUDING THE WARRANTY OF TITLE, NON-INFRINGEMENT OR NON-INTERFERENCE AND THE
 *    IMPLIED WARRANTIES AND CONDITIONS OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.;
 * 10) Licensee is responsible for all technical assistance for Licensee's Application and any
 *     modifications to the Redistributables; and
 * 11) Licensee's license agreement with the end user of Licensee's Application must notify the end
 *     user that the Redistributables or their modifications may not be i) used for any purpose
 *     other than to enable Licensee's Application, ii) copied (except for backup purposes),
 *     iii) further distributed or transferred without Licensee's Application or 
 *     iv) reverse assembled, reverse compiled, or otherwise translated except as specifically
 *     permitted by law and without the possibility of a contractual waiver. Furthermore, Licensee's
 *     license agreement must be at least as protective of IBM as the terms of this Agreement.
 * 
 * Feedback License
 * 
 * In the event Licensee provides feedback to IBM regarding the Program, Licensee agrees to assign
 * to IBM all right, title, and interest (including ownership of copyright) in any data, suggestions,
 * or written materials that 1) are related to the Program and 2) that Licensee provides to IBM.
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

	_mergeObject: function(obj1, obj2) {
		for (var key in obj1) {
			if (key in obj2) {
				if (typeof(obj1[key]) === 'object') {
					this._mergeObject(obj1[key], obj2[key]);
				} else {
					obj1[key] = obj2[key];
				}
			}
		}
		for (var key in obj2) {
			if (!(key in obj1)) {
				obj1[key] = obj2[key];
			}
		}
		return obj1;
	},
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
		vehicle = this._mergeObject({
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
	getRule: function(id){
		return this._getAsset("rule", id);
	},
	getRuleXML: function(id){
		var api = "/rule/" + id + "/rule";
		return this._run("GET", api, null, null, true);
	},
	addRule: function(rule, ruleXML){
		var self = this;
		var deferred = Q.defer();
		Q.when(this._runForm("POST", "/rule", rule, function(form) {
			if (ruleXML) {
				form.append("file", ruleXML);
			}
		}), function(response) {
			Q.when(self._run("POST", "/rule/refresh"), function(refreshed){
				deferred.resolve(response);
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	updateRule: function(id, rule, ruleXML, overwrite) {
		var deferred = Q.defer();
		var self = this;
		if (overwrite) {
			var api = "/rule/" + id;
			Q.when(this._runForm("PUT", api, rule, function(form) {
				if (ruleXML) {
					form.append("file", ruleXML);
				}
			}), function(response){
				Q.when(self._run("POST", "/rule/refresh"), function(refreshed){
					deferred.resolve(response);
				})["catch"](function(err){
					deferred.reject(err);
				}).done();
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		} else {
			Q.when(this.getRule(id), function(existingRule) {
				rule = self._mergeObject(existingRule, rule);
				Q.when(self.getRuleXML(id), function(existingXML) {
					ruleXML = ruleXML || existingXML;
					Q.when(self.updateRule(id, rule, ruleXML, true), function(response) {
						deferred.resolve(response);
					})["catch"](function(err){
						deferred.reject(err);
					}).done();
				});
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		}
		return deferred.promise;
	},
	deleteRule: function(id){
		return this._deleteAsset("rule", id);
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
		Q.when(this._addOrUpdateAsset(context, null, asset, refresh), function(response) {
			deferred.resolve(response);
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
			Q.when(this._addOrUpdateAsset(context, id, asset, refresh), function(response) {
				deferred.resolve(response);
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		} else {
			Q.when(this._getAsset(context, id), function(existingAsset) {
				asset = self._mergeObject(existingAsset, asset);
				Q.when(self._addOrUpdateAsset(context, id, asset, refresh), function(response) {
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

	_addOrUpdateAsset: function(context, id, asset, refresh) {
		var self = this;
		var deferred = Q.defer();
		var api = "/" + context + (id?"/"+id:"");
		Q.when(this._run(id?"PUT":"POST", api, null, asset), function(response){
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
	_run: function(method, api, uriParam, body, isText){
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
				deferred.resolve(isText ? body : JSON.parse(body));
			} else {
				var msg = 'asset: error(' + method + ":" + api + '): '+ body;
				console.error(msg);
				deferred.reject({message: msg, error: error, response: response});
			}
		});
		return deferred.promise;
	},
	
	_runForm: function(method, api, params, formCallback){
		var config = this.assetConfig;
		var uri = config.baseURL + api + "?tenant_id=" + config.tenant_id;
		var options = {
				method: method,
				url: uri,
				headers: {
					"Content-Type": "multipart/form-data"
				},
				rejectUnauthorized: false,
				auth: {
					user: config.username,
					pass: config.password,
					sendImmediately: true
				}
		};

		debug("Request: " + JSON.stringify(options));
		var deferred = Q.defer();
		var req = request(options, function(error, response, body){
			if (!error && response.statusCode >= 200 && response.statusCode < 300) {
				deferred.resolve(JSON.parse(body));
			} else {
				var msg = 'asset: error(' + method + ":" + api + '): '+ body;
				console.error(msg);
				deferred.reject({message: msg, error: error, response: response});
			}
		});
		var form = req.form();
		for (var key in params) {
			form.append(key, params[key]);
		}
		formCallback(form);
		return deferred.promise;
	}
};

module.exports = driverInsightsAsset;
