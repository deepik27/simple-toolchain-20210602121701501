/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var _ = require("underscore");
var Q = new require('q');
var iot4aContextMapping = app_module_require("iot4a-api/contextMapping.js");
var debug = require('debug')('vehicleLocation');
debug.log = console.log.bind(console);

var lastProbeTimeByMoId = {};

function routeGenerator() {
	this.watchId = null;
	this.driving = false;
	this.routing = false;
	this.tripRoute = null;
	this.tripRouteIndex = 0;
	this.prevLoc = {lat:48.134994, lon:11.671026, speed:0, heading: 0};
	this.destination = null;
	this.options = {avoid_events: true, route_loop: true};
}

routeGenerator.prototype.listen = function(callback) {
	this.callback = callback;
};

routeGenerator.prototype.start = function(interval) {
	if(!this.routing && !this.tripRoute) {
		this._resetRoute();
	}
	this.driving = true;
	var self = this;
	this.watchId = setInterval(function(){
		if (self.driving) {
			var p = self._getRoutePosition();
			if(p && self.callback) {
				self.callback({data: {latitude: p.lat, longitude: p.lon, speed: p.speed, heading: p.heading}, type: 'position'});
			}
		}
	}, interval || 1000);
	if (this.callback) {
		this.callback({data: {driving: this.driving, routing: this.routing}, type: "state"});
	}
};

routeGenerator.prototype.stop = function() {
	if (this.watchId) {
		clearInterval(this.watchId);
		this.watchId = null;
	}
	this.prevLoc.speed = 0;
	this.driving = false;
	if (this.callback) {
		this.callback({data: {driving: this.driving, routing: this.routing}, type: "state"});
	}
};

routeGenerator.prototype.setCurrentPosition = function(loc /* lat, lon */, donotResetRoute){
	if(this.driving || !loc){
		// under driving
		return Q();
	}
	this.prevLoc = {lat: loc.latitude, lon: loc.longitude, heading: loc.heading, speed: loc.speed};
	if(isNaN(this.prevLoc.speed)){
		this.prevLoc.speed = 0;
	}
	return donotResetRoute ? Q() : this._resetRoute();
};

routeGenerator.prototype.getCurrentPosition = function(){
	return {latitude:this.prevLoc.lat, longitude:this.prevLoc.lon, heading: this.prevLoc.heading, speed: this.prevLoc.speed};
};

routeGenerator.prototype.setDestination = function(loc, donotResetRoute){
	if(this.driving){
		// under driving
		return Q();
	}
	this.destination = {lat: loc.latitude, lon: loc.longitude, heading: loc.heading, speed: loc.speed};
	return donotResetRoute ? Q() : this._resetRoute();
};

routeGenerator.prototype.getDestination = function() {
	return this.destination;
};

routeGenerator.prototype.setOption = function(key, value) {
	this.options[key] = value;
};

routeGenerator.prototype.getOption = function(key) {
	return this.options[key];
};

routeGenerator.prototype.updateRoute = function(locs) {
	if (!locs) {
		return this._resetRoute();
	}
	var deferred = Q.defer();
	var self = this;
	this._createRoutes(locs, true).then(function(routeArray){
		self.tripRouteIndex = 0;
		self.tripRoute = routeArray;
		if (routeArray.length > 0) {
			self.prevLoc = routeArray[0];
		}
		deferred.resolve(routeArray);
		if (self.callback) {
			self.callback({data: {route: self.tripRoute, loop: true, current: self.prevLoc, destination: self.destination, options: self.options}, type: 'route'});
		}
	})["catch"](function(error){
		if (self.callback) {
			self.callback({data: {loop: true, current: self.prevLoc, destination: self.destination, options: self.options}, error: error, type: 'route'});
		}
		deferred.reject(error);
	});
	return deferred.promise;
};

// find a random location in about 5km from the specified location
routeGenerator.prototype._getRandomLoc = function(slat, slng){
	var deferred = Q.defer();
	var ddist = (Math.random()/2 + 0.5) * 0.025 / 2;
	var dtheta = 2 * Math.PI * Math.random();
	var dlat = +slat + ddist * Math.sin(dtheta);
	var dlng = +slng + ddist * Math.cos(dtheta);
	return {lat: dlat, lng: dlng};
};

routeGenerator.prototype._generateAnchors = function(slat, slng, sheading) {
	var deferred = Q.defer();
	var locs = [];
	if (this.destination) {
		locs.push({lat: slat, lng: slng, heading: sheading});
		locs.push({lat: this.destination.lat, lng: this.destination.lon, heading: this.destination.heading});
		deferred.resolve(locs);
	} else {
		var promises = [];
		var numPoints = 3;
		var porg = {lat: slat, lng: slng};
		for (var i = 0; i < numPoints; i++) {
			var pdst = i === (numPoints - 1) ? {lat: slat, lng: slng} : this._getRandomLoc(slat, slng);
			var heading = this._calcHeading(porg, pdst);
			promises.push(iot4aContextMapping.matchMapFirst(porg.lat, porg.lng, heading));
			porg = pdst;
		}
		Q.all(promises).then(function(results) {
			deferred.resolve(_.filter(results, function(loc) {return loc;}));
		})["catch"](function(error){
			deferred.reject(error);
		});
	}
	return deferred.promise;
};

