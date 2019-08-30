/**
 * Copyright 2017,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
const _ = require("underscore");
const Q = new require('q');
const EventEmitter = require('events').EventEmitter;
const contextMapping = app_module_require("cvi-node-lib").contextMapping;
const version = app_module_require('utils/version.js');
const debug = require('debug')('vehicleLocation');
debug.log = console.log.bind(console);

function routeGenerator(mo_id, driver_id) {
	this.watchId = null;
	this.mo_id = mo_id;
	this.driver_id = driver_id;
	this.driving = false;
	this.routing = false;
	this.tripRoute = null;
	this.tripRouteIndex = 0;
	this.prevLoc = { lat: 48.134994, lon: 11.671026, speed: 0, heading: 0 };
	this.destination = null;
	this.acceleration = 0;
	this.waypoints = [];
	this.options = { avoid_events: false, route_loop: false, routemode: "time,distance,pattern" };
	this.eventEmitter = new EventEmitter();
}

routeGenerator.prototype.listen = function () {
	return this.eventEmitter;
};

routeGenerator.prototype.start = function (params) {
	const _start = () => {
		if (!this.allRoutes || this.allRoutes.length == 0) {
			// Probably, route has not been determined
			return;
		}
		let interval = (params && params.interval) || 1000;
		let mode = params && params.mode;

		this.tripRoute = null;
		for (let i = 0; i < this.allRoutes.length; i++) {
			if (mode === this.allRoutes[i].mode) {
				this.tripRoute = this.allRoutes[i].route;
			}
		}
		if (!this.tripRoute) {
			this.tripRoute = this.allRoutes[0].route;
		}

		this.driving = true;
		this.watchId = setInterval(() => {
			if (this.driving) {
				var p = this._getRoutePosition();
				if (p) {
					this.eventEmitter.emit('position', { latitude: p.lat, longitude: p.lon, speed: p.speed, heading: p.heading, destination: p.destination });
				}
			}
		}, interval);
		this.eventEmitter.emit('state', { driving: this.driving, routing: this.routing });
	};

	if (!this.routing && (!this.allRoutes || this.allRoutes.length == 0)) {
		Q.when(this._resetRoute(), () => { _start(); });
	} else {
		_start();
	}
};

routeGenerator.prototype.stop = function () {
	if (this.watchId) {
		clearInterval(this.watchId);
		this.watchId = null;
	}
	this.prevLoc.speed = 0;
	this.driving = false;
	let p = this._getRoutePosition();
	if (p) {
		this.eventEmitter.emit('position', { latitude: p.lat, longitude: p.lon, speed: 0, heading: p.heading, destination: p.destination });
	}
	this.eventEmitter.emit('state', { driving: this.driving, routing: this.routing });
};

routeGenerator.prototype.setCurrentPosition = function (loc /* lat, lon */, donotResetRoute) {
	if (this.driving || !loc) {
		// under driving
		return Q();
	}
	this.prevLoc = { lat: loc.latitude, lon: loc.longitude, heading: loc.heading, speed: loc.speed };
	if (isNaN(this.prevLoc.speed)) {
		this.prevLoc.speed = 0;
	}
	return donotResetRoute ? Q() : this._resetRoute();
};

routeGenerator.prototype.getCurrentPosition = function () {
	return { latitude: this.prevLoc.lat, longitude: this.prevLoc.lon, heading: this.prevLoc.heading, speed: this.prevLoc.speed };
};

routeGenerator.prototype.setDestination = function (loc, donotResetRoute) {
	if (this.driving) {
		// under driving
		return Q();
	}
	this.prevAnchors = [];
	this.destination = { lat: loc.latitude, lon: loc.longitude, heading: loc.heading, speed: loc.speed };
	return donotResetRoute ? Q() : this._resetRoute();
};

routeGenerator.prototype.setWaypoints = function (waypoints, donotResetRoute) {
	this.waypoints = waypoints;
	return donotResetRoute ? Q() : this._resetRoute();
};

routeGenerator.prototype.getDestination = function () {
	return this.destination;
};

routeGenerator.prototype.setOption = function (key, value) {
	this.options[key] = value;
};

routeGenerator.prototype.getOption = function (key) {
	return this.options[key];
};

