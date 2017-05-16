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
var moment = require("moment");
var routeGenerator = require('./routeGenerator.js');
var vehicleManager = require('./vehicleManager.js');
var simulatedVehicle = require('./simulatedVehicle.js');
var iotaAsset = app_module_require('iot4a-api/asset.js');
var vehicleEventHandler = require('./vehicleEventHandler.js');

var debug = require('debug')('simulatorEngine');
debug.log = console.log.bind(console);

var SIMLATOR_STATUS_OPEN = 'open';
var SIMLATOR_STATUS_OPENING = 'opening';
var SIMLATOR_STATUS_CLOSING = 'closing';
var SIMLATOR_STATUS_CLOSE = 'close';

function simulatorEngine(clientId, timeout/*hour*/) {
	this.clientId = clientId;
	this.state = SIMLATOR_STATUS_CLOSE;
	this.creationTime = Date.now();
	this.lastModified = this.creationTime;
	this.simulatedVehicles = {};
	this.simulatedVehicleIdArray = [];
	if (timeout > 0)
		this.timeout = timeout * 60 * 60 * 1000;
	else
		this.timeout = -1;
}

/**
 * Prepare simulated vehicles and a driver for this simulator
 */
simulatorEngine.prototype.open = function(numVehicles, excludes, longitude, latitude, distance) {
	if (this.state !==  SIMLATOR_STATUS_CLOSE) {
		Q.reject({statusCode: 400, message: "The simulator status is already started. current status = " + this.status});
	}
	this.state = SIMLATOR_STATUS_OPENING;
	this.watchMap = {};
	this.longitude = longitude;
	this.latitude = latitude;
	this.distance = distance;
	
	// Prepare vehicles and a driver to run
	var promises = [];
	promises.push(Q.when(vehicleManager.getSimulatedVehicles(this.clientId, numVehicles, excludes)));
	promises.push(Q.when(vehicleManager.getSimulatorDriver()));

	// Set up callback method for events from each vehicle
	var self = this;
	var callback = function(data) {
		var vehicleId = data.vehicleId;
		var handler = vehicleEventHandler[data.type];
		if (_.isFunction(handler)) {
			handler.call(vehicleEventHandler, vehicleId, data.data, self.watchMap[vehicleId]);
		} else {
			var callback = self.watchMap[vehicleId];
			if (callback) {
				callback(data);
			}
		}
	};

	// Create simulated vehicles
	this.simulatedVehicles = {};
	return Q.all(promises).then(function(result) {
		var vehicles = {};
		var vehicleIdArray = [];
		_.each(result[0].data, function(vehicle) {
			var v = vehicles[vehicle.mo_id] = new simulatedVehicle(vehicle, result[1], callback);
			vehicleIdArray.push(vehicle.mo_id);

			// Calculate location and heading randomly and set them to each vehicle
			var loc = this._calcPosition([longitude, latitude], distance * Math.random(), 360 * Math.random());
			console.log("simulated vehicle=" + vehicle.mo_id + ", lon=" + loc[0] + ", lat=" + loc[1]);
			v.setCurrentPosition(loc[0], loc[1], 360 * Math.random());
		}.bind(this));
		this.simulatedVehicles = vehicles;
		this.simulatedVehicleIdArray = vehicleIdArray;
		this.state = SIMLATOR_STATUS_OPEN;
		this._updateTime();
		return this.getInformation();
	}.bind(this));		
};

/**
 * Close this simulator
 */
simulatorEngine.prototype.close = function() {
	var deferred = Q.defer();
	this.state = SIMLATOR_STATUS_CLOSING;
	Q.when(this.stop(), function() {
		this.state = SIMLATOR_STATUS_CLOSE;
		this._updateTime();
		deferred.resolve(this.getInformation());
	}.bind(this))["catch"](function(err) {
		deferred.reject(err);
	}).done(function() {
		this.state = SIMLATOR_STATUS_CLOSE;
		this.simulatedVehicles = {};
		this.simulatedVehicleIdArray = [];
		this.watchMap = {};
	}.bind(this));
	return deferred.promise;
};

