/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var Q = require('q');
var _ = require('underscore');
var iotaVehicleDataHub = app_module_require('iot4a-api/vehicleDataHub.js');

var vehicleEventHandler = {
	probe: function(vehicleId, probe, callback) {
		this._sendCarProbe(vehicleId, probe, callback);
	},
	
	_sendCarProbe: function(vehicleId, probe, callback) {
//		console.log("mo_id=" + probe.mo_id + ", lat=" + probe.latitude + ", lon=" + probe.longitude + ", speed=" + probe.speed + ", heading=" + probe.heading);
		Q.when(iotaVehicleDataHub.sendCarProbe(probe, "sync"), function(message) {
			if (callback) {
				var affected_events = null;
				var notified_messages = null;
				if(message){
					// previous version of sendCarProbe returned an array of affected events directly in contents
					// new version returns affectedEvents and notifiedMessages objects
					affected_events = _.isArray(message) ? message : message.affectedEvents;
					notified_messages = message.notifiedMessages;
				}
				// Add notification to response
				probe.notification = {
					affected_events: affected_events || [],
					notified_messages: notified_messages || []
				};

				var qs = {
						min_longitude: (probe.longitude-0.001),
						max_longitude: (probe.longitude+0.001),
						min_latitude: (probe.latitude-0.001),
						max_latitude: (probe.latitude+0.001),
						mo_id: payload.mo_id
					};
				Q.when(iot4aVehicleDataHub.getCarProbe(qs), function(result) {
					if(result && result.length > 0) {
						var p = null;
						// Workaround:
						//   IoT for Automotive service returns probes of multiple vehicle in the area for now
						//   even if the request specifies only one mo_id
						for(var i=0; i<result.length; i++){
							if(result[i].mo_id === probe.mo_id){
								p = result[i];
								break;
							}
						}
						if(p){
							var ts = {ts: probe.ts, timestamp: probe.timestamp};
							_.extend(probe, p, ts);
						}
					}
					callback({vehicleId: vehicleId, data: probe, type: 'probe'});
				})["catch"](function(err) {
					callback({vehicleId: vehicleId, data: probe, type: 'probe', error: err});
				}).done();
			}
		})["catch"](function(err){
			console.error("error: " + JSON.stringify(err));
		}).done();
	}
};

module.exports = vehicleEventHandler;