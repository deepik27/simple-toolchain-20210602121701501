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
var driverInsightsGeofence = module.exports = {};

var _ = require("underscore");
var Q = new require('q');
var moment = require("moment");

var dbClient = require('./../cloudantHelper.js');
var driverInsightsAsset = require('./asset.js');
var ruleGenerator = require('./ruleGenerator.js');

var debug = require('debug')('geofence');
debug.log = console.log.bind(console);

var DB_NAME = "geofence";

/*
 * geofence json
 * {
		direction: "in", "out" or "both", "out" by default
 * 		geometry_type: "rectangle" or "circle", "rectangle" by default
 * 		geometry: {
 * 			,
 * : start latitude of geo fence, valid when geometry_type is rectangle
 * 			min_longitude: start logitude of geo fence, valid when geometry_type is rectangle 
 * 			max_latitude:  end latitude of geo fence, valid when geometry_type is rectangle
 * 			max_longitude:  start logitude of geo fence, valid when geometry_type is rectangle
 * 			latitude: center latitude of geo fence, valid when geometry_type is circle
 * 			longitude: center logitude of geo fence, valid when geometry_type is circle 
 * 			radius: radius of geo fence, valid when geometry_type is circle 
 * 		}, 
 * 		actions: [{
 * 			message: message string returned when rule is applied
 * 			parameters: [{
 * 				key: key string for this parameter
 * 				value: value string for this parameter
 * 			},...]
 * 		},...]
 * }
 */
