/**
 * Copyright 2016, 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var driverInsightsProbe = module.exports = {};

var _ = require("underscore");
var Q = new require('q');
var moment = require("moment");
var driverInsightsAlert = require("./fleetalert.js");
const vehicleDataHub = app_module_require('cvi-node-lib').vehicleDataHub;
var debug = require('debug')('probe');
debug.log = console.log.bind(console);

var lastProbeTimeByMoId = {};

_.extend(driverInsightsProbe, {

	sendCarProbe: function (probe) {
		// check mandatory field
		if (!probe.trip_id || probe.trip_id.length === 0 || isNaN(probe.longitude) || isNaN(probe.latitude) || isNaN(probe.speed)) {
			return Q({ statusCode: 400, message: "mandatory parameters are not specified." });
		}

		var ts = probe.ts || Date.now();
		// keep the last probe for each mo_id
		lastProbeTimeByMoId[probe.mo_id] = ts;

		var payload = {
			// assign ts if missing
			ts: ts,
			timestamp: moment(ts).format('YYYY-MM-DDTHH:mm:ss.SSSZ'), // ISO8601
			trip_id: probe.trip_id,
			speed: probe.speed,
			mo_id: probe.mo_id,
			driver_id: probe.driver_id, //FIXME Get car probe requires driver_id as of 20160731
			longitude: probe.longitude,
			latitude: probe.latitude,
			heading: probe.heading || 0
		};
		if (probe.props) {
			payload.props = probe.props;
		}

		var deferred = Q.defer();
		Q.when(vehicleDataHub.sendCarProbe(payload, "sync"), function (result) {
			debug("events: " + result);
			var affected_events = null;
			var notified_messages = null;
			if (result) {
				// previous version of sendCarProbe returned an array of affected events directly in contents
				// new version returns affectedEvents and notifiedMessages objects
				affected_events = _.isArray(result) ? result : result.affectedEvents;
				notified_messages = result.notifiedMessages;
			}
			driverInsightsAlert.handleEvents(probe, (affected_events || []).concat(notified_messages || []));

			Q.when(vehicleDataHub.getCarProbe({ mo_id: payload.mo_id }), function (result) {
				if (result && result.length === 1) {
					_.extend(payload, result[0], { ts: ts });
				}

				// Process alert probe rule
				driverInsightsAlert.evaluateAlertRule(payload);

				// Add notification to response
				payload.notification = {
					affected_events: affected_events || [],
					notified_messages: notified_messages || []
				};

				deferred.resolve(payload);
			})["catch"](function (err) {
				console.error("error: " + JSON.stringify(err));
				deferred.reject(err);
			}).done();
		})["catch"](function (err) {
			console.error("error: " + JSON.stringify(err));
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},

	getLastProbeTime: function (mo_id) {
		return lastProbeTimeByMoId[mo_id];
	}
});
