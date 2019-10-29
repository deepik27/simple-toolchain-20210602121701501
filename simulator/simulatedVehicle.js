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
const fs = require('fs');
const moment = require("moment");
const Chance = require('chance');
const EventEmitter = require('events').EventEmitter;
const routeGenerator = require('./routeGenerator.js');

const debug = require('debug')('simulatedVehicle');
debug.log = console.log.bind(console);

// Vehicle state
const VEHICLE_STATE_STOP = 'stop';
const VEHICLE_STATE_SEARCH = 'routing';
const VEHICLE_STATE_IDLE = 'idling';
const VEHICLE_STATE_DRIVE = 'driving';

/**
 * Constructor
 *
 * @param vehicle vehicle object for this simulated vehicle
 * @param driver driver assigned to this vehicle
 * @param callback callback method to get information (e.g. probe, route) from this simulated vehicle
 */
function simulatedVehicle(vehicle, driver) {
	this.vehicle = vehicle;
	this.driver = driver;
	this._waitingForRoute = [];

	let mo_id = vehicle.mo_id;
	if (vehicle.siteid) {
		mo_id = vehicle.siteid + ":" + mo_id;
	}
	let driver_id = driver ? driver.driver_id : null;
	this.route = new routeGenerator(mo_id, driver_id);

	this.loadProperties();
	this.eventEmitter = new EventEmitter();
	this.setupCallback();
}

simulatedVehicle.prototype.listen = function () {
	return this.eventEmitter;
};
/**
 * Start running
 */
simulatedVehicle.prototype.start = function (parameters) {
	if (this.route.driving) {
		if (parameters.succesWhenAlready) {
			return Q({ tripId: this.trip_id, state: this._getState() });
		}
		console.warn("vehicle is already running. mo_id=" + this.vehicle.mo_id);
		return this.trip_id;
	}
	this.trip_id = new Chance().hash({ length: 20 });
	this.route.start(parameters);
	console.log("vehicle is started. mo_id=" + this.vehicle.mo_id);
	return Q({ tripId: this.trip_id, state: this._getState() });
};

/**
 * Check if the vehicle is running or not
 */
simulatedVehicle.prototype.isRunning = function () {
	return this.route.driving;
};

/**
 * Stop running
 */
simulatedVehicle.prototype.stop = function (parameters) {
	if (!this.route.driving) {
		if (parameters.succesWhenAlready) {
			return Q({ tripId: this.trip_id, state: this._getState() });
		}
		return Q.reject("vehicle is not running. mo_id=" + this.vehicle.mo_id);
	}
	let trip_id = this.trip_id;
	this.route.stop();
	delete this.trip_id;
	console.log("vehicle is stopped. mo_id=" + this.vehicle.mo_id);
	return Q({ tripId: trip_id, state: this._getState() });
};

/**
 * Set up callback to give information to client
 */
simulatedVehicle.prototype.setupCallback = function () {
	let vehicleId = this.vehicle.mo_id;
	let mo_id = this.vehicle.mo_id;
	if (this.vehicle.siteid) {
		mo_id = this.vehicle.siteid + ":" + mo_id;
	}
	let driver_id = this.driver ? this.driver.driver_id : null;

	this.route.listen().on('position', (data, error) => {
		let ts = Date.now();
		let probe = {
			ts: ts,
			timestamp: moment(ts).format('YYYY-MM-DDTHH:mm:ss.SSSZ'), // ISO8601
			trip_id: this.trip_id,
			speed: data.speed || 0,
			mo_id: mo_id,
			driver_id: driver_id,
			longitude: data.longitude,
			latitude: data.latitude,
			heading: data.heading || 0
		};
		if (this.prevProps) {
			let props = _.clone(this.prevProps);
			_.each(props, (value, key) => {
				if (this.fixedProps[key] === undefined) {
					if (this.propProviders[key] !== undefined) {
						props[key] = this.propProviders[key].updateValue(props[key]);
					}
				} else {
					props[key] = this.fixedProps[key];
				}
			});
			this.prevProps = probe.props = props;
		}
		this.eventEmitter.emit('probe', vehicleId, probe, data.destination);
	});

	this.route.listen().on('route', (data, error) => {
		let list = this._waitingForRoute;
		this._waitingForRoute = [];

		_.each(list, (obj) => {
			obj.func.call(this, data.route, error, obj.param);
		});
		this.eventEmitter.emit('route', vehicleId, data);
	});

	this.route.listen().on('state', (data, error) => {
		this.eventEmitter.emit('state', vehicleId, this._getState());
	});
};

/**
 * Load property handlers of this vehicle from props folder. One java script file corresponds to one property.
 */
simulatedVehicle.prototype.loadProperties = function () {
	this.fixedProps = {};
	this.prevProps = {};
	this.propProviders = {};

	// load properties
	let folder = __dirname + '/props';
	fs.readdir(folder, (err, files) => {
		if (err) {
			return;
		}
		_.each(_.filter(files, (file) => {
			let filepath = folder + '/' + file;
			if (fs.statSync(filepath).isFile() && /.*\.js$/.test(file)) {
				let prop = require(filepath);
				let p = new prop();
				let name = _.isFunction(p.getName) ? p.getName() : file.substring(0, file.lastIndexOf('.js'));
				this.propProviders[name] = p;
				this.prevProps[name] = p.getValue();
			}
		}));
	});
};

