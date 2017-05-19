/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var fs = require('fs');
var Q = require('q');
var Queue = app_module_require('utils/queue.js');

var vehicleEventHandler = null;
//try {
//	if (fs.statSync(__dirname + '/vehicleEventHandler_SaaS.js').isFile()) {
//		vehicleEventHandler = require(__dirname + '/vehicleEventHandler_SaaS.js');
//	}
//} catch(err) {}

if (!vehicleEventHandler) {
	var driverInsightsProbe = require('../driverInsights/probe.js');
	vehicleEventHandler = {
			queueMap: {},
			probe: function(vehicleId, probe, callback) {
				var queue = this.queueMap[vehicleId];
				if (!queue) {
					queue = new Queue();
					this.queueMap[vehicleId] = queue;
				}
				// serialize results of send car probe
				queue.push({
					params: driverInsightsProbe.sendCarProbe(probe),
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
			state: function(vehicleId, state, callback) {
				if (state === 'idling') {
					var queue = this.queueMap[vehicleId];
					if (queue) {
						delete this.queueMap[vehicleId];
					}
				}
			}
		};

}

module.exports = vehicleEventHandler;