routeGenerator.prototype.updateRoute = function (locs) {
	if (!locs) {
		return this._resetRoute();
	}
	this.routing = true;
	return this._createRoutes(locs, this.getOption("route_loop"));
};

// find a random location in about 5km from the specified location
routeGenerator.prototype._getRandomLoc = function (slat, slng) {
	let ddist = (Math.random() / 2 + 0.8) * 0.1 / 2;
	let dtheta = 2 * Math.PI * Math.random();
	let dlat = +slat + ddist * Math.sin(dtheta);
	let dlng = +slng + ddist * Math.cos(dtheta);
	return { lat: dlat, lon: dlng };
};

routeGenerator.prototype.setAcceleration = function (acceleration) {
	let parsedAccel = parseFloat(acceleration);
	if (!isNaN(parsedAccel)) {
		this.acceleration = parsedAccel;
	} else {
		this.acceleration = 0;
	}
};

routeGenerator.prototype.getAcceleration = function () {
	return this.acceleration;
};

routeGenerator.prototype._generateAnchors = function (slat, slng, sheading, keepAnchors) {
	let deferred = Q.defer();
	let locs = [];
	if (this.waypoints && this.waypoints.length > 0) {
		let prevLoc = { lat: slat, lon: slng, heading: sheading };
		locs.push(prevLoc);
		this.waypoints.forEach(function (p) {
			prevLoc.destination = { lat: p.latitude, lon: p.longitude };
			if (p.poi_id) prevLoc.destination.props = { poi_id: p.poi_id };
			prevLoc = { lat: p.latitude, lon: p.longitude, heading: p.heading };
			locs.push(prevLoc);
		});
		if (this.destination) {
			prevLoc.destination = this.destination;
			locs.push(this.destination);
		}
		deferred.resolve(locs);
	} else if (this.destination) {
		locs.push({ lat: slat, lon: slng, heading: sheading, destination: this.destination });
		if (this.prevAnchors) locs = locs.concat(this.prevAnchors);
		locs.push(this.destination);
		deferred.resolve(locs);
	} else if (keepAnchors && this.prevAnchors) {
		deferred.resolve(this.prevAnchors);
	} else {
		let promises = [];
		let numPoints = 3;
		let porg = { lat: slat, lon: slng };
		for (var i = 0; i < numPoints; i++) {
			let pdst = i === (numPoints - 1) ? { lat: slat, lon: slng } : this._getRandomLoc(slat, slng);
			let heading = this._calcHeading(porg, pdst);
			promises.push(contextMapping.matchMapFirst({ "latitude": porg.lat, "longitude": porg.lon, "heading": heading }));
			porg = pdst;
		}
		Q.all(promises).then((results) => {
			this.prevAnchors = _.filter(results, (loc) => { return loc; });
			deferred.resolve(this.prevAnchors);
		}).catch(function (error) {
			deferred.reject(error);
		});
	}
	return deferred.promise;
};

// reset trip route
routeGenerator.prototype._resetRoute = function (keepAnchors) {
	let slat = this.prevLoc.lat;
	let slng = this.prevLoc.lon;
	let sheading = this.prevLoc.heading;
	let loop = this.options && this.options.route_loop;

	this.routing = true;
	return Q.when(this._generateAnchors(slat, slng, sheading, keepAnchors), (locs) => {
		return Q.when(this._createRoutes(locs, loop));
	});
};

routeGenerator.prototype._createRoutes = function (locs, loop) {
	this.routing = true;
	let speed = this.prevLoc ? this.prevLoc.speed : 0;

	let route;
	if (!version.laterOrEqual("3.0") || this.getOption("avoid_events") || this.getOption("avoid_alerts")) {
		// call old type of route search
		route = this._findRouteBetweenPointsWithWaypoints(locs, loop);
	} else {
		// call cognitive route search supported by 3.0 or later
		route = this._findRouteMultiplePoints(locs, loop);
	}

	let deferred = Q.defer();
	Q.when(route, (routes) => {
		routes = _.filter(routes, (route) => { return route.route; });
		if (routes.length == 0) {
			return deferred.reject("no route found");
		}
		this.allRoutes = routes;

		let prevLoc = null;
		_.forEach(routes, (route) => {
			route.route = _.filter(route.route, function (loc) {
				let diff = !prevLoc || prevLoc.lon !== loc.lon || prevLoc.lat !== loc.lat;
				prevLoc = loc;
				return diff;
			});
		});

		this.tripRouteIndex = 0;
		routeArray = routes[0].route;
		if (routeArray.length > 0) {
			this.prevLoc = routeArray[0];
			this.prevLoc.heading = this._calcHeading(routeArray[0], routeArray[1]);
		}
		this.prevLoc.speed = speed;
		this.routing = false;
		this.eventEmitter.emit('route', { route: routes, loop: loop, current: this.prevLoc, destination: this.destination, options: this.options });

		deferred.resolve(routes);
	}).catch((error) => {
		this.routing = false;
		this.eventEmitter.emit('route', { loop: loop, current: this.prevLoc, destination: this.destination, options: this.options }, error);
		deferred.reject(error);
	});
	return deferred.promise;
};

