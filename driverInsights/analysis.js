/**
 * Copyright 2017,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
var driverInsightsAnalysis = module.exports = {};

var _ = require("underscore");
var Q = new require('q');
var moment = require("moment");
const driverBehavior = app_module_require("cvi-node-lib").driverBehavior;

var debug = require('debug')('analysis');
debug.log = console.log.bind(console);

_.extend(driverInsightsAnalysis, {

	isAvailable: function () {
		return true;
	},

	getTrips: function (mo_id, limit) {
		var deferred = Q.defer();
		var params = { mo_id: mo_id };
		if (limit) {
			params.limit = limit;
		}
		Q.when(driverBehavior.getTrip(params), function (response) {
			deferred.resolve(response);
		})["catch"](function (err) {
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},

	getTripBehavior: function (mo_id, trip_id, lastHours) {
		var params = { mo_id: mo_id, trip_id: trip_id };
		if (lastHours > 0) {
			params.from = moment().subtract(1, 'hours').toISOString();
			params.to = moment().toISOString();
		}
		return driverBehavior.requestOnlineJobPerTrip(params);
	},

	getTripRoute: function (mo_id, trip_id, offset, limit) {
		var params = { mo_id: mo_id, trip_id: trip_id, offset: offset, limit: limit, filter: "B:timestamp,B:latitude,B:longitude,B:matched_latitude,B:matched_longitude" };
		return driverBehavior.getTripCarProbe(params);
	},

	getTripRouteLength: function (mo_id, trip_id) {
		var params = { mo_id: mo_id, trip_id: trip_id };
		return driverBehavior.getTripCarProbeCount(params);
	}
});