simulatorEngine.prototype.isValid = function() {
	return this.state !== SIMLATOR_STATUS_CLOSING && this.state !== SIMLATOR_STATUS_CLOSE;
};

/**
 * Get simulator information (number of vehicles, state, creationTime, lastModified)
 * state is one of the following values:
 * 	- open : the simulator is ready to start
 *  - opening : the simulator is preparing vehicles and a driver
 *  - closing : the simulator is closing
 *  - close : the simulator is closed
 */
simulatorEngine.prototype.getInformation = function() {
	return {numVehicles: this.simulatedVehicleIdArray.length, state: this.state, 
		creationTime: this.creationTime, lastModified: this.lastModified,
		latitude: this.latitude, longitude: this.longitude, distance: this.distance};
};

/**
 * Get vehicle list managed by this simulator
 * numInPages : how many vehicles are returned at this request
 * pageIndex : index of page to be returned
 * properties : information contained in the vehicle information. 
 *              comma separated combination of these values (vehicleId, vehicle, state, position, options) can be specified
 */
simulatorEngine.prototype.getVehicleList = function(numInPages, pageIndex, properties) {
	if (!numInPages || numInPages < 1) {
		numInPages = this.simulatedVehicleIdArray.length;
		pageIndex = 0;
	} else if (!pageIndex) {
		pageIndex = 0;
	}
	
	var startIndex = numInPages * pageIndex;
	var endIndex = startIndex + numInPages;
	if (endIndex > this.simulatedVehicleIdArray.length) {
		endIndex = this.simulatedVehicleIdArray.length;
	}
	
	var vehicleList = [];
	for (var i = startIndex; i < endIndex; i++) {
		var vehicleId = this.simulatedVehicleIdArray[i];
		var simulatedVehicle = this.simulatedVehicles[vehicleId];
		vehicleList.push(simulatedVehicle.getVehicleInformation(properties));
	}
	return vehicleList;
};

/**
 * Get vehicle information
 * vehicleId : vehicle id
 * properties : information contained in the vehicle information. 
 *              comma separated combination of these values (vehicleId, vehicle, state, position, options) can be specified
 */
simulatorEngine.prototype.getVehicleInformation = function(vehicleId, properties) {
	var simulatedVehicle = this.simulatedVehicles[vehicleId];
	if (!simulatedVehicle) {
		return null;
	}
	return simulatedVehicle.getVehicleInformation(properties);
};

/**
 * Start a vehicle/vehicles
 */
simulatorEngine.prototype.start = function(vehicleId) {
	return this.control(vehicleId, function(vehicle, id) {
		return Q.when(iotaAsset.updateVehicle(id, {"status": "active"}), function() {
			vehicle.start();
			return id;
		});
	}, false, true);
};

/**
 * Stop a vehicle/vehicles
 */
simulatorEngine.prototype.stop = function(vehicleId) {
	return this.control(vehicleId, function(vehicle, id) {
		vehicle.stop();
		return Q(iotaAsset.updateVehicle(id, {"status": "inactive"}));
	}, true, false);
};

/**
 * Set properties for a vehicle/vehicles (e.g. fuel, engineTemp)
 */
simulatorEngine.prototype.setProperties = function(vehicleId, properties) {
	return this.control(vehicleId, function(vehicle) {
		return vehicle.setProperties(properties);
	}, true, true);
};

/**
 * Unet properties for a vehicle/vehicles
 */
simulatorEngine.prototype.unsetProperties = function(vehicleId, properties) {
	return this.control(vehicleId, function(vehicle) {
		return Q(vehicle.unsetProperties(properties));
	}, true, true);
};

/**
 * Set vehicle position
 */
