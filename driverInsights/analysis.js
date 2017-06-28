/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var driverInsightsAnalysis = module.exports = {};

var _ = require("underscore");
var Q = new require('q');
var moment = require("moment");
var iot4aDriverBehavior = app_module_require('iot4a-api/driverBehavior');
var iot4aAsset = app_module_require('iot4a-api/asset.js');

var debug = require('debug')('analysis');
debug.log = console.log.bind(console);

_.extend(driverInsightsAnalysis, {

	isAvailable: function() {
		return iot4aAsset.isSaaS();
	},
	
	getLatestTrip: function(mo_id) {
		var deferred = Q.defer();
		Q.when(iot4aDriverBehavior.getTrip({mo_id: mo_id, limit: 1}), function(response) {
			if (response && response.length > 0) {
				deferred.resolve(response[0]);
			} else {
				deferred.reject({statusCode: 404, message: "No trip found"});
			}
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},

	getTripBehavior: function(mo_id, trip_id, lastHours) {
		var params = {mo_id: mo_id, trip_id: trip_id};
		if (lastHours > 0) {
			params.from = moment().subtract(1, 'hours').toISOString();
			params.to = moment().toISOString();
		}
		return iot4aDriverBehavior.requestOnlineJobPerTrip(params);
	},
	
	getTripRoute: function(mo_id, trip_id, lastHours) {
		var params = {mo_id: mo_id, trip_id: trip_id};
		if (lastHours > 0) {
			params.from = moment().subtract(1, 'hours').toISOString();
			params.to = moment().toISOString();
		}
		return iot4aDriverBehavior.getTripCarProbe(params);
	}
});