_.extend(driverInsightsGeofence, {
	db: null,

	_init: function(){
		this.db = dbClient.getDB(DB_NAME, this._getDesignDoc());
	},

	queryGeofence: function(min_latitude, min_longitude, max_latitude, max_longitude) {
		var deferred = Q.defer();
		Q.when(this._queryGeofenceDoc(min_longitude, min_latitude, max_longitude, max_latitude), function(response) {
			deferred.resolve(response);
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},

	getGeofence: function(geofence_id) {
		var deferred = Q.defer();
		Q.when(this._getGeofenceDoc(geofence_id), function(response) {
			deferred.resolve(response.geofence);
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	
	createGeofence: function(geofence) {
		var promises = [];
		if (geofence.direction === "both") {
			// Create two rules. One for "in", another for "out"
			var rule = {description: "geofence rule", type: "Action", status: "active"};

			geofence.direction = "in";
			var ruleInXML = this._createGeofenceRuleXML(geofence);
			promises.push(this._createGeofenceRule(rule, ruleInXML, "in"));

			geofence.direction = "out";
			var ruleOutXML = this._createGeofenceRuleXML(geofence);
			promises.push(this._createGeofenceRule(rule, ruleOutXML, "out"));
			geofence.direction = "both";
		} else {
			var rule = {description: "geofence rule", type: "Action", status: "active"};
			var ruleXML = this._createGeofenceRuleXML(geofence);
			promises.push(this._createGeofenceRule(rule, ruleXML, geofence.direction||"out"));
		}
		
		var self = this;
		var deferred = Q.defer();
		Q.all(promises).then(function(ids) {
			var rules = {};
			_.each(ids, function(value, key) {
				rules[value.direction] = value.id;
			});
			Q.when(self._createDoc(null, {geofence: geofence, rules: rules}), function(result) {
				deferred.resolve({id: result.id});
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		})["catch"](function(err){
			deferred.reject(err);
		});
		return deferred.promise;
	},
	
	_createGeofenceRule: function(rule, ruleXML, direction) {
		var deferred = Q.defer();
		Q.when(driverInsightsAsset.addRule(rule, ruleXML), function(response) {
			deferred.resolve({direction: direction, id: response.id});
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	
	updateGeofence: function(geofence_id, geofence) {
		var self = this;
		var deferred = Q.defer();
		Q.when(this._getGeofenceDoc(geofence_id), function(doc) {
			var addDir = null;
			var removeDir = null;
			var updateDir = null;
			var rules = doc.rules;
			if (geofence.direction !== doc.geofence.direction) {
				if (geofence.direction === "both") {
					// When direction is changed to both, rule for new direction must be created
					if (doc.geofence.direction === "in") {
						addDir = "out";
					} else if (doc.geofence.direction === "out") {
						addDir = "in";
					}
				} else if (doc.geofence.direction === "both") {
					// When direction is changed from both, unnecessary rule must be removed
					if (geofence.direction === "in") {
						removeDir = "out";
					} else if (geofence.direction === "out") {
						removeDir = "in";
					}
				} else {
					// Switch direction
					rules[geofence.direction] = rules[doc.geofence.direction];
					delete rules[doc.geofence.direction];
				}
			}

			var dir = geofence.direction;
			
			// add rule for new direction
			var rule = {description: "geofence rule", type: "Action", status: "active"};
			var promises = [];
			if (addDir) {
				geofence.direction = addDir;
				var ruleXML = self._createGeofenceRuleXML(geofence);
				promises.push(self._createGeofenceRule(rule, ruleXML, addDir));
			}
			
			// remove rule for unnecessary direction
			if (removeDir) {
				var removeId = rules[removeDir];
				delete rules[removeDir];
				promises.push(self._deleteGeofenceRule(removeId, true));
			}

			// update existing rules
			_.each(doc.rules, function(value, key) {
				geofence.direction = key;
				var ruleXML = self._createGeofenceRuleXML(geofence);
				promises.push(driverInsightsAsset.updateRule(value, rule, ruleXML, true));
			});

			geofence.direction = dir;
			Q.all(promises).then(function(result) {
				_.each(result, function(r) {
					if (r && r.direction && r.id) {
						rules[direction] = r.id;
					}
				});
				Q.when(self._updateDoc(geofence_id, {geofence: geofence, rules: rules}), function() {
					deferred.resolve({id: geofence_id});
				})["catch"](function(err){
					deferred.reject(err);
				}).done();
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	
	_deleteGeofenceRule: function(rule_id, successOnNoExists) {
		var deferred = Q.defer();
		var rule = {description: "removing", type: "Action", status: "inactive"};
		Q.when(driverInsightsAsset.updateRule(rule_id, rule, "", false), function(response) {
			Q.when(driverInsightsAsset.deleteRule(rule_id), function(response) {
				deferred.resolve({id: rule_id});
			})["catch"](function(err){
				if (err.statusCode === 404 && successOnNoExists) {
					deferred.resolve();
				} else {
					deferred.reject(err);
				}
			}).done();
		})["catch"](function(err){
			if (err.statusCode === 404 && successOnNoExists) {
				deferred.resolve();
			} else {
				deferred.reject(err);
			}
		}).done();
		return deferred.promise;
	},
	
	deleteGeofence: function(geofence_id) {
		var self = this;
		var deferred = Q.defer();
		Q.when(this._getGeofenceDoc(geofence_id), function(doc) {
			var promises = [];
			if (doc && doc.rules) {
				_.each(doc.rules, function(value, key) {
					promises.push(self._deleteGeofenceRule(value, true));
				});
			}
			promises.push(self._deleteDoc(geofence_id));
			
			Q.all(promises).then(function(result) {
				deferred.resolve({id: geofence_id});
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		})["catch"](function(err){
			deferred.reject(err);
		}).done();

		return deferred.promise;
	},
	
	_createGeofenceRuleXML: function(geofenceJson) {
		if (!geofenceJson) {
			return "";
		}
		
		var ruleJson = {
			rule_id: 5000,
			rule_type: 1,
			name: "Geofence Rule",
			description: "Geofence rule created by iota starter app rule engine.",
			condition: {
				pattern: "goefence"
			},
			actions: []
		};
		
		var range = geofenceJson.direction || "out";
		if (geofenceJson.geometry_type === "circle") {
			ruleJson.condition.location_condition = {
				range: range,
				latitude: geofenceJson.geometry.latitude,
				longitude: geofenceJson.geometry.longitude,
				radius: geofenceJson.geometry.radius
			}
		} else {
			ruleJson.condition.location_condition = {
				range: range,
				start_latitude: geofenceJson.geometry.min_latitude,
				start_longitude: geofenceJson.geometry.min_longitude,
				end_latitude: geofenceJson.geometry.max_latitude,
				end_longitude: geofenceJson.geometry.max_longitude
			}
		}
		
		ruleJson.actions = geofenceJson.actions
						|| {vehicle_actions: [{
							message: "iota-starter-geofence:" + range,
							parameters: [{
								key: "Speed",
								value: "CarProbe.Speed"
							},{
								key: "Longitude",
								value: "CarProbe.Longitude"
							},{
								key: "Latitude",
								value: "CarProbe.Latitude"
							}]
						}]};
		return ruleGenerator.createVehicleAcitonRuleXML(ruleJson);
	},
	
	_queryGeofenceDoc: function(min_latitude, min_longitude, max_latitude, max_longitude) {
		var deferred = Q.defer();
		if (isNaN(min_longitude) && isNaN(min_latitude) && isNaN(max_longitude) && isNaN(max_latitude)) {
			Q.when(this.db, function(db) {
				db.view(DB_NAME, "allGeofenceLocation", {}, function(err, body){
					if (err) {
						console.error(err);
						return deferred.reject(err);
					} else {
						var result = _.map(body.rows, function(value) {
							var doc = value.value;
							doc.id = value.id;
							delete doc._id;
							delete doc._rev;
							return doc;
						});						
						deferred.resolve(result);
					}
				});
			});
		} else if (!isNaN(min_longitude) && !isNaN(min_latitude) && !isNaN(max_longitude) && !isNaN(max_latitude)) {
			Q.when(this.db, function(db) {
				var  bbox = min_latitude + "," + min_longitude + "," + max_latitude + "," + max_longitude;
				db.geo(DB_NAME, "geoindex", {bbox:bbox, include_docs:true}, function(err, body) {
					if (err) {
						console.error(err);
						return deferred.reject(err);
					} else {
						var result = _.map(body.rows, function(value) {
							var doc = value.doc;
							doc.id = value.id;
							delete doc._id;
							delete doc._rev;
							return doc;
						});						
						deferred.resolve(result);
					}
				});
			});
		} else {
			deferred.reject({statusCode: 400, message: "missing parameter: min_latitude, min_longitude, max_latitude and max_longitude are specified."});
		}
		return deferred.promise;
	},
	
	_getGeofenceDoc: function(geofence_id) {
		var deferred = Q.defer();
		Q.when(this.db, function(db) {
			db.find({selector:{_id:geofence_id}}, function(err, body) {
				if (err) {
					console.error(err);
					return deferred.reject(err);
				} else {
					deferred.resolve(body.docs && body.docs.length > 0?body.docs[0] : null);
				}
			});
		});
		return deferred.promise;
	},
	
	_createDoc: function(id, doc) {
		var deferred = Q.defer();
		Q.when(this.db, function(db) {
			db.insert(doc, id, function(err, body) {
				if (err) {
					console.error(err);
					return deferred.reject(err);
				} else {
					deferred.resolve(body);
				}
			});
		});
		return deferred.promise;
	},
	
	_updateDoc: function(id, doc) {
		var deferred = Q.defer();

		// get the current document for the device
		Q.when(this.db, function(db) {
			db.get(id, null, function(err, body) {
				if (err) {
					console.error(err);
					deferred.reject(err);
					return;
				}
				
				_.extend(body, doc);
				db.insert(body, null, function(err, body) {
					if (err) {
						console.error(err);
						deferred.reject(err);
					} else {
						deferred.resolve(body);
					}
				});
			});
		});
		return deferred.promise;
	},
	
	_deleteDoc: function(geofence_id, successOnNoExists) {
		var deferred = Q.defer();
		Q.when(this.db, function(db) {
			db.get(geofence_id, null, function(err, body) {
				if (err) {
					if (err.statusCode === 404 && successOnNoExists) {
						deferred.resolve(err);
					} else {
						console.error(err);
						deferred.reject(err);
					}
					return;
				}
				
				db.destroy(body._id, body._rev, function(err, data) {
					if (err) {
						console.error(err);
						deferred.reject(err);
					} else {
						deferred.resolve(data);
					}
				});
			});
		});
		return deferred.promise;
	},
	
	_getDesignDoc: function(){
		var allGeofenceLocation = function(doc) {
			if (doc.geofence && doc.geofence.geometry) {
				emit(doc._id, doc.geofence);
			}
		};
		var geofenceRuleMap = function(doc) {
			if (doc.geofence && doc.rules) {
				emit(doc._id, doc.rules);
			}
		};
		var geofenceIndexer = function(doc){
			if (doc.geofence && doc.geofence.geometry) {
				var geofence = doc.geofence.geometry;
				var geometry = {type: "Polygon", coordinates: []};
				if (doc.geofence.geometry_type === "circle") {
					geometry.coordinates.push([
						    [[parseFloat(geofence.longitude) - parseFloat(geofence.radius), parseFloat(geofence.latitude) - parseFloat(geofence.radius)]],
						    [[parseFloat(geofence.longitude) + parseFloat(geofence.radius), parseFloat(geofence.latitude) - parseFloat(geofence.radius)]],
						    [[parseFloat(geofence.longitude) + parseFloat(geofence.radius), parseFloat(geofence.latitude) + parseFloat(geofence.radius)]],
						    [[parseFloat(geofence.longitude) - parseFloat(geofence.radius), parseFloat(geofence.latitude) + parseFloat(geofence.radius)]],
						    [[parseFloat(geofence.longitude) - parseFloat(geofence.radius), parseFloat(geofence.latitude) - parseFloat(geofence.radius)]]
						  ]);
				} else {
					geometry.coordinates.push([
						    [parseFloat(geofence.min_longitude), parseFloat(geofence.min_latitude)],
						    [parseFloat(geofence.max_longitude), parseFloat(geofence.min_latitude)],
						    [parseFloat(geofence.max_longitude), parseFloat(geofence.max_latitude)],
						    [parseFloat(geofence.min_longitude), parseFloat(geofence.max_latitude)],
						    [parseFloat(geofence.min_longitude), parseFloat(geofence.min_latitude)]
						  ]);
				}
				st_index(geometry);
			}
		};
		var designDoc = {
				_id: '_design/' + DB_NAME,
				views: {
					allGeofenceLocation: {
						map: allGeofenceLocation.toString()
					},
					geofenceRuleMap: {
						map: geofenceRuleMap.toString()
					},
				},
				st_indexes: {
					geoindex: {
						index: geofenceIndexer.toString()
					}
				}
		};
		return designDoc;
	},
});
driverInsightsGeofence._init();