simulatorEngine.prototype.setPosition = function(vehicleId, position) {
	return this.control(vehicleId, function(vehicle) {
		return Q(vehicle.setCurrentPosition(position.longitude, position.langitude, position.heading));
	}, false, true);
};

/**
 * Set route options (origin, destination, options)
 */
simulatorEngine.prototype.setRouteOptions = function(vehicleId, options) {
	return this.control(vehicleId, function(vehicle) {
		if (options.options) {
			vehicle.setRouteOptions(options.options);
		}
		if (options.origin) {
			vehicle.setCurrentPosition(options.origin.longitude, options.origin.langitude, options.origin.heading, true);
		}
		if (options.destination) {
			vehicle.setDestination(options.destination.longitude, options.destination.langitude, options.destination.heading, true);
		}
		return Q(vehicle.updateRoute());
	}, false, true);
};

/**
 * Control a vehicle/vehicles.
 */
simulatorEngine.prototype.control = function(vehicleId, method, allowedWhenRunning, allowedWhenStopping) {
	var promises = [];
	if (vehicleId) {
		var vehicle = this.simulatedVehicles[vehicleId];
		if (!vehicle) {
			return Q.reject({statusCode: 404, message: "Vehicle is not found"});
		} else if (!allowedWhenRunning && vehicle.isRunning()) {
			return Q.reject({statusCode: 400, message: "Vehicle is running"});
		} else if (!allowedWhenStopping && !vehicle.isRunning()) {
			return Q.reject({statusCode: 400, message: "Vehicle is not running"});
		}
		promises.push(method(vehicle, vehicleId));
	} else {
		promises = _.filter(_.map(this.simulatedVehicles, function(vehicle, id) {
			var isRunning = vehicle.isRunning();
			if ((allowedWhenRunning && isRunning) || (allowedWhenStopping && !isRunning)) {
				return method(vehicle, id);
			}
		}), function(p) { return !!p; });
	}

	return Q.all(promises).then(function(vehicles) {
		this._updateTime();
		return {numVehicles: vehicles.length};
	}.bind(this));
};

simulatorEngine.prototype.watch = function(vehicleId, callback) {
	if (vehicleId) {
		if (_.isFunction(callback)) {
			this.watchMap[vehicleId] = callback;
		} else {
			delete this.watchMap[vehicleId];
		}
	} else {
		_.each(this.simulatedVehicles, function(vehicle, id) {
			if (_.isFunction(callback)) {
				this.watchMap[vehicleId] = callback;
			} else {
				delete this.watchMap[vehicleId];
			}
		});
	}
};

/**
 * Update modified time. Reset a timer to handle timeout. If timeout happens, the simulator is automatically stopped.
 */
simulatorEngine.prototype._updateTime = function() {
	this.lastModified = Date.now();
	console.log("time is updated. clientId=" + this.clientId + ", time=" + moment(this.lastModified).format('YYYY-MM-DDTHH:mm:ss.SSSZ'));
	if (this.timeoutObject) {
		clearTimeout(this.timeoutObject);
		delete this.timeoutObject;
	}
	if (this.timeout > 0 && this.isValid()) {
		this.timeoutObject = setTimeout(function() {
			console.log("simulator is automatically closed due to timeout.");
			this.close();
		}.bind(this), this.timeout);
		console.log("timer is reset. clientId=" + this.clientId + ", timeout=" + moment(this.lastModified + this.timeout).format('YYYY-MM-DDTHH:mm:ss.SSSZ'));
	}
};

simulatorEngine.prototype._calcPosition = function(start, distance, bearing) {
    var R = 6378e3;
    var d = distance;
    var angular_distance = d / R;
    bearing = this._toRadians(bearing);
    var s_lon = this._toRadians(start[0]);
    var s_lat = this._toRadians(start[1]);
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
};

simulatorEngine.prototype._toRadians = function(n) {
    return n * (Math.PI / 180);
};

simulatorEngine.prototype._toDegree = function(n) {
    return n * (180 / Math.PI);
};

module.exports = simulatorEngine;
