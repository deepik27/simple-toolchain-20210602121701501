/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */

const Q = require('q');
const _ = require('underscore');
const moment = require("moment");
const vehicleManager = require('./vehicleManager.js');
const simulatedVehicle = require('./simulatedVehicle.js');
const asset = app_module_require("cvi-node-lib").asset;
const Queue = app_module_require('utils/queue.js');
const vehicleDataHub = app_module_require('cvi-node-lib').vehicleDataHub;
const driverBehavior = app_module_require('cvi-node-lib').driverBehavior;
var version = app_module_require('utils/version.js');

const debug = require('debug')('simulatorEngine');
debug.log = console.log.bind(console);

const SIMLATOR_STATUS_OPEN = 'open';
const SIMLATOR_STATUS_OPENING = 'opening';
const SIMLATOR_STATUS_CLOSING = 'closing';
const SIMLATOR_STATUS_CLOSE = 'close';

const DATETIME_FORMAT = "YYYY-MM-DDTHH:mm:SS.SSSZ";
const MODEL_MONTH = 6;

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
simulatorEngine.prototype.open = function (numVehicles, excludes, longitude, latitude, distance) {
	if (this.state !== SIMLATOR_STATUS_CLOSE) {
		return Q.reject({ statusCode: 400, message: "The simulator status is already started. current status = " + this.status });
	}
	this.state = SIMLATOR_STATUS_OPENING;
	this.watchMap = {};
	this.longitude = longitude;
	this.latitude = latitude;
	this.distance = distance;

	// message handler
	const messageHandler = {
		queueMap: {},
		probe: function (vehicleId, data, callback) {
			let queue = this.queueMap[vehicleId];
			if (!queue) {
				queue = new Queue();
				this.queueMap[vehicleId] = queue;
			}
			// serialize results of send car probe
			queue.push({
				params: vehicleDataHub.sendCarProbe(data.probe, "sync"),
				run: function (promise) {
					return promise;
				},
				done: function (message) {
					if (!callback)
						return;
					let probe = data.probe;
					let affected_events = null;
					let notified_messages = null;
					if (message) {
						affected_events = message.affectedEvents;
						notified_messages = message.notifiedMessages;
					}
					// Add notification to response
					probe.notification = {
						affected_events: affected_events || [],
						notified_messages: notified_messages || []
					};
					callback({ vehicleId: vehicleId, data: probe, type: 'probe' });
				},
				error: function (err) {
					if (callback)
						callback({ vehicleId: vehicleId, data: data.probe, type: 'probe', error: err });
				}
			});
			
			if (data.destination) {
				queue.push({
					params: asset.updateVehicle(vehicleId, {properties: {dest_lon: data.destination.lon, dest_lat: data.destination.lat}}),
					run: function (promise) {
						return promise;
					}
				});
			}
			return true;
		},
		state: function (vehicleId, state, callback) {
			if (state === 'idling') {
				let queue = this.queueMap[vehicleId];
				if (queue) {
					delete this.queueMap[vehicleId];
				}
			}
		}
	};

	// Set up callback method for events from each vehicle
	const callback = (data) => {
		let vehicleId = data.vehicleId;
		let watchObject = this.watchMap[vehicleId];
		let watchMethod = null;
		if (watchObject && (!watchObject.properties || _.contains(watchObject.properties, data.type))) {
			watchMethod = watchObject.callback;
		}
		let handler = messageHandler[data.type];
		if (_.isFunction(handler)) {
			if (handler.call(messageHandler, vehicleId, data.data, watchMethod)) {
				return;
			}
		}
		if (watchMethod) {
			watchMethod.call(this, data);
		}
	};

	// Prepare vehicles and a driver to run
	let promises = [];
	promises.push(Q.when(vehicleManager.getSimulatedVehicles(this.clientId, numVehicles, excludes)));
	promises.push(Q.when(vehicleManager.getSimulatorDriver()));

	// Create simulated vehicles
	this.simulatedVehicles = {};
	let deferred = Q.defer();
	Q.all(promises).then((result) => {
		let fromtime = moment().format(DATETIME_FORMAT);
		let totime = moment().subtract(MODEL_MONTH, "months").format(DATETIME_FORMAT);
		let vehicles = {};
		let vehicleIdArray = [];

		let models = _.map(result[0].data, (vehicle) => {
			let v = vehicles[vehicle.mo_id] = new simulatedVehicle(vehicle, result[1]);
			vehicleIdArray.push(vehicle.mo_id);

			// start listening events from the vehicle
			v.listen().on('probe', (vid, probe, destination) => {
				callback({vehicleId: vid, data: {probe: probe, desination: destination}, type: 'probe'});
			});
			v.listen().on('route', (vid, route) => {
				callback({vehicleId: vid, data: route, type: 'route'});
			});
			v.listen().on('state', (vid, state) => {
				callback({vehicleId: vid, data: state, type: 'state'});
			});

			// Calculate location and heading randomly and set them to each vehicle
			let loc = this._calcPosition([longitude, latitude], distance * Math.random(), 360 * Math.random());
			console.log("simulated vehicle=" + vehicle.mo_id + ", lon=" + loc[0] + ", lat=" + loc[1]);
			v.setCurrentPosition(loc[0], loc[1], 360 * Math.random());

			// Generate MPP/DP model for trajectory pattern-based route search
			return version.laterOrEqual("3.0") ? driverBehavior.generateMPPDPModel({mo_id: v.mo_id, from: fromtime, to: totime}) : Q();
		});

		return Q.all(models).catch(error => {
			// Error occurs when no trip for specified vehicle was found
//			console.error(JSON.stringify(error));
		}).done((result) => {
			this.simulatedVehicles = vehicles;
			this.simulatedVehicleIdArray = vehicleIdArray;
			this.state = SIMLATOR_STATUS_OPEN;
			this.updateTime();
			deferred.resolve(this.getInformation());
		});
	}).catch((error) => {
		deferred.reject(error);
	});
	return deferred.promise;
};

