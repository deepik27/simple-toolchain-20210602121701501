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
var driverInsightsAlert = module.exports = {};

var _ = require("underscore");
var Q = require("q");
var request = require("request");
var cfenv = require("cfenv");
var moment = require("moment");
var dbClient = require('./../cloudantHelper.js');
var driverInsightsAsset = require('./asset.js');
var driverInsightsProbe = require('./probe.js');

var debug = require('debug')('alert');
debug.log = console.log.bind(console);

var FLEETALERT_DB_NAME = "fleet_alert";
var VEHICLE_VENDOR_IBM = "IBM";
var BULK_INSERT_INTERVAL = "1000";

_.extend(driverInsightsAlert, {
	/*
	 * {mo_id: {
	 * 	vehicleInfo: {status: "Active", properties: {fuelTank: 60}},
	 * 	prevProbe: {ts: xxxxxxxxx, ...., props: {fuel: 49.1, engineTemp: 298.2}}
	 * }}
	 */
	_vehicles: {},

	/*
	 * {name: {
	 * 	fireRule: function(probe, vehicle){return newAlerts;},
	 * 	closeRule: function(alert, probe, vehicle){return closedAlert;}
	 * }}
	 */
	alertRules: {},

	/*
	 * {
	 * 	mo_id: {
	 * 		alert_type("half_fuel"): {source: {type: "script", id: "half_fuel"}, type: "half_fuel", description: "xxx", severity: "Critical/High/Medium/Low", mo_id: "xxxx-xxxx-xxx...", ts: xxxx},
	 * 		message_type("message_xxxxx"): {source: {type: "message", id: message_type}, type: message_type, description: "xxx", severity: "Critical/High/Medium/Low", mo_id: "xxxx-xxxx-xxx...", ts: xxxx},
	 * 		event_id("yyyyy"): {source: {type: "event", id: event_id}, type: "023", description: "Major Event", severity: "Low", ...}
	 * 	},
	 * 	mo_id: {...}
	 * }
	 */
	alerts: {},

	/*
	 * Accumulate alerts to insert(create/close) and insert by bulk
	 */
	alertsToInsert: {},
	insertTimeout: null,
	db: null,

	_init: function(){
		var self = this;
		this.db = dbClient.getDB(FLEETALERT_DB_NAME, this._getDesignDoc());
		Q.when(this.getAlerts([], false, 200), function(docs){
			(docs.alerts||[]).forEach(function(alert){
				self._cacheAlert(alert);
			});
		});

		// Low Fuel
		this.registerAlertRule("low_fuel", {
			fireRule: function(probe, vehicle){
				var alerts = [];
				if(vehicle && vehicle.vehicleInfo && vehicle.vehicleInfo.properties && vehicle.vehicleInfo.properties.fuelTank
				&& vehicle.prevProbe && vehicle.prevProbe.props && vehicle.prevProbe.props.fuel
				&& probe && probe.props && probe.props.fuel){
					var fuelTank = vehicle.vehicleInfo.properties.fuelTank;
					var prevFuel = vehicle.prevProbe.props.fuel;
					var fuel = probe.props.fuel;
					if(prevFuel/fuelTank >= 0.1 && fuel/fuelTank < 0.1){
						var alert = {
								source: {type: "script", id: "low_fuel"},
								type: "low_fuel",
								description: "Fuel at 1/10 tank",
								severity: "High",
								mo_id: probe.mo_id,
								ts: probe.ts,
								latitude: probe.matched_latitude || probe.latitude,
								longitude: probe.matched_longitude || probe.longitude,
								simulated: VEHICLE_VENDOR_IBM === vehicle.vehicleInfo.vendor
							};
						alerts.push(alert);
					}
				}
				return alerts;
			},
			closeRule: function(alert, probe, vehicle){
				if(vehicle && vehicle.vehicleInfo && vehicle.vehicleInfo.properties && vehicle.vehicleInfo.properties.fuelTank
				&& probe && probe.props && probe.props.fuel){
					var fuelTank = vehicle.vehicleInfo.properties.fuelTank;
					var fuel = probe.props.fuel;
					if(fuel/fuelTank >= 0.1){
						alert.closed_ts = probe.ts;
						return alert;
					}
				}
			}
		});

		// Half Fuel
		this.registerAlertRule("half_fuel", {
			fireRule: function(probe, vehicle){
				var alerts = [];
				if(vehicle && vehicle.vehicleInfo && vehicle.vehicleInfo.properties && vehicle.vehicleInfo.properties.fuelTank
				&& vehicle.prevProbe && vehicle.prevProbe.props && vehicle.prevProbe.props.fuel
				&& probe && probe.props && probe.props.fuel){
					var fuelTank = vehicle.vehicleInfo.properties.fuelTank;
					var prevFuel = vehicle.prevProbe.props.fuel;
					var fuel = probe.props.fuel;
					if(prevFuel/fuelTank >= 0.5 && fuel/fuelTank < 0.5){
						var alert = {
								source: {type: "script", id: "half_fuel"},
								type: "half_fuel",
								description: "Fuel at half full",
								severity: "Medium",
								mo_id: probe.mo_id,
								ts: probe.ts,
								latitude: probe.matched_latitude || probe.latitude,
								longitude: probe.matched_longitude || probe.longitude,
								simulated: VEHICLE_VENDOR_IBM === vehicle.vehicleInfo.vendor
							};
						alerts.push(alert);
					}
				}
				return alerts;
			},
			closeRule: function(alert, probe, vehicle){
				if(vehicle && vehicle.vehicleInfo && vehicle.vehicleInfo.properties && vehicle.vehicleInfo.properties.fuelTank
				&& vehicle.prevProbe && vehicle.prevProbe.props && vehicle.prevProbe.props.fuel
				&& probe && probe.props && probe.props.fuel){
					var fuelTank = vehicle.vehicleInfo.properties.fuelTank;
					var fuel = probe.props.fuel;
					if(fuel/fuelTank >= 0.5){
						alert.closed_ts = probe.ts;
						return alert;
					}
				}
			}
		});

		// High Engine Temperature
		this.registerAlertRule("high_engine_temp", {
			fireRule: function(probe, vehicle){
				var alerts = [];
				if(vehicle && vehicle.prevProbe && vehicle.prevProbe.props && vehicle.prevProbe.props.engineTemp <= 120
				&& probe && probe.props && probe.props.engineTemp > 120){
					var alert = {
							source: {type: "script", id: "high_engine_temp"},
							type: "high_engine_temp",
							description: "Engine temperature is too high.",
							severity: "High",
							mo_id: probe.mo_id,
							ts: probe.ts,
							latitude: probe.matched_latitude || probe.latitude,
							longitude: probe.matched_longitude || probe.longitude,
							simulated: VEHICLE_VENDOR_IBM === vehicle.vehicleInfo.vendor
						};
					alerts.push(alert);
				}
				return alerts;
			},
			closeRule: function(alert, probe, vehicle){
				if(vehicle && probe && probe.props && probe.props.engineTemp <= 120){
					alert.closed_ts = probe.ts;
					return alert;
				}
			}
		});
	},
	_searchAlertIndex: function(opts){
		return Q(this.db).then(function(db){
			var deferred = Q.defer();
			db.search(FLEETALERT_DB_NAME, 'alerts', opts, function(err, result){
				if (err)
					return deferred.reject(err);
				return deferred.resolve(result);
			});
			return deferred.promise;
		});
	},
	_getDesignDoc: function(){
		var fleetAlertIndexer = function(doc){
			if(doc.ts && doc.mo_id && doc.type && doc.severity){
				index("ts", doc.ts, {store: true});
				index("mo_id", doc.mo_id, {store: true});
				index("type", doc.type, {store: true});
				index("severity", doc.severity, {store: true});
				index("closed_ts", doc.closed_ts||-1, {store: true});
				index("simulated", doc.simulated, {store: true});

				index("description", doc.description||"", {store: true});
				index("latitude", doc.latitude, {store: true});
				index("longitude", doc.longitude, {store: true});
			}
		};
		var designDoc = {
				_id: '_design/' + FLEETALERT_DB_NAME,
				indexes: {
					alerts: {
						analyzer: {name: 'keyword'},
						index: fleetAlertIndexer.toString()
					}
				}
		};
		return designDoc;
	},

	evaluateAlertRule: function(probe){
		var self = this;
		var vehicle = this._vehicles[probe.mo_id];
		var promise;
		Q.when(this._getVehicle(probe.mo_id), function(vehicle){
			self._evaluateAlertRule(probe, _.clone(vehicle));
			vehicle.prevProbe = probe;
		});
	},
	_evaluateAlertRule: function(probe, vehicle){
		var self = this;
		_.values(this.alertRules).forEach(function(rule){
			setImmediate(function(){
				var alerts = rule.fireRule(probe, vehicle);
				alerts.forEach(function(alert){
					self.addAlert(alert);
				});
			});
		});
		var _alerts = _.clone(this.alerts);
		var _alertsForVehicle = _alerts[probe.mo_id] || {};
		Object.keys(_alertsForVehicle).forEach(function(key){
			var alert = _alertsForVehicle[key];
			if(alert && alert.source && alert.source.type === "script"){
				setImmediate(function(){
					var rule = self.alertRules[alert.type];
					var deferred = null;
					if(rule){
						var closedAlert = rule.closeRule(alert, probe, vehicle);
						if(closedAlert){
							deferred = self.updateAlert(closedAlert);
						}
					}else{
						alert.closed_ts = probe.ts;
						deferred = self.updateAlert(alert);
					}
					if(deferred){
						Q.when(deferred, function(result){
							if(result && result.ok){
								delete self.alerts[probe.mo_id][key];
								debug("An alert is closed: " + JSON.stringify(alert));
							}
						}, function(error){
							console.error(error);
						});
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
			Q.when(driverInsightsAsset.getVehicle(mo_id), function(vehicleInfo){
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
			if(!self.alerts[mo_id]){
				self.alerts[mo_id] = {};
			}
			var props = event.props || {}; // A message should have props
			var event_id = String(event.event_id || props.message_type);
			var sourceType = "";
			if(event.event_id){
				sourceType = "event";
			}else if(props.message_type){
				sourceType = "message";
			}
			if(!event_id){
				return;
			}
			var alert = self.alerts[mo_id][event_id];
			if(alert){
				// Do nothing during same id/type of events/messages are coming consecutively
			}else{
				Q.when(self._getVehicle(mo_id), function(vehicle){
					alert = {
							source: {type: sourceType, id: event_id},
							type: event.event_type || props.message_type,
							description: event.event_name || event.message,
							severity: props.severity || "Info",
							mo_id: mo_id,
							ts: ts,
							latitude: event.s_latitude || event.latitude,
							longitude: event.s_longitude || event.longitude,
							simulated: VEHICLE_VENDOR_IBM === vehicle.vehicleInfo.vendor
						};
					self.addAlert(alert);
				});
			}
		});
	},
	closeAlertFromEvents: function(mo_id, events){
		var self = this;
		var closed_ts = moment().valueOf();
		var _alerts = _.clone(this.alerts || {});
		var _alertsForVehicle = _alerts[mo_id] || {};
		Object.keys(_alertsForVehicle).forEach(function(key){
			var sourceType = _alertsForVehicle[key].source && _alertsForVehicle[key].source.type;
			if(sourceType !== "event" && sourceType !== "message"){
				return;
			}
			if((events || []).every(function(event){
				// No related event/message is included in events
				var props = event.props || {}; // A message should have props
				var event_id = event.event_id || props.message_type;
				return !event_id || key !== String(event_id);
			})){
				var alert = _alertsForVehicle[key];
				alert.closed_ts = closed_ts;
				Q.when(self.updateAlert(alert), function(result){
					if(result && result.ok){
						delete self.alerts[mo_id][key];
						debug("An alert for event/message is closed: " + JSON.stringify(alert));
					}
				}, function(error){
					console.error(error);
				});
			}
		});
	},

	getAlertsForVehicleInArea: function(conditions, area, includeClosed, limit){
		if(!area){
			return Q.reject();
		}
		var deferred = Q.defer();
		var self = this;
		Q.when(driverInsightsProbe.getCarProbe(area), function(probes){
			if(probes.length > 0){
				var mo_id_condition = "(" + probes.map(function(probe){
					return "mo_id:"+probe.mo_id;
				}).join(" OR ") + ")";
				conditions.push(mo_id_condition);
				Q.when(self.getAlerts(conditions, includeClosed, limit), function(result){
					deferred.resolve(result);
				});
			}else{
				deferred.resolve({alerts: []});
			}
		});
		return deferred.promise;
	},
	getAlerts: function(conditions, includeClosed, limit){
		var opt = {sort: "-ts", include_docs:true};
		if(conditions.length > 0){
			_.extend(opt, {q: conditions.join(" AND "), limit: (limit || 10)});
			if(!includeClosed){
				opt.q += " AND closed_ts:\\-1";
			}
		}else{
			_.extend(opt, {q: includeClosed ? "*:*" : "closed_ts:\\-1"});
			if(limit){
				_.extend(opt, {limit: limit});
			}
		}
		return this._searchAlertIndex(opt)
			.then(function(result){
				return {alerts: result.rows.map(function(row){return _.extend(row.doc, row.fields);})};
			});
	},

	_cacheAlert: function(alert){
		var alertsForVehicle = this.alerts[alert.mo_id];
		if(!alertsForVehicle){
			alertsForVehicle = this.alerts[alert.mo_id] = {};
		}
		var existingAlert = alertsForVehicle[alert.source && alert.source.id];
		if(!existingAlert){
			alertsForVehicle[alert.source && alert.source.id] = alert;
		}
	},
	addAlert: function(alert){
		var alertsForVehicle = this.alertsToInsert[alert.mo_id];
		if(!alertsForVehicle){
			alertsForVehicle = this.alertsToInsert[alert.mo_id] = {};
		}
		var alertToInsert = alertsForVehicle[alert.source && alert.source.id];
		if(!alertToInsert){
			alertsForVehicle[alert.source && alert.source.id] = alert;
		}
		this._bulkInsert();
	},
	updateAlert: function(alert){
		if(!alert._id || !alert._rev){
			return Q.reject({message: "_id and _rev are required to update alert: " + JSON.stringify(alert)});
		}
		var deferred = Q.defer();
		Q.when(this.db, function(db){
			db.insert(alert, null, function(error, result){
				if(error){
					deferred.reject(error);
					console.error("Update an alert failed: " + JSON.stringify(error));
				}else{
					deferred.resolve(result);
				}
			});
		});
		return deferred.promise;
	},
	_bulkInsert: function(){
		if(!this.insertTimeout){
			var self = this;
			this.insertTimeout = setTimeout(function(){
				Q.when(self.db, function(db){
					var docs = [];
					Object.keys(self.alertsToInsert).forEach(function(mo_id){
						Object.keys(self.alertsToInsert[mo_id]).forEach(function(sourceId){
							docs.push(self.alertsToInsert[mo_id][sourceId]);
						});
					});
					if(docs.length > 0){
						db.bulk({docs: docs}, "insert", function(err, body){
							if(err){
								console.error("inserting alerts failed");
								self.insertTimeout = null;
							}else{
								debug("inserting alerts succeeded");
								self.alertsToInsert = {};
								self.insertTimeout = null;
								body.forEach(function(inserted, index){
									if(inserted.error){
										self.addAlert(docs[index]);
									}else{
										var alert = docs[index];
										alert._id = inserted.id;
										alert._rev = inserted.rev;
										self._cacheAlert(alert);
									}
								});
							}
						});
					}
				});
			}, BULK_INSERT_INTERVAL);
		}
	},
	deleteAlert: function(alertId){
		if(!alertId){
			return Q.reject({message: "alertId is required to delete alert."});
		}
		var deferred = Q.defer();
		//TODO
		return deferred.promise;
	},

	registerAlertRule: function(/*string*/name, /*function*/rule){
		this.alertRules[name] = rule;
	}
});

driverInsightsAlert._init();