routeGenerator.prototype._findRouteBetweenPointsWithWaypoints = function (locs, loop) {
	let routeArrays = {};

	let success = function (result) {
		routeArrays[result.id] = result.route;
		return result;
	};
	let fail = function (error) {
		return null;
	};

	let promises = []
	for (var i = 0; i < locs.length - (loop ? 0 : 1); i++) {
		let loc1 = locs[i];
		let loc2 = (i < locs.length - 1) ? locs[i + 1] : locs[0];
		let index = "index" + i;
		promises.push(Q.when(this._findRouteBetweenPoints(0, loc1, loc2, index), success, fail));
	}

	let deferred = Q.defer();
	Q.all(promises).then((routes) => {
		let routeArray = [];
		for (let i = 0; i < routes.length; i++) {
			let r = routeArrays["index" + i];
			if (!r) {
				return deferred.reject();
			} else if (r.length > 0) {
				if (!r[0])
					console.warn("wrong route was found");
				routeArray = routeArray.concat(r);
			}
		}
		deferred.resolve([{ route: routeArray }]);
	}).catch((error) => {
		deferred.reject(error);
	});
	return deferred.promise;
};

// find a route from a specific location to a specific location
routeGenerator.prototype._findRouteBetweenPoints = function (retryCount, start, end, searchId) {
	retryCount = retryCount || 0;
	let deferred = Q.defer();
	let params = {
		"orig_latitude": start.lat,
		"orig_longitude": start.lon,
		"orig_heading": start.heading || 0,
		"dest_latitude": end.lat,
		"dest_longitude": end.lon,
		"dest_heading": end.heading || 0,
		"option": this.getOption("avoid_events") ? "avoid_events" : ""
	};
	Q.when(contextMapping.routeSearch(params), (data) => {
		var routeArray = [];
		data.link_shapes.forEach((shapes) => {
			if (!shapes.shape)
				return;
			if (routeArray.length > 0) {
				// The last point in the previous shape and the first point in the next shape represent the same point.
				// Therefore, remove the last point in the previous shape before adding new shape.
				routeArray.pop();
			}
			routeArray = routeArray.concat(shapes.shape);
		});
		if (routeArray.length >= 2) {
			deferred.resolve({ id: searchId, route: routeArray });
			return;
		} else if (retryCount++ < 5) {
			// retry 5 times
			console.log("failed to search route. retry[" + retryCount + "]");
			return this._findRouteBetweenPoints(retryCount, start, end, searchId);
		}
		console.error("Cannot get route for simulation");
		deferred.reject();
	}).catch((error) => {
		console.error("Error in route search: " + error);
		deferred.reject();
	});
	return deferred.promise;
};

