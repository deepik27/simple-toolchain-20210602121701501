/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var VEHICLE_VENDOR_IBM = "IBM";
module.exports = {
	name: "high_engine_temp",
	description: "Engine temperature is too high.",
	fireRule: function(probe, vehicle){
		var alerts = [];
		var engineOilTemperature = this._getEngineOilTemperature(probe, vehicle);
		if (engineOilTemperature > 120) {
			var alert = {
					source: {type: "script", id: this.name},
					type: this.name,
					description: this.description,
					severity: "High",
					mo_id: probe.mo_id,
					ts: probe.ts,
					latitude: probe.matched_latitude || probe.latitude,
					longitude: probe.matched_longitude || probe.longitude,
					simulated: VEHICLE_VENDOR_IBM === vehicle.vehicleInfo.vendor
				};
			alerts.push(alert);
		}
		return alerts;
	},
	closeRule: function(alert, probe, vehicle){
		var engineOilTemperature = this._getEngineOilTemperature(probe, vehicle);
		if (engineOilTemperature <= 120) {
			alert.closed_ts = probe.ts;
			return alert;
		}
	},
	_getEngineOilTemperature: function(probe, vehicle) {
		return probe && probe.props && probe.props.engineTemp;
	}
};