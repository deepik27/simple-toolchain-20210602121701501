/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
/*
 * REST APIs using Driver Behavior service as backend
 */

var probeAggregator = module.exports = {};

var Q = require('q');
var _ = require('underscore');

var GRID_NUM = process.env.GRID_NUM || 8;
var AGGREGATION_DISTANCE_THRESHOLD = process.env.AGGREGATION_DISTANCE_THRESHOLD || 100000; // 100km by default

var debug = require('debug')('aggregator');
debug.log = console.log.bind(console);

_.extend(probeAggregator, {
	/*
	 * Get distance between (lot1, lat1) and (lon2, lot2)
	 */
	calcDistance: function(lon1, lat1, lon2, lat2) {
	    var R = 6378e3;
	    lon1 = this._toRadians(lon1);
	    lat1 = this._toRadians(lat1);
	    lon2 = this._toRadians(lon2);
	    lat2 = this._toRadians(lat2);
	    var delta_x = lon2 - lon1;
	    var delta_y = lat2 - lat1;
	    var a = Math.sin(delta_y / 2) * Math.sin(delta_y / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(delta_x / 2) * Math.sin(delta_x / 2);
	    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	    var distance = R * c;
	    return distance;
	},
	
	/*
	 * Get position of distance(m) from (lon, lat)
	 */
	calcPosition: function(lon, lat, distance, bearing) {
	    var R = 6378e3;
	    var d = distance;
	    var angular_distance = d / R;
	    bearing = this._toRadians(bearing);
	    var s_lon = this._toRadians(lon);
	    var s_lat = this._toRadians(lat);
	    var sin_s_lat = Math.sin(s_lat);
	    var cos_s_lat = Math.cos(s_lat);
	    var cos_angular_distance = Math.cos(angular_distance);
	    var sin_angular_distance = Math.sin(angular_distance);
	    var sin_bearing = Math.sin(bearing);
	    var cos_bearing = Math.cos(bearing);
	    var sin_e_lat = sin_s_lat * cos_angular_distance + cos_s_lat * sin_angular_distance * cos_bearing;

	    var e_lat = this._toDegree(Math.asin(sin_e_lat));
	    var e_lon = this._toDegree(s_lon + Math.atan2(sin_bearing * sin_angular_distance * cos_s_lat,
	                             cos_angular_distance - sin_s_lat * sin_e_lat));
	    e_lon = (e_lon + 540) % 360 - 180;
	    return [e_lon, e_lat];
	},

	_toRadians: function(n) {
	  return n * (Math.PI / 180);
	},

	_toDegree: function(n) {
		return n * (180 / Math.PI);
	},
	
	_getUnitLength: function(d) {
		if (d >= 10) {
			return Math.floor(d);
		} else if (d >= 1) {
			return Math.round(d);
		}
		
		var dd = d * 10;
		for (var i = 0; i < 10; i++) {
			if (dd >= 1) {
				return Math.ceil(dd) / Math.pow(10, i + 1);
			}
			dd *= 10;
		}
		return d;
	},
	
	/*
	 * Split area into small regions if vertical or horizontal distance is over length(m)
	 */
	createRegions: function(min_lon, min_lat, max_lon, max_lat, length) {
		length = length || AGGREGATION_DISTANCE_THRESHOLD;
		var distance_lon = this.calcDistance(min_lon, min_lat, max_lon, min_lat);
		var distance_lat = this.calcDistance(min_lon, min_lat, min_lon, max_lat);
		var distance = Math.min(distance_lon, distance_lat);
		if (distance < length) {
			return null;
		}
		
		var n_grid = GRID_NUM > 1 ? GRID_NUM : 8;
		var lat_d, lon_d;
		if (distance_lon > distance_lat) {
			lon_d = (max_lon - min_lon) / n_grid;
			lat_d = Math.abs(this.calcPosition(min_lon, min_lat, distance / n_grid, 180)[1] - min_lat);
		} else {
			lat_d = (max_lat - min_lat) / n_grid;
			lon_d = Math.abs(this.calcPosition(min_lon, min_lat, distance / n_grid, 90)[0] - min_lon);
		}

		// Calc longitude start point
		lon_d = this._getUnitLength(lon_d);
		var start_lon = Math.floor(min_lon / lon_d) * lon_d;
		
		// Calc latitude start point
		lat_d = this._getUnitLength(lat_d);
		var start_lat = Math.floor(min_lat / lat_d) * lat_d;
		
		// Create regions
		var self = this;
		var regions = {};
		var lat_index = 0;
//		console.log("=== min_lon=" + min_lon + ", min_lat=" + min_lat + ", max_lon=" + max_lon + ", max_lat=" + max_lat + ", lon_d=" + lon_d + ", lat_d=" + lat_d + " ===");
		for (var geo_min_lat = start_lat; geo_min_lat < max_lat; geo_min_lat+=lat_d) {
			var lon_index = 0;
			for (var geo_min_lon = start_lon; geo_min_lon < max_lon; geo_min_lon+=lon_d) {
				var regionId = self._regionId(geo_min_lon, geo_min_lat, lon_d, lat_d, lon_index, lat_index);
				var region = {id: regionId, lon_index: lon_index, lat_index: lat_index, 
					geometry: {min_lon: geo_min_lon, min_lat: geo_min_lat, max_lon: geo_min_lon + lon_d, max_lat: geo_min_lat + lat_d}};
//				console.log("id=" + region.id + ", lon1=" + region.geometry.min_lon + ", lat1=" + region.geometry.min_lat + ", lon2=" + region.geometry.max_lon + ", lat2=" + region.geometry.max_lat);
				regions[regionId] = region;
				lon_index++;
			}
			lat_index++;
		}
		return {start_lon: start_lon, start_lat: start_lat, 
				min_lon: min_lon, min_lat: min_lat,
				max_lon: max_lon, max_lat: max_lat, 
				lon_d: lon_d, lat_d: lat_d, regions: regions};
	},

	/*
	 * Create aggregated group for a region and set probes
	 */
	createGroup: function(region, probes) {
		var self = this;
		var data = {region: region, probes: probes};
		var geometry = data.region.geometry;
		var center_lon = geometry.min_lon + (geometry.max_lon - geometry.min_lon)/2;
		var center_lat = geometry.min_lat + (geometry.max_lat - geometry.min_lat)/2;
		data.validGeometry = {min_lon: center_lon, min_lat: center_lat, max_lon: center_lon, max_lat: center_lat};
		data.center = {lon_sum: 0, lat_sum: 0};

		_.each(probes || [], function(probe) {
			self._updateGeometry(data, probe);
		});
		return this._createGroupData(region.id, data);
	},
	
	/*
	 * Create summary from each grup
	 */
	createSummary: function(groups) {
		var total = 0;
		_.each(groups, function(group) {
			if (group.count < 0)
				total = -1;  // negative if unknown
			else if (total >= 0)
				total += group.count;
		});
		return {aggregated: true, summary: {count: total, groups: groups}};
	},
	
	/*
	 * Create aggregated groups and set each probe to corresponding group
	 */
	aggregate: function(regions, probes) {
		var aggregated = {};
		var self = this;
		var max_ts = 0;
		_.each(probes, function(probe) {
			var region = self._getRegion(regions, probe);
			var data = aggregated[region.id];
			if (!data) {
				data = {region: region, probes: []};
				var geometry = region.geometry;
				var center_lon = geometry.min_lon + (geometry.max_lon - geometry.min_lon)/2;
				var center_lat = geometry.min_lat + (geometry.max_lat - geometry.min_lat)/2;
				data.validGeometry = {min_lon: center_lon, min_lat: center_lat, max_lon: center_lon, max_lat: center_lat};
				data.center = {lon_sum: 0, lat_sum: 0};
				aggregated[region.id] = data;
			}
			self._updateGeometry(data, probe);
			data.probes.push(probe);
		});
		var groups = _.map(aggregated, function(d, key) {return self._createGroupData(key, d);});
//		console.log("==========================================================");
//		_.each(groups, function(g) {
//			console.log("lon1=" + g.geometry.min_lon + ", lat1=" + g.geometry.min_lat + ", lon2=" + g.geometry.max_lon + ", lat2=" + g.geometry.max_lat + ", count=" + g.count);
//		});
		return {aggregated: true, summary: {count: probes.length, groups: groups}};
	},
	
	convertToDeviceInfo: function(summary) {
		var devices = _.map(summary.groups, function(g) {
			return {aggregated: true, 
				group_id: g.group_id, 
				geometry: g.geometry, 
				validGeometry: g.validGeometry, 
				center: g.center, 
				count: g.count,
				alerts: g.alerts  // {troubled: <number>, critical: <number>}
			};
		});
		return {count: summary.count, devices: devices};
	},
	
	_getRegion: function(regions, probe) {
		var lon = probe.matched_longitude || probe.longitude;
		var lat = probe.matched_latitude || probe.latitude;
		var lon_index = Math.floor((lon - regions.start_lon) / regions.lon_d);
		var lat_index = Math.floor((lat - regions.start_lat) / regions.lat_d);
		return regions.regions[this._regionId(regions.min_lon, regions.min_lat, regions.lon_d, regions.lat_d, lon_index, lat_index)];
	},
	
	_updateGeometry: function(data, probe) {
		var lon = probe.matched_longitude || probe.longitude;
		var lat = probe.matched_latitude || probe.latitude;
		if (data.validGeometry) {
			data.validGeometry.min_lon = Math.min(data.validGeometry.min_lon, lon);
			data.validGeometry.min_lat = Math.min(data.validGeometry.min_lat, lat);
			data.validGeometry.max_lon = Math.max(data.validGeometry.max_lon, lon);
			data.validGeometry.max_lat = Math.max(data.validGeometry.max_lat, lat);
		} else {
			data.validGeometry = {min_lon: lon, min_lat: lat, max_lon: lon, max_lat: lat};
			data.center = {lon_sum: 0, lat_sum: 0};
		}
		data.center.lon_sum += lon;
		data.center.lat_sum += lat;
	},
	
	_regionId: function(lon, lat, lon_d, lat_d, lon_index, lat_index) {
		return lon_index + ':' + lat_index + ':' + lon_d + ':' + lat_d;
	},
	
	_createGroupData: function(group_id, data) {
		var count = data.probes ? data.probes.length : -1;
		var center = count > 0 ? {lon: data.center.lon_sum / count, lat: data.center.lat_sum / count} : null;
		return {group_id: group_id, geometry: data.region.geometry, validGeometry: data.validGeometry, center: center, count: count, probes: data.probes};
	} 
});

