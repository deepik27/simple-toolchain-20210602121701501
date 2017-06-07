/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var driverInsightsAlert = module.exports = {};

var _ = require("underscore");
var Q = require("q");
var cfenv = require("cfenv");
var moment = require("moment");
var fs = require("fs-extra");
var iot4aAsset = app_module_require('iot4a-api/asset.js');
var alertManager = require("./alertManager.js");

var debug = require('debug')('alert');
debug.log = console.log.bind(console);

var VEHICLE_VENDOR_IBM = "IBM";
var ALERT_RULE_TEMPLATE_DIR = process.env.ALERT_RULE_TEMPLATE_DIR || "./driverInsights/alertrules/";
var ALERT_RULE_DESCRIPTION = "ALERT RULE: ";
var ALERT_RULE_ID_RANGE_MAX = 21000;
var ALERT_RULE_ID_RANGE_MIN = 20000;
var MAX_NUM_REC_IN_PAGE = 50;
var ALERT_LIFE_SPAN = process.env.ALERT_LIFE_SPAN || 3000;

_.extend(driverInsightsAlert, {
	/*
	 * Vehicle information accessible in alert rules defined by JS
	 * 
	 * {mo_id: {
	 * 	vehicleInfo: {status: "Active", properties: {fueltank: 60}},
	 * 	prevProbe: {ts: xxxxxxxxx, ...., props: {fuel: 49.1, engineTemp: 298.2}}
	 * }}
	 */
	_vehicles: {},

	/*
	 * Alert rules defined by JS is required to be implemented as following in ALERT_RULE_TEMPLATE_DIR
	 * 
	 * module.exports = {
	 * 	name: "rule name",
	 * 	description: "rule description",
	 * 	fireRule: function(probe, vehicle){return newAlerts;},
	 * 	closeRule: function(alert, probe, vehicle){return closedAlert;}
	 * }
	 */
	_alertRules: {},

	/*
	 * Timer for each mo_id to close alerts created from notified actions
	 * 
	 * {
	 * 	mo_id: timer_id
	 * }
	 */
	_alertTimer: {},

	_init: function(){
		var self = this;

		this.importAlertRules();

		fs.readdir(ALERT_RULE_TEMPLATE_DIR, function(err, files){
			if(err){
				console.error("Error: Reading alert rules is failed. " + err);
				return;
			}
			files.filter(function(file){return file.endsWith(".js")}).forEach(function(file){
				fs.realpath(ALERT_RULE_TEMPLATE_DIR + file, function(err, resolvedPath){
					var rule = require(resolvedPath);
					self.registerAlertRule(rule.name, rule);
				});
			});
		});
	},

	/*
	 * Remove all existing alert rules in iot4a and import alert rules defined as xml in ALERT_RULE_TEMPLATE_DIR again
	 */
	importAlertRules: function(){
		var self = this;
		Q.when(this._findAlertRulesRecursive(1), function(rules){
			if(rules && rules.length > 0){
				Q.allSettled(rules.map(function(rule){
					var deferred = Q.defer();
					rule.status = "inactive";
					Q.when(iot4aAsset.updateRule(rule.rule_id, rule, null, true), function(updated){
						Q.when(iot4aAsset.deleteRule(rule.rule_id, true), function(deleted){
							deferred.resolve(deleted);
						})["catch"](function(err){
							deferred.reject(err);
						}).done();
					})["catch"](function(err){
						deferred.reject(err);
					}).done();
					return deferred.promise;
				})).then(function(deletedRules){
					if(Array.isArray(deletedRules)){
						deletedRules.forEach(function(deleted){
							if(deleted.state === "rejected"){
								console.error("Deleting existing alert rules failed.");
								console.error(deleted.reason.message);
							}else{
								debug("Alert rule (" + deleted.value.id + ") is deleted.");
							}
						})
					}
					Q.when(iot4aAsset.refreshRule(), function(response){
						self._addRules();
					})["catch"](function(err){
						self._addRules();
					});
				}, function(err){
					console.error("Deleting existing alert rules failed.");
					console.error(err.message);
				}).done();
			}else{
				self._addRules();
			}
		})["catch"](function(err){
			console.error("Importing alert rules failed.");
			console.error(err.message);
		}).done();
	},
	_addRules: function(){
		var alert_rule_id_offset = 0;
		fs.readdir(ALERT_RULE_TEMPLATE_DIR, function(err, files){
			if(err){
				console.error("Error: Reading alert rules is failed. " + err);
				return;
			}
			files.filter(function(file){return file.endsWith(".xml")}).forEach(function(file){
				fs.readFile(ALERT_RULE_TEMPLATE_DIR + file, {encoding: "UTF-8"}, function(err, data){
					if(err){
						console.error("Error: Reading an alert rule(" + file + ") is failed. " + err);
					}
					var alert_rule_id = ALERT_RULE_ID_RANGE_MIN + alert_rule_id_offset++;
					if(alert_rule_id > ALERT_RULE_ID_RANGE_MAX){
						console.error("Alert rule id cannot be assigned.");
					}
					var rule = {description: ALERT_RULE_DESCRIPTION + alert_rule_id, type: "Action", status: "active"};
					data = data.replace(/\{alert_rule_id\}/g, alert_rule_id);
					iot4aAsset.addRule(rule, data);
				})
			});
		});
	},
	_findAlertRulesRecursive: function(num_page){
		var self = this;
		var deferred = Q.defer();
		Q.when(iot4aAsset.getRuleList({num_rec_in_page: MAX_NUM_REC_IN_PAGE, num_page: num_page}), function(result){
			var rules_in_page = (result && result.data) || [];
			var alert_rules_in_page = rules_in_page.filter(function(rule){return rule.description.startsWith(ALERT_RULE_DESCRIPTION);});
			if(rules_in_page.length >= MAX_NUM_REC_IN_PAGE){
				Q.when(self._findAlertRulesRecursive(num_page + 1), function(alert_rules){
					deferred.resolve(alert_rules.concat(alert_rules_in_page));
				})["catch"](function(err){
					deferred.reject(err);
				}).done();
			}else{
				deferred.resolve(alert_rules_in_page);
			}
		})["catch"](function(err){
			if(err.response && err.response.statusCode === 404){
				deferred.resolve([]);
			}else{
				deferred.reject(err);
			}
		}).done();
		return deferred.promise;
	},

	evaluateAlertRule: function(probe){
		var self = this;
		Q.when(this._getVehicle(probe.mo_id), function(vehicle){
			self._evaluateAlertRule(probe, _.clone(vehicle));
			vehicle.prevProbe = probe;
		});
	},
	_evaluateAlertRule: function(probe, vehicle){
		var self = this;
		_.values(this._alertRules).forEach(function(rule){
			setImmediate(function(){
				var alerts = rule.fireRule(probe, vehicle);
				alerts.forEach(function(alert){
					alertManager.addAlert(alert);
				});
			});
		});
		var _alertsForVehicle = _.clone(alertManager.getCurrentAlerts(probe.mo_id));
		Object.keys(_alertsForVehicle).forEach(function(key){
			var alert = _alertsForVehicle[key];
			if(alert && alert.source && alert.source.type === "script"){
				setImmediate(function(){
					var rule = self._alertRules[alert.type];
					if(rule){
						var closedAlert = rule.closeRule(alert, probe, vehicle);
						if(closedAlert){
							alertManager.updateAlert(closedAlert);
						}
					}else{
						alert.closed_ts = probe.ts;
						alertManager.updateAlert(alert);
					}
				});
			}
		});
	},
	_getVehicle: function(mo_id){
		var self = this;
		var deferred = Q.defer();
		var vehicle = this._vehicles[mo_id];
		if(vehicle){
			deferred.resolve(vehicle);
		}else{
			Q.when(iot4aAsset.getVehicle(mo_id), function(vehicleInfo){
				self._vehicles[mo_id] = vehicle = {
					vehicleInfo: vehicleInfo
				};
				deferred.resolve(vehicle);
			}, function(error){
				console.error(error);
				deferred.reject(error);
			});
		}
		return deferred.promise;
	},

	handleEvents: function(mo_id, events){
		this.closeAlertFromEvents(mo_id, events);
		this.addAlertFromEvents(mo_id, events);
	},
	addAlertFromEvents: function(mo_id, events){
		var self = this;
		var ts = moment().valueOf();
		(events||[]).forEach(function(event){
			var props = event.props || {}; // A message should have props
			var source_id = String(event.event_id || props.source_id);
			var source_type = "";
			if(event.event_id){
				source_type = "event";
			}else if(props.message_type){
				source_type = "message";
			}
			if(!source_id){
				return;
			}
			var alert = alertManager.getCurrentAlerts(mo_id, source_id);
			if(alert){
				// Do nothing during same id/type of events/messages are coming consecutively
			}else{
				Q.when(self._getVehicle(mo_id), function(vehicle){
					alert = {
							source: {type: source_type, id: source_id},
							type: event.event_type || props.message_type,
							description: event.event_name || event.message,
							severity: props.severity || "Info",
							mo_id: mo_id,
							ts: ts,
							latitude: event.s_latitude || event.latitude || props.latitude,
							longitude: event.s_longitude || event.longitude || props.longitude,
							simulated: VEHICLE_VENDOR_IBM === vehicle.vehicleInfo.vendor
						};
					alertManager.addAlert(alert);
				});
			}
		});

		var timer = this._alertTimer[mo_id];
		clearTimeout(timer);
		this._alertTimer[mo_id] = setTimeout(function(){
			self.closeAlertFromEvents(mo_id);
		}, ALERT_LIFE_SPAN);
	},
	closeAlertFromEvents: function(mo_id, events){
		var self = this;
		var closed_ts = moment().valueOf();
		var _alertsForVehicle = _.clone(alertManager.getCurrentAlerts(mo_id));
		Object.keys(_alertsForVehicle).forEach(function(key){
			var source_type = _alertsForVehicle[key].source && _alertsForVehicle[key].source.type;
			if(source_type === "script"){
				return;
			}
			if((events || []).every(function(event){
				// No related event/message is included in events
				var props = event.props || {}; // A message should have props
				var source_id = event.event_id || props.source_id;
				return !source_id || key !== String(source_id);
			})){
				var alert = _alertsForVehicle[key];
				alert.closed_ts = closed_ts;
				alertManager.updateAlert(alert);
			}
		});
	},
	getAlertsForVehicleInArea: function(conditions, area, includeClosed, limit){
		return alertManager.getAlertsForVehicleInArea(conditions, area, includeClosed, limit);
	},
	getAlertsForVehicles: function(mo_ids, includeClosed, limit){
		return alertManager.getAlertsForVehicles(mo_ids, includeClosed, limit);
	},
	getAlerts: function(conditions, includeClosed, limit){
		return alertManager.getAlerts(conditions, includeClosed, limit);
	},

	registerAlertRule: function(/*string*/name, /*function*/rule){
		this._alertRules[name] = rule;
	}
});

driverInsightsAlert._init();