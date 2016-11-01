/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AEGGZJ&popup=y&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var probe = module.exports = {};

var _ = require("underscore");
var Q = new require('q');
var asset = require("./asset.js");
var IOTF = require('../iotfclient');
var driverInsightsProbe = require("../driverInsights/probe.js");

_.extend(probe, {
	watch: function() {
		IOTF.on("+", function(payload, deviceType, deviceId) {
			// check if mandatory fields exist
			if (deviceType !== asset.deviceType || isNaN(payload.lng) || isNaN(payload.lat)) {
				return;
			}
			if (!payload.trip_id) {
				return;
			}

			
			return Q.when(asset.getAssetInfo(deviceId, deviceType), function(assetInfo) {
				var probe = {
					trip_id: payload.trip_id,
					mo_id: assetInfo.vehicleId,
					lng: payload.lng,
					lat: payload.lat,
					speed: payload.speed,
					heading: payload.heading || 0
				};
				if (payload.ts) {
					probe.ts = payload.ts;
				}
				// append driver
				if (assetInfo.driverId) {
					probe.driver_id = assetInfo.driverId;
				}
				// append status
				if (payload.props) {
					probe.props = {};
					_.each(payload.props, function(value, key) {
						probe.props[key] = value;
					});
				}
				driverInsightsProbe.sendRawData(probe, function(data) {
				});
			})["catch"](function(err) {
				console.error(err);
			}).done();
		});
	}
});
probe.watch();