/**
 * Copyright 2017,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const Q = require('q');
const _ = require('underscore');
const moment = require("moment");
const Chance = require('chance');
const chance = new Chance();
const vehicleManager = require('./vehicleManager.js');
const simulatedVehicle = require('./simulatedVehicle.js');
const asset = app_module_require("cvi-node-lib").asset;
const Queue = app_module_require('utils/queue.js');
const vehicleDataHub = app_module_require('cvi-node-lib').vehicleDataHub;
const driverBehavior = app_module_require('cvi-node-lib').driverBehavior;
const driverInsightsAlert = require('../driverInsights/fleetalert.js');
const version = app_module_require('utils/version.js');

const debug = require('debug')('simulatorEngine');
debug.log = console.log.bind(console);

const SIMLATOR_STATUS_OPEN = 'open';
const SIMLATOR_STATUS_OPENING = 'opening';
const SIMLATOR_STATUS_CLOSING = 'closing';
const SIMLATOR_STATUS_CLOSE = 'close';

const DATETIME_FORMAT = "YYYY-MM-DDTHH:mm:ss.SSS";
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
simulatorEngine.prototype.open = function (numVehicles, perferrd, excludes, longitude, latitude, distance) {
	if (this.state !== SIMLATOR_STATUS_CLOSE) {
		return Q.reject({ statusCode: 400, message: "The simulator status is already started. current status = " + this.state });
	}
	this.state = SIMLATOR_STATUS_OPENING;
	this.watchMap = {};
	this.longitude = longitude;
	this.latitude = latitude;
	this.distance = distance;

	// message handler
	this.messageHandler = {
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

					// Add alerts to probes
					var mo_ids = [probe.mo_id];
					driverInsightsAlert.getAlertsForVehicles(mo_ids, /*includeClosed*/false, 10).then((result) => {
						if (result.alerts) { // list of alerts
							var alertCounts = _.countBy(result.alerts, (alert) => {
								return alert.severity;
							});
							alertCounts.items = result.alerts; // details if needed

							// calculate summary
							var alertsByType = _.groupBy(result.alerts, (alert) => { return alert.type; });
							// severity: High: 100, Medium: 10, Low: 1, None: 0 for now
							var severityByType = _.mapObject(alertsByType, (alerts, type) => {
								if (alerts && alerts.length === 0) return undefined;
								return _.max(alerts, (alert) => {
									var s = alerts.severity && alerts.severity.toLowerCase();
									return s === 'high' ? 100 : (s === 'medium' ? 10 : (s === 'low' ? 1 : 0));
								}).severity;
							});
							alertCounts.byType = severityByType;
							//
							probe.info = _.extend(probe.info || {}, { alerts: alertCounts }); // inject alert counts
						}
					}).catch((error) => {
						console.error(error);
					}).done(() => {
						callback({ vehicleId: vehicleId, data: probe, type: 'probe' });
					});
				},
				error: function (err) {
					if (callback)
						callback({ vehicleId: vehicleId, data: data.probe, type: 'probe', error: err });
				}
			});

			if (data.destination) {
				queue.push({
					params: asset.updateVehicle(vehicleId, { properties: { dest_lon: data.destination.lon, dest_lat: data.destination.lat } }),
					run: function (promise) {
						return promise;
					}
				});
			}
			return true;
		},
		route: function (vehicleId, data, callbback) {
			let queue = this.queueMap[vehicleId];
			if (queue) {
				queue.push({
					params: asset.updateVehicle(vehicleId, { properties: { dest_lon: undefined, dest_lat: undefined } }),
					run: function (promise) {
						return promise;
					}
				});
			} else {
				asset.updateVehicle(vehicleId, { properties: { dest_lon: undefined, dest_lat: undefined } });
			}
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
	this.callback = (type, vehicleId, data) => {
		let watchObject = this.watchMap[vehicleId];
		let watchMethod = null;
		if (watchObject && (!watchObject.properties || _.contains(watchObject.properties, type))) {
			watchMethod = watchObject.callback;
		}
		let handler = this.messageHandler[type];
		if (_.isFunction(handler)) {
			if (handler.call(this.messageHandler, vehicleId, data, watchMethod)) {
				return;
			}
		}
		if (watchMethod) {
			watchMethod.call(this, { type: type, vehicleId, vehicleId, data: data });
		}
	};

	// Prepare vehicles and a driver to run
	let promises = [];
	promises.push(Q.when(vehicleManager.getSimulatedVehicles(this.clientId, numVehicles, perferrd, excludes)));
	promises.push(Q.when(vehicleManager.getSimulatorDriver()));

	// Create simulated vehicles
	this.simulatedVehicles = {};
	let deferred = Q.defer();
	Q.all(promises).then((result) => {
		Q.when(this.addVehicles(result[0].data, result[1], longitude, latitude, distance)).catch(error => {
			// Error occurs when no trip for specified vehicle was found
			// console.error(JSON.stringify(error));
		}).done((vehicles) => {
			this.simulatedVehicles = vehicles;
			this.simulatedVehicleIdArray = _.keys(this.simulatedVehicles);
			this.state = SIMLATOR_STATUS_OPEN;
			this.updateTime();
			deferred.resolve(this.getInformation());
		});
	}).catch((error) => {
		deferred.reject(error);
	});
	return deferred.promise;
};

