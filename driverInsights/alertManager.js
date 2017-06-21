/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var alertManager = module.exports = {};

var _ = require("underscore");
var Q = require("q");
var moment = require("moment");
var dbClient = require('./../cloudantHelper.js');
var iot4aVehicleDataHub = app_module_require('iot4a-api/vehicleDataHub.js');

var debug = require('debug')('alertmanager');
debug.log = console.log.bind(console);

var FLEETALERT_DB_NAME = "fleet_alert";
var VEHICLE_VENDOR_IBM = "IBM";
var BULK_INSERT_INTERVAL = Number(process.env.BULK_INSERT_INTERVAL || 1000);

_.extend(alertManager, {
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
	currentAlerts: {},

	/*
	 * Accumulate alerts to insert(create/close) and insert by bulk
	 */
	alertsToInsert: {},
	insertTimeout: null,
	db: null,

	_init: function(){
		var self = this;
		this.db = dbClient.getDB(FLEETALERT_DB_NAME, this._getDesignDoc());
		this.getAlerts([], false, 200); // Get and cache all alerts
	},

	_searchAlertIndex: function(opts){
		debug("_searchAlertIndex: " + opts.q);
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

	getAlertsForVehicleInArea: function(conditions, area, includeClosed, limit){
		if(!area){
			return Q.reject();
		}
		var self = this;
		var deferred = Q.defer();
		Q.when(iot4aVehicleDataHub.getCarProbe(area), function(probes){
			if(probes.length > 0){
				var mo_ids = probes.map(function(probe){return probe.mo_id;});
				self.getAlertsForVehicles(mo_ids, includeClosed, limit).then(function(results){
					deferred.resolve(results);
				});
			}else{
				deferred.resolve({alerts: []});
			}
		});
		return deferred.promise;
	},
	getAlertsForVehicles: function(mo_ids, includeClosed, limit){
		var self = this;
		var _getAlerts100 = function(mo_ids){
			var mo_id_condition = "(" + mo_ids.map(function(mo_id){
				return "mo_id:\""+mo_id+"\"";
			}).join(" OR ") + ")";
			return self.getAlerts([mo_id_condition], includeClosed, limit);
		};
		var results = [];
		for(var i=0; i<mo_ids.length/100; i++){
			results.push(_getAlerts100(mo_ids.slice(i*100, (i+1)*100)));
		}
		return Q.allSettled(results).then(function(fulfilled){
			var alerts = [];
			fulfilled.forEach(function(f){
				if(f.value && f.value.alerts){
					alerts = alerts.concat(f.value.alerts);
				}
			});
			return {alerts: alerts};
		});
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
		var self = this;
		return this._searchAlertIndex(opt)
			.then(function(result){
				var alerts = (result.rows||[]).map(function(row){return _.extend(row.doc, row.fields);});
				setImmediate(function(){
					alerts.forEach(function(alert){self._cacheAlert(alert);});
				});
				if(result.total_rows > (limit||10)){
					console[limit === 200 ? "error" : "warn"]("getAlerts: Alerts retrieved by the conditions are existing more than limit. limit=" + limit + ", total=" + result.total_rows);
				}
				return {alerts: alerts};
			});
	},

	getCurrentAlerts: function(mo_id, source_id){
		if(mo_id){
			var alertsForVehicle = this.currentAlerts[mo_id];
			if(!alertsForVehicle){
				alertsForVehicle = this.currentAlerts[mo_id] = {};
			}
			if(source_id){
				return alertsForVehicle[source_id];
			}
			return alertsForVehicle;
		}
		return this.currentAlerts;
	},
	_cacheAlert: function(alert){
		if(alert.closed_ts > 0){
			return;
		}
		var alertsForVehicle = this.currentAlerts[alert.mo_id];
		if(!alertsForVehicle){
			alertsForVehicle = this.currentAlerts[alert.mo_id] = {};
		}
		var existingAlert = alertsForVehicle[alert.source && alert.source.id];
		if(!existingAlert){
			alertsForVehicle[alert.source && alert.source.id] = alert;
		}else if(existingAlert._id !== alert._id){
			console.warn("[WARNING] _cacheAlert(Duplicate alert): Close older alert and cache newer alert.");
			console.warn("[WARNING] mo_id: " + alert.mo_id + ", source.type: " + alert.source.type + ", source.id: " + alert.source.id);
			console.warn("[WARNING] alert1._id: " + (existingAlert._id||"-") + ", alert2._id: " + (alert._id||"-"));
			if(existingAlert.ts > alert.ts){
				alert.closed_ts = moment().valueOf();
				this.updateAlert(alert);
			}else{
				alertsForVehicle[alert.source && alert.source.id] = alert;
				existingAlert.closed_ts = moment().valueOf();
				this.updateAlert(existingAlert);
			}
		}
	},
	addAlert: function(alert){
		var alertsForVehicle = this.alertsToInsert[alert.mo_id];
		if(!alertsForVehicle){
			alertsForVehicle = this.alertsToInsert[alert.mo_id] = {};
		}
		var alertToInsert = alertsForVehicle[alert.source && alert.source.id];
		if(!alertToInsert){
			debug("addAlert: " + JSON.stringify(alert));
			alertsForVehicle[alert.source && alert.source.id] = alert;
		}
		this._bulkInsert();
	},
	updateAlert: function(alert){
		if(!alert._id || !alert._rev){
			console.error({message: "_id and _rev are required to update alert: " + JSON.stringify(alert)});
		}
		var alertsForVehicle = this.alertsToInsert[alert.mo_id];
		if(!alertsForVehicle){
			alertsForVehicle = this.alertsToInsert[alert.mo_id] = {};
		}
		var alertToInsert = alertsForVehicle[alert.source && alert.source.id];
		if(alertToInsert){
			if(alertToInsert._id){
				if(alertToInsert._id === alert._id){
					// Duplicate inserts for the same cloudant document. Update for later revision and discard older revision
					if(Number(alertToInsert._rev.split("-")[0]) < Number(alert._rev.split("-"[0]))){
						console.warn("[WARNING] updateAlert(Duplicate inserts for the same cloudant document): " + JSON.stringify(alert));
						alertsForVehicle[alert.source && alert.source.id] = alert;
					}
				}else{
					// Duplicate documents for the same mo_id and source id. Close as invalid alert
					if(alertToInsert.closed_ts < 0 && alert.closed_ts < 0){
						console.warn("[WARNING] updateAlert(Duplicate open alerts for the same mo_id and source.id): Close and mark older alert as invalid. ");
						this.alertsToInsert["invalid"] = this.alertsToInsert["invalid"] || {};
						if(alertToInsert.ts > alert.ts){
							alert.closed_ts = alert.ts;
							this.alertsToInsert["invalid"][alert._id] = alert;
						}else{
							alertToInsert.closed_ts = alertToInsert.ts;
							alertsForVehicle[alert.source && alert.source.id] = alert; // Update as valid alert
							this.alertsToInsert["invalid"][alertToInsert._id] = alertToInsert;
						}
					}else{
						if(alert.closed_ts >= 0){
							this.alertsToInsert["invalid"] = this.alertsToInsert["invalid"] || {};
							this.alertsToInsert["invalid"][alert._id] = alert;
						}
						// alertToInsert doesn't need to add in the update queue (this.alertsToInsert) because it has already been in the queue
					}
				}
			}else{
				// The alert has already inserted. This must be invalid state.
				console.warn("updateAlert: " + JSON.stringify(alert));
				alertsForVehicle[alert.source && alert.source.id] = alert;
			}
		}else{
			debug("updateAlert: " + JSON.stringify(alert));
			alertsForVehicle[alert.source && alert.source.id] = alert;
		}
		this._bulkInsert();
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
										if(alert.closed_ts){
											delete self.currentAlerts[alert.mo_id][alert.source && alert.source.id];
											if(self.currentAlerts[alert.mo_id].length <= 0){
												delete self.currentAlerts[alert.mo_id];
											}
										}else{
											self._cacheAlert(alert);
										}
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
	}
});

alertManager._init();