// find a route from a specific location to a specific location
routeGenerator.prototype._findRouteMultiplePoints = function (locs, loop) {
	let mo_id = this.getOption("target_vehicle");
	let driver_id = this.getOption("target_driver");
	let routemode = this.getOption("routemode");

	let params = { points: [], props: { get_links: true, get_linkshape: true, get_poi: true } };
	params.mo_id = mo_id || this.mo_id;
	if (driver_id) params.driver_id = driver_id;

	let addPoint = function (loc) {
		if (loc.poi_id) {
			params.points.push({ props: { poi_id: loc.poi_id } });
		} else {
			params.points.push({ latitude: loc.lat, longitude: loc.lon, heading: loc.heading });
		}
	}
	for (let i = 0; i < locs.length; i++) {
		addPoint(locs[i]);
	}
	if (loop) {
		addPoint(locs[0]);
	}

	let routeParams = [];
	routemode.split(",").forEach((mode) => {
		if (mode == "time") {
			routeParams.push({ mode: mode, params: _.extend({}, params, { route_mode: "search", props: _.extend({}, params.props, { search_mode: "time" }) }) });
		} else if (mode == "distance") {
			routeParams.push({ mode: mode, params: _.extend({}, params, { route_mode: "search", props: _.extend({}, params.props, { search_mode: "distance" }) }) });
		} else if (mode == "pattern") {
			routeParams.push({ mode: mode, params: _.extend({}, params, { route_mode: "predict", props: _.extend({}, params.props, { prediction_method: "pattern" }) }) });
		}
	});

	let deferred = Q.defer();
	let promises = routeParams.map(function (param) { return this._findRouteWithParams(param.mode, param.params); }.bind(this));
	Q.all(promises).then((routes) => {
		let referred;
		let pattern;
		_.forEach(routes, (route) => {
			if (route.mode === "pattern") {
				if (route.found) pattern = route.found;
			} else if (route.mode === "time") {
				referred = route.found;
			} else if (route.mode === "distance") {
				if (!referred) referred = route.found;
			}
		});

		let allTrips = [];
		_.forEach(routes, (route) => {
			let routeArray = [];
			let distance = 0;
			let traveltime = 0;

			// Each trip represents a route between two POIs.
			_.forEach(route.found ? route.found.trips : [], (trip, index) => {
				// There might be multiple paths for a trip. Find the best path in the triop from the paths.
				let path = this._selectRecommendedPath(trip);
				if (!path && pattern === route.found) {
					if (referred && referred.trips.length > index) {
						path = this._selectRecommendedPath(referred.trips[index]);
					} else {
						path = { links: [] };
					}
				}
				if (!path) return;

				// Collect shages in the path
				let tripArray = [];
				_.forEach(path.links, (link) => {
					if (!link.shape || link.shape.length == 0)
						return;

					if (tripArray.length > 0) {
						// The last point in the previous shape and the first point in the next shape represent the same point.
						// Therefore, remove the last point in the previous shape before adding new shape.
						tripArray.pop();
					}
					tripArray = tripArray.concat(link.shape);
				});

				// Calculate total distance and travel time
				if (path.props) {
					distance += parseFloat(path.props.travel_distance);
					traveltime += parseFloat(path.props.travel_time);
				}

				// Add destination point to the origin point to change destination
				if (tripArray.length > 0) {
					let dp = trip.destination_point;
					tripArray[0].destination = { lat: dp.latitude, lon: dp.longitude, props: dp.props };
				}
				routeArray = routeArray.concat(tripArray);
			});

			if (routeArray.length > 0) {
				allTrips.push({ mode: route.mode, route: routeArray, distance: distance, traveltime: traveltime });
			}
		});
		deferred.resolve(allTrips);
	}).catch((error) => {
		deferred.reject(error);
	});
	return deferred.promise;
};

routeGenerator.prototype._findRouteWithParams = function (mode, params) {
	let deferred = Q.defer();
	Q.when(contextMapping.findRoute(params), (data) => {
		let route = this._selectRoute(data.routes);
		if (!route || _.every(route.trips, (trip) => { return !trip.paths || trip.paths.length == 0; })) {
			return deferred.resolve({ mode: mode });
		}
		return deferred.resolve({ mode: mode, found: route });
	}).catch((error) => {
		console.error("Error in route search: " + error);
		deferred.reject();
	});
	return deferred.promise;
};

routeGenerator.prototype._selectRoute = function (routes) {
	if (!routes || routes.length == 0) {
		return;
	}
	// In CVI 3.0, only one trip exits.
	return routes[0];
};

routeGenerator.prototype._selectRecommendedPath = function (trip) {
	if (!trip.paths || trip.paths.length == 0) {
		return;
	}
	let selectedPath;
	trip.paths.forEach((path) => {
		if (!selectedPath) {
			selectedPath = path;
		} else if (path.links && path.links.length > 0) {
			if (parseInt(path.props.matched_trip_count) > parseInt(selectedPath.props.matched_trip_count)) {
				selectedPath = path;
			} else if (path.props.matched_trip_count === path.props.matched_trip_count && parseFloat(path.props.travel_time) < parseFloat(selectedPath.props.travel_time)) {
				selectedPath = path;
			}
		}
	});
	return selectedPath;
};