simulatorEngine.prototype.addVehicles = function (data, driver, longitude, latitude, distance) {
	let vehicles = {};
	let totime = moment().utc().format(DATETIME_FORMAT) + 'Z';
	let fromtime = moment().utc().subtract(MODEL_MONTH, "months").format(DATETIME_FORMAT) + 'Z';
	
	let promises = _.map(data, (vehicle) => {
		let v = vehicles[vehicle.mo_id] = new simulatedVehicle(vehicle, driver);

		// start listening events from the vehicle
		v.listen().on('probe', (vid, probe, destination) => {
			this.callback('probe', vid, { probe: probe, destination: destination });
		});
		v.listen().on('route', (vid, route) => {
			this.callback('route', vid, route);
		});
		v.listen().on('state', (vid, state) => {
			this.callback('state', vid, state);
		});

		// Calculate location and heading randomly and set them to each vehicle
		let loc = this._calcPosition([longitude, latitude], distance * chance.floating({min: 0, max: 1}), 360 * chance.floating({min: 0, max: 1}));
		console.log("simulated vehicle=" + vehicle.mo_id + ", lon=" + loc[0] + ", lat=" + loc[1]);
		v.setCurrentPosition(loc[0], loc[1], 360 * chance.floating({min: 0, max: 1}));

		if (!version.laterOrEqual("3.0")) {
			return Q(vehicles);
		}
		// Generate MPP/DP model for trajectory pattern-based route search
		return Q(driverBehavior.deletePredictionCache()).done(() => {
			driverBehavior.generateMPPDPModel({ mo_id: vehicle.siteid + ':' + vehicle.mo_id, from: fromtime, to: totime, time_zone: 'Z' }).catch(error => {
				let message;
				if (error && error.response) {
					message = error.response.data || error.response.message;
				} else {
					message = error && error.message;
				}
				message = message || "unknown error occurred.";
				message += ": mo_id=" + vehicle.siteid + ':' + vehicle.mo_id + ", from=" + fromtime + ", to=" + totime;
				console.error(message);
			});
		});
	});
	return Q.all(promises).then(() => vehicles);
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
	}).catch((err) => {
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
simulatorEngine.prototype.updateVehicles = function (preferred, excludes, longitude, latitude, distance, timeoutInMinutes) {
	this.longitude = longitude;
	this.latitude = latitude;
	this.distance = distance;

	let current = _.keys(this.simulatedVehicles);

	// Remove unused
	let toRemove = _.difference(current, preferred);
	let removedVehicles = _.filter(this.simulatedVehicles, (vehicle, id) => _.contains(toRemove, id));
	_.each(removedVehicles, (vehicle) => {
		vehicle.stop({succesWhenAlready: true});
		delete this.simulatedVehicles[vehicle.vehicle.mo_id];
		this.simulatedVehicleIdArray = _.filter(this.simulatedVehicleIdArray, (id) => id != vehicle.vehicle.mo_id);
	});

	let deferred = Q.defer();

	// Add preferred
	let toAdd = _.difference(preferred, current);
	if (toAdd.length == 0) {
		this.setTimeout(timeoutInMinutes);
		this.updateTime();
		deferred.resolve(this.getInformation());
	} else {
		excludes = _.union(toRemove, excludes);

		// Prepare vehicles and a driver to run
		let promises = [];
		promises.push(Q.when(vehicleManager.getSimulatedVehicles(this.clientId, toAdd.length, toAdd, excludes)));
		promises.push(Q.when(vehicleManager.getSimulatorDriver()));
	
		// Create simulated vehicles
		Q.all(promises).then((result) => {
			Q.when(this.addVehicles(result[0].data, result[1], longitude, latitude, distance)).catch(error => {
				// Error occurs when no trip for specified vehicle was found
				// console.error(JSON.stringify(error));
			}).done((vehicles) => {
				this.simulatedVehicles = Object.assign(this.simulatedVehicles, vehicles);
				this.simulatedVehicleIdArray = _.keys(this.simulatedVehicles);
				this.setTimeout(timeoutInMinutes);
				this.updateTime();
				deferred.resolve(this.getInformation());
			});
		}).catch((error) => {
			deferred.reject(error);
		});
	}
	return deferred.promise;
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
		let loc = this._calcPosition([longitude, latitude], distance * chance.floating({min: 0, max: 1}), 360 * chance.floating({min: 0, max: 1}));
		console.log("simulated vehicle=" + id + ", lon=" + loc[0] + ", lat=" + loc[1]);
		vehicle.setCurrentPosition(loc[0], loc[1], 360 * chance.floating({min: 0, max: 1}));
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
		if (simulatedVehicle) {
			vehicleList.push(simulatedVehicle.getVehicleInformation(properties));
		}
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
		}), (p) => { return !!p; });
	}

	return Q.all(promises).then((results) => {
		this.updateTime();
		let data = {};
		_.each(results, (v) => { data[v.vehicleId] = v.result; });
		return { numVehicles: results.length, data: data };
	});
};

simulatorEngine.prototype.watchStatus = function (vehicleId, properties, callback) {
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