// reset trip route
routeGenerator.prototype._resetRoute = function(){
	var slat = this.prevLoc.lat;
	var slng = this.prevLoc.lon;
	var sheading = this.prevLoc.heading;
	var speed = this.prevLoc.speed;
	var loop = !this.destination || (this.options && this.options.route_loop);

	var deferred = Q.defer();
	var self = this;
	Q.when(this._generateAnchors(slat, slng, sheading), function(locs) {
		Q.when(self._createRoutes(locs, loop), function(routeArray){
			self.tripRouteIndex = 0;
			var prevLoc = null;
			self.tripRoute = _.filter(routeArray, function(loc) {
				var diff = !prevLoc || prevLoc.lon !== loc.lon || prevLoc.lat !== loc.lat;
				prevLoc = loc;
				return diff;
			});
			if (routeArray.length > 0) {
				self.prevLoc = routeArray[0];
				self.prevLoc.heading = self._calcHeading(routeArray[0], routeArray[1]);
			} else if (self.prevLoc.heading === undefined) {
				self.prevLoc.heading = sheading;
			}
			self.prevLoc.speed = speed;
			if (self.callback) {
				self.callback({data: {route: self.tripRoute, loop: loop, current: self.prevLoc, destination: self.destination, options: self.options}, type: 'route'});
			}
			deferred.resolve(routeArray);
		})["catch"](function(error){
			if (self.callback) {
				self.callback({data: {loop: loop, current: self.prevLoc, destination: self.destination, options: self.options}, error: error, type: 'route'});
			}
			deferred.reject(error);
		}).done();
	});
	return deferred.promise;
};

routeGenerator.prototype._createRoutes = function(locs, loop) {
	var promises = [];
	var routeArrays = {};
	
	var success = function(result) {
		routeArrays[result.id] = result.route;
		return result;
	};
	var fail = function(error) {
		return null;
	};
	for (var i = 0; i < locs.length - (loop ? 0 : 1); i++) {
		var loc1 = locs[i];
		var loc2 = (i < locs.length - 1) ? locs[i+1] : locs[0];
		var index = "index" + i;
		promises.push(Q.when(this._findRouteBetweenPoints(0, loc1, loc2, index), success, fail));
	}

	var self = this;
	this.routing = true;
	var deferred = Q.defer();
	Q.all(promises).then(function(routes) {
		var routeArray = [];
		for (var i = 0; i < promises.length; i++) {
			var r = routeArrays["index" + i];
			if (!r) {
				return deferred.reject();
			} else if (r.length > 0) {
				if (!r[0])
					console.warn("wrong route was found");
				routeArray = routeArray.concat(r);
			}
		}
		self.routing = false;
		deferred.resolve(routeArray);
	})["catch"](function(error){
		self.routing = false;
		deferred.reject(error);
	});
	return deferred.promise;
};

// find a route from a specific location to a specific location
routeGenerator.prototype._findRouteBetweenPoints = function(retryCount, start, end, searchId){
	retryCount = retryCount || 0;
	var deferred = Q.defer();
	var self=this;
	var option = this.getOption("avoid_events") ? "avoid_events" : null;

	Q.when(iot4aContextMapping.routeSearch(start.lat, start.lng, start.heading||0, end.lat, end.lng, end.heading||0, option), function(data){
		var routeArray = [];
		data.link_shapes.forEach(function(shapes){
			shapes.shape.forEach(function(shape){
				if(shape)
					routeArray.push(shape);
			});
		});
		if(routeArray.length >= 2){
			deferred.resolve(searchId ? {id: searchId, route: routeArray} : routeArray);
			return;
		}else if(retryCount++ < 5){
			// retry 5 times
			console.log("failed to search route. retry[" + retryCount + "]");
			return self._findRouteBetweenPoints(retryCount, start, end, searchId).then(function(result){
				deferred.resolve(searchId ? {id: searchId, route: result} : result);
			});
		}
		console.error("Cannot get route for simulation");
		deferred.reject();
	})["catch"](function(error){
		console.error("Error in route search: " + error);
		deferred.reject();
	});
	return deferred.promise;
};

