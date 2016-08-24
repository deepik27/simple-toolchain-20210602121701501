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

var debug = require('debug')('alert');
debug.log = console.log.bind(console);

var FLEETALERT_DB_NAME = "fleet_alert";

_.extend(driverInsightsAlert, {
	/*
	 * {mo_id: {
	 * 	vehicleInfo: {status: "Active", properties: {fuelTank: 60}},
	 * 	prevProbe: {timestamp: "2016-08-01T12:34:56+09:00", ...., props: {fuel: 49.1, engineTemp: 298.2}}
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
	alerts: [],
	db: null,
	_init: function(){
		var self = this;
		this.db = dbClient.getDB(FLEETALERT_DB_NAME, this._getDesignDoc());

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
						alerts.push({
							type: "low_fuel",
							description: "Fuel at 1/10 tank",
							severity: "High",
							mo_id: probe.mo_id,
							ts: probe.ts,
							timestamp: probe.timestamp
						});
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
						alerts.push({
							type: "half_fuel",
							description: "Fuel at half full",
							severity: "Medium",
							mo_id: probe.mo_id,
							ts: probe.ts,
							timestamp: probe.timestamp
						});
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
				if(vehicle && vehicle.prevProbe && vehicle.prevProbe.props && vehicle.prevProbe.props.engineTemp <= 300
				&& probe && probe.props && probe.props.engineTemp > 300){
					alerts.push({
						type: "high_engine_temp",
						description: "Engine temperature is too high.",
						severity: "High",
						mo_id: probe.mo_id,
						ts: probe.ts,
						timestamp: probe.timestamp
					});
				}
				return alerts;
			},
			closeRule: function(alert, probe, vehicle){
				if(vehicle && probe && probe.props && probe.props.engineTemp <= 300){
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
			if(doc.timestamp && doc.mo_id && doc.type && doc.severity){
				index("ts", doc.ts, {store:true});
				index("timestamp", doc.timestamp, {store: true});
				index("mo_id", doc.mo_id, {store: true});
				index("type", doc.type, {store: true});
				index("severity", doc.severity, {store: true});
				index("description", doc.description, {store: true});
				index("closed_ts", doc.closed_ts||-1, {store: true});
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
		if(!vehicle){
			Q.when(driverInsightsAsset.getVehicle(probe.mo_id), function(vehicleInfo){
				self._vehicles[probe.mo_id] = vehicle = {
					vehicleInfo: vehicleInfo
				};
				self._evaluateAlertRule(probe, _.clone(vehicle));
				vehicle.prevProbe = probe;
			});
		}else{
			this._evaluateAlertRule(probe, _.clone(vehicle));
			vehicle.prevProbe = probe;
		}
	},
	_evaluateAlertRule: function(probe, vehicle){
		var self = this;
		_.values(this.alertRules).forEach(function(rule){
			setImmediate(function(){
				var alerts = rule.fireRule(probe, vehicle);
				alerts.forEach(function(alert){
					Q.when(self.addAlert(alert), function(result){
						if(result && result.ok){
							alert._id = result.id;
							alert._rev = result.rev;
						}
					});
				});
			});
		});
		var _alerts = _.clone(this.alerts);
		_alerts.forEach(function(alert, index){
			if(alert.mo_id === probe.mo_id){
				setImmediate(function(){
					var rule = self.alertRules[alert.type];
					var deferred = null;
					if(rule){
						var closedAlert = rule.closeRule(alert, probe, vehicle);
						if(closedAlert){
							deferred = self.updateAlert(closedAlert);
						}
					}else{
						deferred = self.updateAlert(alert);
					}
					if(deferred){
						Q.when(deferred, function(result){
							if(result && result.ok){
								self.alerts.splice(index, 1);
							}
						});
					}
				});
			}
		});
	},
	addAlertFromEvent: function(event){
		//TODO
	},

	getAllAlert: function(includeClosed, limit){
		var opt = {q: "*:*", sort: "-ts"};
		if(!includeClosed){
			opt.q = "closed_ts:\\-1";
		}
		if(limit){
			_.mixin(opt, {limit: limit});
		}
		return this._searchAlertIndex(opt)
			.then(function(result){
				return {alerts: result.rows.map(function(row){return row.fields;})};
			});
	},
	getAlertByType: function(type, includeClosed, limit){
		var opt = {q: "type:"+type, sort: "-ts", limit: (limit||10)};
		if(!includeClosed){
			opt.q += " AND closed_ts:\\-1";
		}
		return this._searchAlertIndex(opt)
			.then(function(result){
				return {alerts: result.rows.map(function(row){return row.fields;})};
			});
	},
	getAlertBySeverity: function(severity, includeClosed, limit){
		var opt = {q: "severity:"+severity, sort: "-ts", limit: (limit||10)};
		if(!includeClosed){
			opt.q += " AND closed_ts:\\-1";
		}
		return this._searchAlertIndex(opt)
			.then(function(result){
				return {alerts: result.rows.map(function(row){return row.fields;})};
			});
	},
	getAlertByVehicle: function(mo_id, includeClosed, limit){
		var opt = {q: "mo_id:"+mo_id, sort: "-ts", limit: (limit||10)};
		if(!includeClosed){
			opt.q += " AND closed_ts:\\-1";
		}
		return this._searchAlertIndex(opt)
			.then(function(result){
				return {alerts: result.rows.map(function(row){return row.fields;})};
			});
	},

	addAlert: function(alert){
		this.alerts.push(alert);
		var deferred = Q.defer();
		Q.when(this.db, function(db){
			db.insert(alert, null, function(error, result){
				if(error){
					deferred.reject(error);
				}else{
					deferred.resolve(result);
				}
			});
		});
		return deferred.promise;
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
				}else{
					deferred.resolve(result);
				}
			});
		});
		return deferred.promise;
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