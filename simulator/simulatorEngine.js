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
var Queue = app_module_require('utils/queue.js');
var probeInterface = app_module_require("utils/probe.js");

var debug = require('debug')('simulatorEngine');
debug.log = console.log.bind(console);

var SIMLATOR_STATUS_OPEN = 'open';
var SIMLATOR_STATUS_OPENING = 'opening';
var SIMLATOR_STATUS_CLOSING = 'closing';
var SIMLATOR_STATUS_CLOSE = 'close';

/**
 * Simulator engine class tha manages vehicles per client. 
 * 
 * @param clientId id for the simulator
 * @param timeout close when timeout occurs after the last modification
 */
function simulatorEngine(clientId, timeoutInMinutes/*minutes*/) {
	this.clientId = clientId;
	this.state = SIMLATOR_STATUS_CLOSE;
	this.creationTime = Date.now();
	this.lastModified = this.creationTime;
	this.simulatedVehicles = {};
	this.simulatedVehicleIdArray = [];
	this.setTimeout(timeoutInMinutes);
}

/**
 * Prepare simulated vehicles and a driver for this simulator
 */
simulatorEngine.prototype.open = function(numVehicles, excludes, longitude, latitude, distance) {
	if (this.state !==  SIMLATOR_STATUS_CLOSE) {
		return Q.reject({statusCode: 400, message: "The simulator status is already started. current status = " + this.status});
	}
	this.state = SIMLATOR_STATUS_OPENING;
	this.watchMap = {};
	this.longitude = longitude;
	this.latitude = latitude;
	this.distance = distance;
	
	// message handler
	var messageHandler = {
		queueMap: {},
		probe: function(vehicleId, probe, callback) {
			var queue = this.queueMap[vehicleId];
			if (!queue) {
				queue = new Queue();
				this.queueMap[vehicleId] = queue;
			}
			// serialize results of send car probe
			queue.push({
				params: probeInterface.sendCarProbe(probe),
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
	
	// Set up callback method for events from each vehicle
	var self = this;
	var callback = function(data) {
		var vehicleId = data.vehicleId;
		var watchObject = self.watchMap[vehicleId];
		var watchMethod = null;
		if (watchObject && (!watchObject.properties || _.contains(watchObject.properties, data.type))) {
			watchMethod = watchObject.callback;
		}
		var handler = messageHandler[data.type];
		if (_.isFunction(handler)) {
			if (handler.call(messageHandler, vehicleId, data.data, watchMethod)) {
				return;
			}
		}
		if (watchMethod) {
			watchMethod.call(self, data);
		}
	};

	// Prepare vehicles and a driver to run
	var promises = [];
	promises.push(Q.when(vehicleManager.getSimulatedVehicles(this.clientId, numVehicles, excludes)));
	promises.push(Q.when(vehicleManager.getSimulatorDriver()));

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
		this.updateTime();
		return this.getInformation();
	}.bind(this));		
};

/**
 * Close this simulator
 */
simulatorEngine.prototype.close = function(timeout) {
	var deferred = Q.defer();
	this.state = SIMLATOR_STATUS_CLOSING;
	Q.when(this.stop(), function() {
		this.state = SIMLATOR_STATUS_CLOSE;
		this.updateTime();
		deferred.resolve(this.getInformation());
	}.bind(this))["catch"](function(err) {
		deferred.reject(err);
	}).done(function() {
		this.state = SIMLATOR_STATUS_CLOSE;
		this.simulatedVehicles = {};
		this.simulatedVehicleIdArray = [];
		this.watchMap = {};
		if (this.callbackOnClose) {
			this.callbackOnClose(this.clientId, timeout);
		}
	}.bind(this));
	return deferred.promise;
};

simulatorEngine.prototype.isValid = function() {
	return this.state !== SIMLATOR_STATUS_CLOSING && this.state !== SIMLATOR_STATUS_CLOSE;
};

/**
 * Update base location and relocate all vehicles
 */
simulatorEngine.prototype.updateBaseLocation = function(longitude, latitude, distance) {
	this.longitude = longitude;
	this.latitude = latitude;
	this.distance = distance;

	_.each(this.simulatedVehicles, function(vehicle, id) {
		// Calculate location and heading randomly and set them to each vehicle
		var loc = this._calcPosition([longitude, latitude], distance * Math.random(), 360 * Math.random());
		console.log("simulated vehicle=" + id + ", lon=" + loc[0] + ", lat=" + loc[1]);
		vehicle.setCurrentPosition(loc[0], loc[1], 360 * Math.random());
	}.bind(this));
	this.updateTime();
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
 *              comma separated combination of these values (vehicleId, vehicle, driverId, driver, state, position, options, properties) can be specified
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
 * Get route data
 */
simulatorEngine.prototype.getRouteData = function(vehicleId) {
	var simulatedVehicle = this.simulatedVehicles[vehicleId];
	if (!simulatedVehicle) {
		return Q.reject({statusCode: 404, message: "No vehicle was found."});
	}
	return simulatedVehicle.getRouteData();
};

/**
 * Start a vehicle/vehicles
 */
simulatorEngine.prototype.start = function(vehicleId, parameters) {
	return this.control(vehicleId, function(vehicle, id) {
		return Q.when(iotaAsset.updateVehicle(id, {"status": "active"}), function() {
			return Q(vehicle.start(parameters));
		});
	}, false, true);
};

/**
 * Stop a vehicle/vehicles
 */
simulatorEngine.prototype.stop = function(vehicleId, parameters) {
	return this.control(vehicleId, function(vehicle, id) {
		return Q.when(vehicle.stop(parameters), function(result) {
			var deferred = Q.defer();
			Q.when(iotaAsset.updateVehicle(id, {"status": "inactive"}), function() {
			})["catch"](function(err) {
				console.error(err);
			}).done(function() {
				// return success event when disabling vehicle status
				deferred.resolve(result);
			});
			return deferred.promise;
		});
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
		return vehicle.unsetProperties(properties);
	}, true, true);
};

/**
 * Set vehicle position
 */
simulatorEngine.prototype.setPosition = function(vehicleId, position) {
	return this.control(vehicleId, function(vehicle) {
		return vehicle.setCurrentPosition(position.longitude, position.latitude, position.heading, position.doNotResetRoute);
	}, false, true);
};

/**
 * Set route options (origin, destination, options)
 */
simulatorEngine.prototype.setRouteOptions = function(vehicleId, options) {
	return this.control(vehicleId, function(vehicle) {
		if (options.options) {
			vehicle.setRouteOptions(options.options, true);
		}
		if (options.origin) {
			vehicle.setCurrentPosition(options.origin.longitude, options.origin.latitude, options.origin.heading, true);
		}
		if (options.destination) {
			vehicle.setDestination(options.destination.longitude, options.destination.latitude, options.destination.heading, true);
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
		promises.push(Q.when(method(vehicle, vehicleId), function(result) {
			return {vehicleId: vehicleId, result: result};
		}));
	} else {
		promises = _.filter(_.map(this.simulatedVehicles, function(vehicle, id) {
			var isRunning = vehicle.isRunning();
			if ((allowedWhenRunning && isRunning) || (allowedWhenStopping && !isRunning)) {
				return Q.when(method(vehicle, id), function(result) {
					return {vehicleId: id, result: result};
				});
			}
		}), function(p) { return !!p; });
	}

	return Q.all(promises).then(function(results) {
		this.updateTime();
		var data = {};
		_.each(results, function(v) {data[v.vehicleId] = v.result;});
		return {numVehicles: results.length, data: data};
	}.bind(this));
};

simulatorEngine.prototype.watch = function(vehicleId, properties, callback) {
	if (vehicleId) {
		if (_.isFunction(callback)) {
			this.watchMap[vehicleId] = {properties: properties, callback: callback};
		} else {
			delete this.watchMap[vehicleId];
		}
	} else {
		_.each(this.simulatedVehicles, function(vehicle, id) {
			if (_.isFunction(callback)) {
				this.watchMap[vehicleId] = {properties: properties, callback: callback};
			} else {
				delete this.watchMap[vehicleId];
			}
		});
	}
};

simulatorEngine.prototype.setCallbackOnClose = function(callback) {
	this.callbackOnClose = callback;
};

simulatorEngine.prototype.setTimeout = function(timeoutInMinutes) {
	if (timeoutInMinutes > 0)
		this.timeout = timeoutInMinutes * 60 * 1000;
	else
		this.timeout = -1;
};

/**
 * Update modified time. Reset a timer to handle timeout. If timeout happens, the simulator is automatically stopped.
 */
simulatorEngine.prototype.updateTime = function(notModified) {
	var currentTime = Date.now();
	if (!notModified) {
		this.lastModified = currentTime;
	}
	console.log("time is updated. clientId=" + this.clientId + ", time=" + moment(currentTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ'));
	if (this.timeoutObject) {
		clearTimeout(this.timeoutObject);
		delete this.timeoutObject;
	}
	if (this.timeout > 0 && this.isValid()) {
		this.timeoutObject = setTimeout(function() {
			console.log("simulator is automatically closed due to timeout.");
			this.close(true);
		}.bind(this), this.timeout);
		console.log("timer is reset. clientId=" + this.clientId + ", timeout=" + moment(currentTime + this.timeout).format('YYYY-MM-DDTHH:mm:ss.SSSZ'));
		return Q({timeout: currentTime + this.timeout});
	}
	return Q({timeout: 0});
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
