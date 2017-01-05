/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AEGGZJ&popup=y&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var _ = require("underscore");
var Q = new require('q');
var request = require("request");
var cfenv = require("cfenv");
var debug = require('debug')('iot4AAssetApi');
debug.log = console.log.bind(console);

var maximoAssetApi = {
	assetConfig: function(){
		var userVcapSvc = JSON.parse(process.env.USER_PROVIDED_VCAP_SERVICES || '{}');
		var vcapSvc = userVcapSvc.iotforautomotive || VCAP_SERVICES.iotforautomotive;
		if (vcapSvc && vcapSvc.length > 0) {
			var iot4a_cred = vcapSvc[0].credentials;
			if (iot4a_cred.maximo) {
				var vdh = iot4a_cred.vehicle_data_hub && iot4a_cred.vehicle_data_hub.length > 0 && iot4a_cred.vehicle_data_hub[0];
				var vdhCreds = {
					baseURL: vdh ? ("https://" + vdh) : (iot4a_cred.api + "vehicle"),
					username : iot4a_cred.username,
					password : iot4a_cred.password
				};
				var assetCreds = iot4a_cred.maximo;
		        var maximoCreds = {
		        	baseURL: assetCreds.api,
		            username: assetCreds.username,
		            password: assetCreds.password
		          };
				var creds = {tenant_id: iot4a_cred.tenant_id, vdh: vdhCreds, maximo: maximoCreds};
				return creds;
			}
		}
	}(),
	
	_getUrl: function(context, islean) {
		var cred = this.assetConfig.maximo;
		var objectName = this._getResourceObjectName(context).toLowerCase();
		var api = cred.baseURL || (cred.protocol + '://' + cred.hostname + ':' + cred.port + cred.auth_schema);
		var url =  api + '/oslc/os/' + objectName;
		if (islean) {
			url += '?lean=1';
		}
		return url;
	},
	
	_getResourceObjectName: function(context) {
		var object = null;
		if (context === "vehicle") {
			object = "OTCVASSET";
		} else if (context === "driver") {
			object = "IOTCVDRIVER";
		} else if (context === "vendor") {
			object = "IOTCVVENDOR";
		} else if (context === "eventtype") {
			object = "IOTCVEVENTTYPE";
		} else if (context === "rule") {
			object = "IOTCVRULE";
		}
		return object;
	},
	_getResourceObjectAttributes: function(context) {
		var attrs = [];
		if (context === "vehicle") {
			attrs = ["mo_id", "internal_mo_id", "model", "serial_number", "status", "vendor", "width", "height", "type", "usage", "driver_id", "description", "properties"];
		} else if (context === "driver") {
			attrs = ["driver_id", "internal_driver_id", "name", "contract_id", "status"];
		} else if (context === "vendor") {
			attrs = ["vendor", "website", "type", "status", "description"];
		} else if (context === "eventtype") {
			attrs = ["event_type", "internal_event_type_id", "affected_type", "category", "status", "description"];
		} else if (context === "rule") {
			attrs = ["rule_id", "internal_rule_id", "type", "status", "description"];
		}
		return null;
	},
	
	/*
	 * Get list of assets
	 */
	getAssetList: function(context, params){
		var deferred = Q.defer();
		var attributes = this._getResourceObjectAttributes(context);
		Q.when(this._query(context, attributes), function(result) {
			var assets = _.map(result, _.filter(function(attr) {
				_.contains(attributes, attr);
			}));
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},

	/*
	 * Get an asset
	 */
	getAsset: function(context, id){
		var deferred = Q.defer();
		var self = this;
		Q.when(this._query(context, null, id), function(result) {
			Q.when(self._request(result.href + '?lean=1', 'GET'), function(result) {
				deferred.resolve(JSON.parse(result));
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},

	addOrUpdateAsset: function(context, id, asset, refresh) {
		var deferred = Q.defer();
		var self = this;
		Q.when(!id || this._query(context, null, id), function(result) {
			var url = result ? result.href + '?lean=1' : self._getUrl(context, true);
			var method_override = result ? 'PATCH' : null;
			Q.when(self._request(url, 'POST', method_override, asset), function(result) {
				if (refresh) {
					Q.when(self.refreshAsset(context), function(refreshed){
						deferred.resolve(result);
					})["catch"](function(err){
						deferred.reject(err);
					}).done();
				} else {
					deferred.resolve(result);
				}
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	
	/*
	 * Refresh asset information
	 */
	refreshAsset: function(context) {
		var deferred = Q.defer();
		var config = this.assetConfig.vdh;
		var url = config.baseURL;
		var assettype = context == "eventtype" ? "event_type" : context;
		url += "?asset=" + assettype;
		if (this.assetConfig.tenant_id) {
			url += '&tenant_id=' + this.assetConfig.tenant_id;
		}

		Q.when(this._request(url, 'GET', null, null, config), function(result) {
			deferred.resolve(result);
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	/*
	 * Delete an asset
	 */
	deleteAsset: function(context, id){
		var deferred = Q.defer();
		var self = this;
		Q.when(this._query(context, null, id), function(result) {
			Q.when(self._request(result.href + '?lean=1', 'POST', 'DELETE'), function(result) {
				if (refresh) {
					Q.when(self.refreshAsset(context), function(refreshed){
						deferred.resolve(result);
					})["catch"](function(err){
						deferred.reject(err);
					}).done();
				} else {
					deferred.resolve(result);
				}
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	
	getRuleXML: function(id){
		var deferred = Q.defer();
		var self = this;
		Q.when(this._query('rule', ['rule'], id), function(result) {
			deferred.resolve(result.rule);
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	
	addRule: function(rule, ruleXML){
		var deferred = Q.defer();
		var context = 'rule';
		rule.rule = ruleXML.replace(/\n|\r/g, '');
		Q.when(this.addOrUpdateAsset(context, null, rule, true), function(result) {
			deferred.resolve(result);
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	
	updateRule: function(id, rule, ruleXML, overwrite) {
		var deferred = Q.defer();
		var context = 'rule';
		rule.rule = ruleXML.replace(/\n|\r/g, '');
		Q.when(this.addOrUpdateAsset(context, id, rule, true), function(result) {
			deferred.resolve(result);
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},

	_createOptions: function(url, method, method_override, body, creds) {
		var config = creds || this.assetConfig.maximo;
		var options = {
				method: method,
				url: url,
				headers: {
					"Content-Type": "application/json"
				},
				rejectUnauthorized: false,
				auth: {
					user: config.username,
					pass: config.password,
					sendImmediately: true
				}
		};
		if (method_override) {
			if (method_override === 'MERGE') {
				options.headers.patchtype = 'MERGE';
				options.headers['x-method-override'] = 'PATCH';
			} else {
				options.headers['x-method-override'] = method_override;
			}
		}
		if(body){
			options.body = JSON.stringify(body);
			options.headers["Content-Length"] = Buffer.byteLength(options.body);
		}
		return options;
	},
	
	_query: function(context, attributes, id, pagesize, pageno) {
		var config = this.assetConfig.maximo;
		var where = [];
		if (this.assetConfig.tenant_id) {
			where.push('siteid=' + this.assetConfig.tenant_id);
		}
		if (id) {
			where.push('mo_id=' + id);
		}
		
		var url = this._getUrl(context, true);
		if (attributes && attributes.length > 0) {
			url += '&oslc.select=' + attributes.join(',');
		}
		if (where) {
			url += '&oslc.where=' + where.join(' and ');
		}
		if (pagesize) {
			url += '&oslc.pageSize=' + pagesize;
		}
		if (pageno) {
			url += '&pageno=' + pageno;
		}

		var options = this._createOptions(url, 'GET');

		var deferred = Q.defer();
		request(options, function(error, response, body){
			if (!error && response.statusCode >= 200 && response.statusCode < 300) {
				var result = JSON.parse(body);
				var member = result.member;
				if (id) {
					if (member && member.length > 0) {
						deferred.resolve(result[0]);
			        } else {
						deferred.reject({errorStatus: 404, message: "Not found"});
			        }
				} else {
					deferred.resolve(member);
				}
			} else {
				var msg = 'asset: error(' + url + '): '+ body;
				deferred.reject({message: msg, error: error, response: response});
			}
		});
		return deferred.promise;
	},

	_request: function(url, method, method_override, body, config) {
		var options = this._createOptions(url, method, method_override, body, config);

		var deferred = Q.defer();
		request(options, function(error, response, body){
			if (!error && response.statusCode >= 200 && response.statusCode < 300) {
				deferred.resolve(JSON.parse(body));
			} else {
				var msg = 'asset: error(' + method + ":" + api + '): '+ body;
				deferred.reject({message: msg, error: error, response: response});
			}
		});
		return deferred.promise;
	}
};

module.exports = maximoAssetApi;