routeGenerator.prototype._getReferenceSpeed = function(index, speed){
	var defReferenceSpeed = 120;
	loc = this.tripRoute[index];
	if (index === 0) {
		return defReferenceSpeed;
	} else if (!isNaN(loc.referenceSpeed)) {
		return loc.referenceSpeed;
	}

	var distance = 0;
	var p1 = loc;
	for (var i = index + 1; i < this.tripRoute.length; i++) {
		/*
			 p1 ==== p2 ---- p3
			 calculate direction of the p1-p2 path and distance between the points
		 */
		var p2 = this.tripRoute[i < this.tripRoute.length - 1 ? i : (i - this.tripRoute.length + 1)];
		if (isNaN(p1.heading)) {
			p1.heading = this._calcHeading(p1, p2);
		}
		if (isNaN(p1.length)) {
			p1.length = this._getDistance(p1, p2);
		}
		/*
			 p1 ---- p2 ==== p3
			 calculate direction of the p2-p3 path and distance between the points
		 */
		var p3 = this.tripRoute[i < this.tripRoute.length - 2 ? (i + 1) : (i - this.tripRoute.length + 2)];
		if (isNaN(p2.heading)) {
			p2.heading = this._calcHeading(p2, p3);
		}
		if (isNaN(p2.length)) {
			p2.length = this._getDistance(p2, p3);
		}
		distance += p1.length;
		if (distance > 50) {
			// break if distance from the current position is over 50m
			break;
		}
		
		var diff = Math.abs(loc.heading - p2.heading);
		if (diff > 180) {
			diff = 360 - diff;
		}
		if (diff < 110) {
			loc.referenceSpeed = Math.min(Math.floor(distance * 2), defReferenceSpeed);
			return loc.referenceSpeed;
		} else if (diff < 135) {
			loc.referenceSpeed = Math.min(Math.floor(distance * 3), defReferenceSpeed);
			return loc.referenceSpeed;
		}
		p1 = p2;
	}

	loc.referenceSpeed = defReferenceSpeed;
	return loc.referenceSpeed;
};

routeGenerator.prototype._getRoutePosition = function(){
	if(!this.prevLoc || !this.tripRoute || this.tripRoute.length < 2){
		return this.prevLoc;
	}
	var prevLoc = this.prevLoc;
	var loc = this.tripRoute[this.tripRouteIndex];
	var speed = this._getDistance(loc, prevLoc)*0.001*3600;
	var referenceSpeed = this._getReferenceSpeed(this.tripRouteIndex, speed);
	var acceleration = Math.floor(Math.random() * 10 + 10);
	while((speed - prevLoc.speed) < (acceleration * -1) && this.tripRouteIndex < this.tripRoute.length-1){ 
		// too harsh brake, then skip the pointpoint
		this.tripRouteIndex++;
		loc = this.tripRoute[this.tripRouteIndex];
		speed = this._getDistance(loc, prevLoc)*0.001*3600;
	}
	while(speed>referenceSpeed || (speed - prevLoc.speed) > acceleration){
		// too harsh acceleration, then insert intermediate point
		var loc2 = {lat: (+loc.lat+prevLoc.lat)/2, lon: (+loc.lon+prevLoc.lon)/2};
		speed = this._getDistance(loc2, prevLoc)*0.001*3600;
		this.tripRoute.splice(this.tripRouteIndex, 0, loc2);
		loc = loc2;
	}
	loc.speed = speed;
	loc.heading = this._calcHeading(prevLoc, loc);
	// keep the previous info
	this.prevLoc = loc;

	this.tripRouteIndex++;
	if(this.tripRouteIndex >= this.tripRoute.length){
		if (this.destination && !(this.options && this.options.route_loop)) {
			this.tripRouteIndex--;
		} else {
			this.tripRouteIndex = 0;
		}
	}
	return loc;
};

routeGenerator.prototype._calcHeading = function(p0, p1) {
	var rad = 90 - Math.atan2(Math.cos(p0.lat/90)*Math.tan(p1.lat/90)-Math.sin(p0.lat/90)*Math.cos((p1.lon-p0.lon)/180),
			Math.sin((p1.lon-p0.lon)/180)) / Math.PI * 180;
	return (rad + 360)%360;
};

/*
 * Calculate distance in meters between two points on the globe
 * - p0, p1: points in {latitude: [lat in degree], longitude: [lng in degree]}
 */
routeGenerator.prototype._getDistance = function(p0, p1) {
	if (!p0 || !p1) 
		return 0;
	var latrad0 = this._toRadians(p0.lat);
	var lngrad0 = this._toRadians(p0.lon);
	var latrad1 = this._toRadians(p1.lat);
	var lngrad1 = this._toRadians(p1.lon);
	var norm_dist = Math.acos(Math.sin(latrad0) * Math.sin(latrad1) + Math.cos(latrad0) * Math.cos(latrad1) * Math.cos(lngrad1 - lngrad0));
	
	// Earths radius in meters via WGS 84 model.
	var earth = 6378137;
	return earth * norm_dist;
};

routeGenerator.prototype._toRadians = function(n) {
    return n * (Math.PI / 180);
};

routeGenerator.prototype._toDegree = function(n) {
    return n * (180 / Math.PI);
};

module.exports = routeGenerator;
