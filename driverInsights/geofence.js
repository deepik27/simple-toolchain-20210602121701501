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
var GEOFENCE_RULE_TYPE = 100000;
var GEOFENCE_MAX_RULE_ID_NUM = 100000;

/*
 * geofence json
 * {
 *		message: message text returned when rule is applied
 *		direction: "in" or "out", "out" by default
 * 		geometry_type: "rectangle" or "circle", "rectangle" by default
 * 		geometry: {
 * 			min_latitude: start latitude of geo fence, valid when geometry_type is rectangle
 * 			min_longitude: start logitude of geo fence, valid when geometry_type is rectangle 
 * 			max_latitude:  end latitude of geo fence, valid when geometry_type is rectangle
 * 			max_longitude:  start logitude of geo fence, valid when geometry_type is rectangle
 * 			latitude: center latitude of geo fence, valid when geometry_type is circle
 * 			longitude: center logitude of geo fence, valid when geometry_type is circle 
 * 			radius: radius of geo fence, valid when geometry_type is circle 
 * 		}, 
 * 		target: {
 * 			area: {
 *	 			min_latitude: start latitude of rule target, valid when direction is out
 * 				min_longitude: start logitude of rule target, valid when direction is out 
 * 				max_latitude:  end latitude of rule target, valid when direction is out
 * 				max_longitude:  start logitude of rule target, valid when direction is out
 * 			}
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
			var result = response.map(function(doc) {
				doc.geofence.id = doc.id;
				return doc.geofence;
			});
			deferred.resolve(result);
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},

	getGeofence: function(geofence_id) {
		var deferred = Q.defer();
		Q.when(this._getGeofenceDoc(geofence_id), function(doc) {
			doc.geofence.id = doc.id;
			deferred.resolve(doc.geofence);
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	
	/*
	 * Create an unique Id for rule xml. RuleID must be unique within VehicleActionRule rule xmls. They must be managed by application. 
	 * If the application create VehicleActionRule rules other than geofence, ids for those rules must be taken care of to calculate the uniqueness.
	 */
	_getAvailableRuleXMLId: function() {
		var deferred = Q.defer();
		Q.when(this.db, function(db) {
			db.view(DB_NAME, "geofenceRuleXmlIds", {}, function(err, body) {
				if (err) {
					console.error(err);
					return deferred.reject(err);
				} else {
					var result = _.map(body.rows, function(value) {
						return value.value;
					});						
					for (var i = 0; i < GEOFENCE_MAX_RULE_ID_NUM; i++) {
						var rule_xml_id = GEOFENCE_RULE_TYPE + i;
						if (!_.contains(result, rule_xml_id)) {
							deferred.resolve(rule_xml_id);
							return;
						}
					}
					deferred.reject({message: "no id is available", statusCode: 500});
				}
			});
		});
		return deferred.promise;
	},
	
	createGeofence: function(geofence) {
		var self = this;
		var deferred = Q.defer();
		Q.when(this._getAvailableRuleXMLId(), function(rule_xml_id) {
			var rule = {description: "geofence rule", type: "Action", status: "active"};
			Q.when(driverInsightsAsset.addRule(rule, self._createGeofenceEmptyRuleXML(rule_xml_id)), function(response) {
				var promises = [];
				var geofence_id = response.id;
				var ruleXML = self._createGeofenceRuleXML(geofence_id, geofence, rule_xml_id);
				promises.push(driverInsightsAsset.updateRule(geofence_id, rule, ruleXML, true));
				promises.push(self._createDoc(response.id, {geofence: geofence, rule_xml_id: rule_xml_id}));
				
				Q.all(promises).then(function(data) {
					deferred.resolve({id: response.id});
				}, function(err) {
					deferred.reject(err);
				});
			})["catch"](function(err){
				deferred.reject(err);
			});
		})["catch"](function(err){
			deferred.reject(err);
		});
		return deferred.promise;
	},
	
	updateGeofence: function(geofence_id, geofence) {
		var deferred = Q.defer();
		var rule = {description: "geofence rule", type: "Action", status: "active"};
		var ruleXML = this._createGeofenceRuleXML(geofence_id, geofence);
		var promises = [];
		promises.push(driverInsightsAsset.updateRule(geofence_id, rule, ruleXML, true));
		promises.push(this._updateDoc(geofence_id, {geofence: geofence}));
		Q.all(promises).then(function(data) {
			deferred.resolve({id: geofence_id});
		}, function(err) {
			deferred.reject(err);
		});
		return deferred.promise;
	},
	
	_deleteGeofenceRule: function(rule_id, successOnNoExists) {
		var deferred = Q.defer();
		var rule = {description: "geofence being removed", type: "Action", status: "inactive"};
		Q.when(driverInsightsAsset.updateRule(rule_id, rule, null, true), function(response) {
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
		var promises = [];
		promises.push(this._deleteGeofenceRule(geofence_id, true));
		promises.push(this._deleteDoc(geofence_id));
		
		var deferred = Q.defer();
		Q.when(promises).then(function(result) {
			deferred.resolve({id: geofence_id});
		})["catch"](function(err){
			deferred.reject(err);
		}).done();

		return deferred.promise;
	},

	_createGeofenceRuleXMLTemplate: function(rule_xml_id) {
		return {
				rule_id: rule_xml_id,
				rule_type: GEOFENCE_RULE_TYPE,
				name: "Geofence Rule",
				description: "Geofence rule created by iota starter app rule engine.",
				condition: {
					pattern: "geofence"
				},
				actions: []
			};
	},

	_createGeofenceEmptyRuleXML: function(rule_xml_id) {
		return ruleGenerator.createVehicleAcitonRuleXML(this._createGeofenceRuleXMLTemplate(rule_xml_id));
	},
	
	_createGeofenceRuleXML: function(geofence_id, geofenceJson, rule_xml_id) {
		if (!geofenceJson) {
			return "";
		}
		
		var ruleJson = this._createGeofenceRuleXMLTemplate(rule_xml_id);
		
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
		if (geofenceJson.target) {
			ruleJson.target = {};
			if (geofenceJson.target.area) {
				ruleJson.target.areas = [geofenceJson.target.area];
			}
		}
		var message = geofenceJson.message || (range === "out" ? "Vehicle is out of bounds" : "Vehicle is in bounds");
		ruleJson.actions = geofenceJson.actions
						|| {vehicle_actions: [{
							message: message,
							parameters: [{
								key: "message_type",
								value: "geofence"
							},{
								key: "source_id",
								value: geofence_id
							},{
								key: "longitude",
								value: "CarProbe.Longitude"
							},{
								key: "latitude",
								value: "CarProbe.Latitude"
							}]
						}]};
		return ruleGenerator.createVehicleAcitonRuleXML(ruleJson);
	},
	
	_queryGeofenceDoc: function(min_latitude, min_longitude, max_latitude, max_longitude) {
		var deferred = Q.defer();
		if (isNaN(min_longitude) || isNaN(min_latitude) || isNaN(max_longitude) || isNaN(max_latitude)) {
			Q.when(this.db, function(db) {
				db.view(DB_NAME, "allGeofenceLocation", {}, function(err, body){
					if (err) {
						console.error(err);
						return deferred.reject(err);
					} else {
						var result = _.map(body.rows, function(value) {
							var doc = value.value;
							if (doc) {
								doc.id = value.id;
								delete doc._id;
								delete doc._rev;
							}
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
							if (doc) {
								doc.id = value.id;
								delete doc._id;
								delete doc._rev;
							}
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
		var geofenceRuleXmlIds = function(doc) {
			if (doc.rule_xml_id) {
				emit(doc._id, doc.rule_xml_id);
			}
		};
		var geofenceIndexer = function(doc){
			if (doc.geofence && doc.geofence.geometry) {
				var geofence = doc.geofence.geometry;
				var geometry = {type: "Polygon", coordinates: []};
				if (geofence.target && geofence.target.area) {
					var area = geofence.target.area;
					geometry.coordinates.push([
			   					    [parseFloat(area.min_longitude), parseFloat(area.min_latitude)],
			   					    [parseFloat(area.max_longitude), parseFloat(area.min_latitude)],
			   					    [parseFloat(area.max_longitude), parseFloat(area.max_latitude)],
			   					    [parseFloat(area.min_longitude), parseFloat(area.max_latitude)],
			   					    [parseFloat(area.min_longitude), parseFloat(area.min_latitude)]
			   					  ]);
				} else if (!isNaN(geofence.min_longitude)) {
					geometry.coordinates.push([
		   					    [parseFloat(geofence.min_longitude), parseFloat(geofence.min_latitude)],
		   					    [parseFloat(geofence.max_longitude), parseFloat(geofence.min_latitude)],
		   					    [parseFloat(geofence.max_longitude), parseFloat(geofence.max_latitude)],
		   					    [parseFloat(geofence.min_longitude), parseFloat(geofence.max_latitude)],
		   					    [parseFloat(geofence.min_longitude), parseFloat(geofence.min_latitude)]
		   					  ]);
				} else if (!isNaN(geofence.longitude)) {
		            var r = 0.0001;
					geometry.coordinates.push([
		   					    [parseFloat(geofence.longitude)-r, parseFloat(geofence.latitude)-r],
		   					    [parseFloat(geofence.longitude)+r, parseFloat(geofence.latitude)-r],
		   					    [parseFloat(geofence.longitude)+r, parseFloat(geofence.latitude)+r],
		   					    [parseFloat(geofence.longitude)-r, parseFloat(geofence.latitude)+r],
		   					    [parseFloat(geofence.longitude)-r, parseFloat(geofence.latitude)-r]
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
					geofenceRuleXmlIds: {
						map: geofenceRuleXmlIds.toString()
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
