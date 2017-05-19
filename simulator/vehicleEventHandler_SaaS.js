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
var Queue = app_module_require('utils/queue.js');
var iotaVehicleDataHub = app_module_require('iot4a-api/vehicleDataHub.js');

var vehicleEventHandler = {
	queueMap: {},
	probe: function(vehicleId, probe, callback) {
		var queue = this.queueMap[vehicleId];
		if (!queue) {
			queue = new Queue();
			this.queueMap[vehicleId] = queue;
		}
		// serialize results of send car probe
		queue.push({
			params: this._sendCarProbe(probe),
			run: function(promise) {
				return promise;
			},
			done: function(result) {
				if (callback)
					callback({vehicleId: vehicleId, data: result, type: 'probe'});
			},
			error: function(err) {
				if (callback)
					callback({vehicleId: vehicleId, data: probe, type: 'probe', error: err});
			}
		});
		return true;
	},
	
	_sendCarProbe: function(probe) {
//		console.log("mo_id=" + probe.mo_id + ", lat=" + probe.latitude + ", lon=" + probe.longitude + ", speed=" + probe.speed + ", heading=" + probe.heading);
		var deferred = Q.defer();
		Q.when(iotaVehicleDataHub.sendCarProbe(probe, "sync"), function(message) {
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
			deferred.resolve(probe);
		})["catch"](function(err){
			console.error("error: " + JSON.stringify(err));
			deferred.reject(err);
		}).done();
		return deferred.promise;
	}
};

module.exports = vehicleEventHandler;