/**
 * Get information on this vehicle. The properties are one or more of the following values:
 *
 * vehicleId: vehicle id
 * vehicle: vehicle object to contains details
 * position: current vehicle position (longitude, latitude, heading, speed)
 * options: options for route search
 * state: state of this vehicle
 * properties: properties to be added to car probe
 */
simulatedVehicle.prototype.getVehicleInformation = function (properties) {
	let info = {};
	if (!properties || properties.length === 0 || _.contains(properties, "vehicleId")) {
		info.vehicleId = this.vehicle.mo_id;
	}
	if (!properties || properties.length === 0 || _.contains(properties, "vehicle")) {
		info.vehicle = this.vehicle;
	}
	if (!properties || properties.length === 0 || _.contains(properties, "driverId")) {
		info.driverId = this.driver && this.driver.driver_id;
	}
	if (!properties || properties.length === 0 || _.contains(properties, "driver")) {
		info.driver = this.driver;
	}
	if (!properties || properties.length === 0 || _.contains(properties, "position")) {
		info.position = this.route.getCurrentPosition();
	}
	if (!properties || properties.length === 0 || _.contains(properties, "options")) {
		info.options = this.route.options;
	}
	if (!properties || properties.length === 0 || _.contains(properties, "state")) {
		info.state = this._getState();
	}
	if (!properties || properties.length === 0 || _.contains(properties, "properties")) {
		info.properties = {};
		_.each(this.propProviders, (p, key) => {
			let prop = {};
			if (!isNaN(p.minValue)) {
				prop.minValue = p.minValue;
			}
			if (!isNaN(p.maxValue)) {
				prop.maxValue = p.maxValue;
			}
			if (p.candidates) {
				prop.candidates = p.candidates;
			}
			if (p.defaultValue) {
				prop.defaultValue = p.defaultValue;
			}
			if (p.value) {
				prop.value = p.value;
			}
			if (p.message) {
				prop.message = p.message;
			}
			if (p.valueType) {
				prop.valueType = p.valueType;
			}
			info.properties[key] = prop;
		});
	}
	return info;
};

/**
 * Update route according to route search options
 */
simulatedVehicle.prototype.updateRoute = function (keepAnchors) {
	return this.route._resetRoute(keepAnchors);
};

/**
 * Update route according to route search options
 */
simulatedVehicle.prototype.getRouteData = function () {
	let deferred = Q.defer();
	if (this._getState() === VEHICLE_STATE_SEARCH) {
		// Return later if route being searched
		this._waitingForRoute.push({
			param: deferred, func: (data, error, deferred) => {
				if (error)
					deferred.reject(error);
				else
					deferred.resolve(data);
			}
		});
	} else {
		deferred.resolve(this.route.allRoutes);
	}
	return deferred.promise;
};

/**
 * Set current vehicle position
 */
simulatedVehicle.prototype.setCurrentPosition = function (longitude, latitude, heading, donotResetRoute) {
	return this.route.setCurrentPosition({ latitude: latitude, longitude: longitude, heading: heading }, donotResetRoute);
};

/**
 * Set destination of this vehicle
 */
simulatedVehicle.prototype.setDestination = function (longitude, latitude, heading, donotResetRoute) {
	return this.route.setDestination({ latitude: latitude, longitude: longitude, heading: heading }, donotResetRoute);
};

/**
 * Set options for route search (e.g. avoid_events, route_loop)
 */
simulatedVehicle.prototype.setRouteOptions = function (options, donotResetRoute) {
	_.each(options, (value, key) => {
		this.route.setOption(key, value);
	});
	return donotResetRoute ? Q() : this.updateRoute();
};

/**
 * Get options for route search
 */
simulatedVehicle.prototype.getetRouteOptions = function () {
	return this.route.options;
};

/**
 * Set property values to be added to probes. Values specified here are set to subsequent probes of
 * this vehicle as fixed values.
 */
simulatedVehicle.prototype.setProperties = function (properties) {
	_.each(properties, (value, key) => {
		if (value === undefined) {
			delete this.fixedProps[key];
		} else {
			this.fixedProps[key] = value;
			if (this.propProviders[key] !== undefined) {
				this.propProviders[key].updateValue(value);
			}
		}
	});
};

/**
 * Unset property values to be added to probes. If properties values are unset,
 * these values are calculated automaticaly by corresponding prop simulators
 */
simulatedVehicle.prototype.unsetProperties = function (properties) {
	_.each(properties, (key) => {
		delete this.fixedProps[key];
	});
};

/**
 * Set waypoints
 */
simulatedVehicle.prototype.setWaypoints = function (waypoints) {
	return this.route.setWaypoints(waypoints);
};

/**
 * Set acceleration
 */
simulatedVehicle.prototype.setAcceleration = function (acceleration) {
	this.route.setAcceleration(acceleration);
};


/**
 * Get current vehicle state
 */
simulatedVehicle.prototype._getState = function () {
	if (this.route.driving) {
		return VEHICLE_STATE_DRIVE;
	} else if (this.route.routing) {
		return VEHICLE_STATE_SEARCH;
	} else if (this.route.tripRoute) {
		return VEHICLE_STATE_IDLE;
	}
	return VEHICLE_STATE_STOP;
};

module.exports = simulatedVehicle;