/**
 * Close this simulator
 */
simulatorEngine.prototype.close = function (timeout) {
	let deferred = Q.defer();
	this.state = SIMLATOR_STATUS_CLOSING;
	Q.when(this.stop(), () => {
		this.state = SIMLATOR_STATUS_CLOSE;
		this.updateTime();
		deferred.resolve(this.getInformation());
	})["catch"](function (err) {
		deferred.reject(err);
	}).done(() => {
		this.state = SIMLATOR_STATUS_CLOSE;
		this.simulatedVehicles = {};
		this.simulatedVehicleIdArray = [];
		this.watchMap = {};
		if (this.callbackOnClose) {
			this.callbackOnClose(this.clientId, timeout);
		}
	});
	return deferred.promise;
};

simulatorEngine.prototype.isValid = function () {
	return this.state !== SIMLATOR_STATUS_CLOSING && this.state !== SIMLATOR_STATUS_CLOSE;
};

/**
 * Update base location and relocate all vehicles
 */
simulatorEngine.prototype.updateBaseLocation = function (longitude, latitude, distance) {
	this.longitude = longitude;
	this.latitude = latitude;
	this.distance = distance;

	_.each(this.simulatedVehicles, (vehicle, id) => {
		// Calculate location and heading randomly and set them to each vehicle
		let loc = this._calcPosition([longitude, latitude], distance * Math.random(), 360 * Math.random());
		console.log("simulated vehicle=" + id + ", lon=" + loc[0] + ", lat=" + loc[1]);
		vehicle.setCurrentPosition(loc[0], loc[1], 360 * Math.random());
	});
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
simulatorEngine.prototype.getInformation = function () {
	return {
		numVehicles: this.simulatedVehicleIdArray.length, state: this.state,
		creationTime: this.creationTime, lastModified: this.lastModified,
		latitude: this.latitude, longitude: this.longitude, distance: this.distance
	};
};

/**
 * Get vehicle list managed by this simulator
 * numInPages : how many vehicles are returned at this request
 * pageIndex : index of page to be returned
 * properties : information contained in the vehicle information.
 *              comma separated combination of these values (vehicleId, vehicle, driverId, driver, state, position, options, properties) can be specified
 */
simulatorEngine.prototype.getVehicleList = function (numInPages, pageIndex, properties) {
	if (!numInPages || numInPages < 1) {
		numInPages = this.simulatedVehicleIdArray.length;
		pageIndex = 0;
	} else if (!pageIndex) {
		pageIndex = 0;
	}

	let startIndex = numInPages * pageIndex;
	let endIndex = startIndex + numInPages;
	if (endIndex > this.simulatedVehicleIdArray.length) {
		endIndex = this.simulatedVehicleIdArray.length;
	}

	let vehicleList = [];
	for (let i = startIndex; i < endIndex; i++) {
		let vehicleId = this.simulatedVehicleIdArray[i];
		let simulatedVehicle = this.simulatedVehicles[vehicleId];
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
simulatorEngine.prototype.getVehicleInformation = function (vehicleId, properties) {
	let simulatedVehicle = this.simulatedVehicles[vehicleId];
	if (!simulatedVehicle) {
		return null;
	}
	return simulatedVehicle.getVehicleInformation(properties);
};

/**
 * Get route data
 */
simulatorEngine.prototype.getRouteData = function (vehicleId) {
	let simulatedVehicle = this.simulatedVehicles[vehicleId];
	if (!simulatedVehicle) {
		return Q.reject({ statusCode: 404, message: "No vehicle was found." });
	}
	return simulatedVehicle.getRouteData();
};

/**
 * Start a vehicle/vehicles
 */
simulatorEngine.prototype.start = function (vehicleId, parameters) {
	return this.control(vehicleId, (vehicle, id) => {
		return Q(vehicle.start(parameters));
	}, false, true);
};

/**
 * Stop a vehicle/vehicles
 */
simulatorEngine.prototype.stop = function (vehicleId, parameters) {
	return this.control(vehicleId, (vehicle, id) => {
		return vehicle.stop(parameters);
	}, true, false);
};

/**
 * Set properties for a vehicle/vehicles (e.g. fuel, engineTemp)
 */
simulatorEngine.prototype.setProperties = function (vehicleId, properties) {
	return this.control(vehicleId, (vehicle) => {
		return vehicle.setProperties(properties);
	}, true, true);
};

/**
 * Unet properties for a vehicle/vehicles
 */
simulatorEngine.prototype.unsetProperties = function (vehicleId, properties) {
	return this.control(vehicleId, (vehicle) => {
		return vehicle.unsetProperties(properties);
	}, true, true);
};

/**
 * Set vehicle position
 */
simulatorEngine.prototype.setPosition = function (vehicleId, position) {
	return this.control(vehicleId, (vehicle) => {
		return vehicle.setCurrentPosition(position.longitude, position.latitude, position.heading, position.doNotResetRoute);
	}, false, true);
};

/**
 * Set waypoints
 */
simulatorEngine.prototype.setWaypoints = function (vehicleId, waypoints) {
	return this.control(vehicleId, (vehicle) => {
		return vehicle.setWaypoints(waypoints);
	}, true, true);
};

/**
 * Set route options (origin, destination, options)
 */
simulatorEngine.prototype.setRouteOptions = function (vehicleId, options) {
	return this.control(vehicleId, (vehicle) => {
		if (options.options) {
			vehicle.setRouteOptions(options.options, true);
		}
		if (options.origin) {
			vehicle.setCurrentPosition(options.origin.longitude, options.origin.latitude, options.origin.heading, true);
		}
		if (options.destination) {
			vehicle.setDestination(options.destination.longitude, options.destination.latitude, options.destination.heading, true);
		}
		return Q(vehicle.updateRoute(options.options && !options.origin && !options.destination));
	}, false, true);
};

/**
 * Set acceleration
 */
simulatorEngine.prototype.setAcceleration = function (vehicleId, properties) {
	return this.control(vehicleId, (vehicle) => {
		return vehicle.setAcceleration(properties);
	}, true, false);
};


/**
 * Control a vehicle/vehicles.
 */
simulatorEngine.prototype.control = function (vehicleId, method, allowedWhenRunning, allowedWhenStopping) {
	let promises = [];
	if (vehicleId) {
		let vehicle = this.simulatedVehicles[vehicleId];
		if (!vehicle) {
			return Q.reject({ statusCode: 404, message: "Vehicle is not found" });
		} else if (!allowedWhenRunning && vehicle.isRunning()) {
			return Q.reject({ statusCode: 400, message: "Vehicle is running" });
		} else if (!allowedWhenStopping && !vehicle.isRunning()) {
			return Q.reject({ statusCode: 400, message: "Vehicle is not running" });
		}
		promises.push(Q.when(method(vehicle, vehicleId), (result) => {
			return { vehicleId: vehicleId, result: result };
		}));
	} else {
		promises = _.filter(_.map(this.simulatedVehicles, (vehicle, id) => {
			let isRunning = vehicle.isRunning();
			if ((allowedWhenRunning && isRunning) || (allowedWhenStopping && !isRunning)) {
				return Q.when(method(vehicle, id), (result) => {
					return { vehicleId: id, result: result };
				});
			}
		}), function (p) { return !!p; });
	}

	return Q.all(promises).then((results) => {
		this.updateTime();
		let data = {};
		_.each(results, (v) => { data[v.vehicleId] = v.result; });
		return { numVehicles: results.length, data: data };
	});
};

simulatorEngine.prototype.watch = function (vehicleId, properties, callback) {
	if (vehicleId) {
		if (_.isFunction(callback)) {
			this.watchMap[vehicleId] = { properties: properties, callback: callback };
		} else {
			delete this.watchMap[vehicleId];
		}
	} else {
		_.each(this.simulatedVehicles, (vehicle, id) => {
			if (_.isFunction(callback)) {
				this.watchMap[vehicleId] = { properties: properties, callback: callback };
			} else {
				delete this.watchMap[vehicleId];
			}
		});
	}
};

simulatorEngine.prototype.setCallbackOnClose = function (callback) {
	this.callbackOnClose = callback;
};

simulatorEngine.prototype.setTimeout = function (timeoutInMinutes) {
	if (timeoutInMinutes > 0)
		this.timeout = timeoutInMinutes * 60 * 1000;
	else
		this.timeout = -1;
};

/**
 * Update modified time. Reset a timer to handle timeout. If timeout happens, the simulator is automatically stopped.
 */
simulatorEngine.prototype.updateTime = function (notModified) {
	let currentTime = Date.now();
	if (!notModified) {
		this.lastModified = currentTime;
	}
	console.log("time is updated. clientId=" + this.clientId + ", time=" + moment(currentTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ'));
	if (this.timeoutObject) {
		clearTimeout(this.timeoutObject);
		delete this.timeoutObject;
	}
	if (this.timeout > 0 && this.isValid()) {
		this.timeoutObject = setTimeout(() => {
			console.log("simulator is automatically closed due to timeout.");
			this.close(true);
		}, this.timeout);
		console.log("timer is reset. clientId=" + this.clientId + ", timeout=" + moment(currentTime + this.timeout).format('YYYY-MM-DDTHH:mm:ss.SSSZ'));
		return Q({ timeout: currentTime + this.timeout });
	}
	return Q({ timeout: 0 });
};

simulatorEngine.prototype._calcPosition = function (start, distance, bearing) {
	let R = 6378e3;
	let d = distance;
	let angular_distance = d / R;
	bearing = this._toRadians(bearing);
	let s_lon = this._toRadians(start[0]);
	let s_lat = this._toRadians(start[1]);
	let sin_s_lat = Math.sin(s_lat);
	let cos_s_lat = Math.cos(s_lat);
	let cos_angular_distance = Math.cos(angular_distance);
	let sin_angular_distance = Math.sin(angular_distance);
	let sin_bearing = Math.sin(bearing);
	let cos_bearing = Math.cos(bearing);
	let sin_e_lat = sin_s_lat * cos_angular_distance + cos_s_lat * sin_angular_distance * cos_bearing;

	let e_lat = this._toDegree(Math.asin(sin_e_lat));
	let e_lon = this._toDegree(s_lon + Math.atan2(sin_bearing * sin_angular_distance * cos_s_lat,
		cos_angular_distance - sin_s_lat * sin_e_lat));
	e_lon = (e_lon + 540) % 360 - 180;
	return [e_lon, e_lat];
};

simulatorEngine.prototype._toRadians = function (n) {
	return n * (Math.PI / 180);
};

simulatorEngine.prototype._toDegree = function (n) {
	return n * (180 / Math.PI);
};

module.exports = simulatorEngine;