routeGenerator.prototype._getReferenceSpeed = function (index, speed) {
	let defReferenceSpeed = 161;
	loc = this.tripRoute[index];
	if (index === 0) {
		return defReferenceSpeed;
	} else if (!isNaN(loc.referenceSpeed)) {
		return loc.referenceSpeed;
	}

	let distance = 0;
	let p1 = loc;
	for (let i = index + 1; i < this.tripRoute.length; i++) {
		/*
			 p1 ==== p2 ---- p3
			 calculate direction of the p1-p2 path and distance between the points
		 */
		let p2 = this.tripRoute[i < this.tripRoute.length - 1 ? i : (i - this.tripRoute.length + 1)];
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
		let p3 = this.tripRoute[i < this.tripRoute.length - 2 ? (i + 1) : (i - this.tripRoute.length + 2)];
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

		let diff = Math.abs(loc.heading - p2.heading);
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

routeGenerator.prototype._getRoutePosition = function () {
	if (!this.prevLoc || !this.tripRoute || this.tripRoute.length < 2) {
		return this.prevLoc;
	}
	var prevLoc = this.prevLoc;
	var loc = this.tripRoute[this.tripRouteIndex];
	var speed = this._getDistance(loc, prevLoc) * 0.001 * 3600;
	var acceleration = this._toKilometerPerHour(this.acceleration);
	let calcSpeedResult = this._calcSpeed(speed, prevLoc.speed, acceleration);
	if (calcSpeedResult.stopAtLoc) {
		loc = this.tripRoute[this.tripRouteIndex];
	} else {
		loc = this._calcDestinationPoint(calcSpeedResult.prev_loc, this._toMeterPerSec(calcSpeedResult.accel_speed), calcSpeedResult.heading);
	}
	loc.speed = calcSpeedResult.speed;
	loc.heading = calcSpeedResult.heading;
	this.prevLoc = loc;
	if (calcSpeedResult.stopAtLoc)
		this.tripRouteIndex++;
	if (this.tripRouteIndex >= this.tripRoute.length) {
		if (this.options && this.options.route_loop) {
			this.tripRouteIndex = 0;
		} else {
			this.tripRouteIndex--;
		}
	}
	return loc;
};

routeGenerator.prototype._calcHeading = function (p1, p2) {
	// this will calculate bearing
	p1lon = this._toRadians(p1.lon);
	p1lat = this._toRadians(p1.lat);
	p2lon = this._toRadians(p2.lon);
	p2lat = this._toRadians(p2.lat);
	var y = Math.sin(p2lon - p1lon) * Math.cos(p2lat);
	var x = Math.cos(p1lat) * Math.sin(p2lat) -
		Math.sin(p1lat) * Math.cos(p2lat) * Math.cos(p2lon - p1lon);
	var brng = Math.atan2(y, x);
	return (this._toDegree(brng) + 360) % 360;
}

/*
 * Calculate distance in meters between two points on the globe
 * - p0, p1: points in {latitude: [lat in degree], longitude: [lng in degree]}
 */
routeGenerator.prototype._getDistance = function (p0, p1) {
	if (!p0 || !p1)
		return 0;
	let latrad0 = this._toRadians(p0.lat);
	let lngrad0 = this._toRadians(p0.lon);
	let latrad1 = this._toRadians(p1.lat);
	let lngrad1 = this._toRadians(p1.lon);
	let norm_dist = Math.acos(Math.sin(latrad0) * Math.sin(latrad1) + Math.cos(latrad0) * Math.cos(latrad1) * Math.cos(lngrad1 - lngrad0));

	// Earths radius in meters via WGS 84 model.
	let earth = 6378137;
	return earth * norm_dist;
};

/*
 * Calculate destination point from starting point and distance and heading(bearing) angle
 * - p: starting point in {latitude: [lat in degree], longitude: [lng in degree]}
 * - d: distance in meter
 * - h: heading direction(bearing) in degree
 */
routeGenerator.prototype._calcDestinationPoint = function (startPoint, distance, bearing) {
	// Earths radius in meters via WGS 84 model.
	let earth = 6378137;
	// Angular distance: sigma = distance / (earth_radius)
	let sigma = distance / earth;
	let s_lat_rad = this._toRadians(startPoint.lat);
	let s_lon_rad = this._toRadians(startPoint.lon);
	let bearing_rad = this._toRadians(bearing)
	let dest_lat_rad = Math.asin(Math.sin(s_lat_rad) * Math.cos(sigma) +
		Math.cos(s_lat_rad) * Math.sin(sigma) * Math.cos(bearing_rad));
	let dest_lon_rad = s_lon_rad + Math.atan2(Math.sin(bearing_rad) * Math.sin(sigma) * Math.cos(s_lat_rad),
		Math.cos(sigma) - Math.sin(s_lat_rad) * Math.sin(dest_lat_rad));
	let dest_lat_deg = this._toDegree(dest_lat_rad)
	let dest_lon_deg = this._toDegree(dest_lon_rad)
	return { lat: dest_lat_deg, lon: dest_lon_deg };
};

routeGenerator.prototype._calcSpeed = function (speed, prevLocSpeed, acceleration) {
	const MAX_SPEED_CAP = 161; 	// maximum speed cap is 161 km/h (about 100 MPH)
	const MIN_SPEED_CAP = 8; 	// minimum speed cap is 8 km/h (about 5 MPH)
	var accel_speed;

	let stopAtLoc = false;
	let prev_loc = this.prevLoc;
	let cur_loc = this.tripRoute[this.tripRouteIndex];
	let heading = this._calcHeading(prev_loc, cur_loc);

	if (acceleration !== 0) {
		// acceleration is set from simulation UI
		accel_speed = prevLocSpeed + acceleration;
		if (accel_speed > MAX_SPEED_CAP) {
			accel_speed = MAX_SPEED_CAP;
		}
		if (accel_speed < MIN_SPEED_CAP) {
			accel_speed = MIN_SPEED_CAP;
		}
		let can_speed = speed;
		speed = accel_speed;
		let sum_speed = 0;
		while (can_speed < accel_speed && prev_loc) {
			sum_speed += can_speed;
			let nextIndex = this.tripRouteIndex + 1;
			if (this.tripRouteIndex >= this.tripRoute.length - 1) {
				if (this.options && this.options.route_loop) {
					nextIndex = 0;
				} else {
					accel_speed = can_speed;
					speed = sum_speed;
					stopAtLoc = true;
					break;
				}
			}

			let next_loc = this.tripRoute[nextIndex];
			let cur_heading = this._calcHeading(cur_loc, next_loc);
			let diff_heading = Math.abs(cur_heading - heading);
			if (diff_heading > 2) {
				accel_speed = can_speed;
				speed = sum_speed;
				stopAtLoc = true;
				break;
			}
			accel_speed -= can_speed;
			can_speed = this._getDistance(next_loc, cur_loc) * 0.001 * 3600;
			this.tripRouteIndex = nextIndex;

			prev_loc = cur_loc;
			heading = cur_heading;
			cur_loc = next_loc;
		}
	} else {
		// acceleration is set to 0, use random value instead
		let referenceSpeed = this._getReferenceSpeed(this.tripRouteIndex, speed);
		if (referenceSpeed === 0) {
			console.log("Reference speed is zero!");
		}
		let rand_acceleration = Math.floor(Math.random() * 10 + 10);
		stopAtLoc = true;
		while (speed > referenceSpeed || (speed - prevLocSpeed) > rand_acceleration) {
			// too harsh acceleration, then insert intermediate point
			speed = speed / 2.0;
			stopAtLoc = false;
		}
		accel_speed = speed;
	}
	return { accel_speed: accel_speed, speed: speed, heading: heading, prev_loc: prev_loc, stopAtLoc: stopAtLoc };
};

routeGenerator.prototype._toRadians = function (n) {
	return n * (Math.PI / 180);
};

routeGenerator.prototype._toDegree = function (n) {
	return n * (180 / Math.PI);
};

routeGenerator.prototype._toKilometerPerHour = function (n) {
	return n * (0.001 * 3600);
};

routeGenerator.prototype._toMeterPerSec = function (n) {
	return n / (0.001 * 3600);
};

module.exports = routeGenerator;
