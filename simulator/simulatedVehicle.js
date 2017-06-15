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
var fs = require('fs');
var moment = require("moment");
var Chance = require('chance');
var routeGenerator = require('./routeGenerator.js');

var debug = require('debug')('simulatedVehicle');
debug.log = console.log.bind(console);

// Vehicle state
var VEHICLE_STATE_STOP = 'stop';
var VEHICLE_STATE_SEARCH = 'routing';
var VEHICLE_STATE_IDLE = 'idling';
var VEHICLE_STATE_DRIVE = 'driving';

/**
 * Constructor
 * 
 * @param vehicle vehicle object for this simulated vehicle
 * @param driver driver assigned to this vehicle
 * @param callback callback method to get information (e.g. probe, route) from this simulated vehicle
 */
function simulatedVehicle(vehicle, driver, callback) {
	this.vehicle = vehicle;
	this.driver = driver;
	this._waitingForRoute = [];
	this.route = new routeGenerator();
	this.loadProperties();
	this.setupCallback(callback);
}

/**
 * Start running
 */
simulatedVehicle.prototype.start = function(parameters) {
	if (this.route.driving) {
		if (parameters.succesWhenAlready) {
			return Q({tripId: this.trip_id, state: this._getState()});
		}
		console.warn("vehicle is already running. mo_id=" + this.vehicle.mo_id);
		return this.trip_id;
	}
	this.trip_id = new Chance().hash({length: 20});
	this.route.start(parameters && parameters.interval);
	console.log("vehicle is started. mo_id=" + this.vehicle.mo_id);
	return Q({tripId: this.trip_id, state: this._getState()});
};

/**
 * Check if the vehicle is running or not
 */
simulatedVehicle.prototype.isRunning = function() {
	return this.route.driving;
};

/**
 * Stop running
 */
simulatedVehicle.prototype.stop = function(parameters) {
	if (!this.route.driving) {
		if (parameters.succesWhenAlready) {
			return Q({tripId: this.trip_id, state: this._getState()});
		}
		return Q.reject("vehicle is not running. mo_id=" + this.vehicle.mo_id);
	}
	var trip_id = this.trip_id;
	this.route.stop();
	delete this.trip_id;
	console.log("vehicle is stopped. mo_id=" + this.vehicle.mo_id);
	return Q({tripId: trip_id, state: this._getState()});
};

/**
 * Set up callback to give information to client
 */
simulatedVehicle.prototype.setupCallback = function(callback) {
	if (!_.isFunction(callback)) {
		this.route.listen(null);
		console.warn("callback is not specified. mo_id=" + this.vehicle.mo_id);
		return;
	}

	var vehicleId = this.vehicle.mo_id;
	var mo_id = this.vehicle.mo_id;
	if(this.vehicle.siteid){
		mo_id = this.vehicle.siteid + ":" + mo_id;
	}
	var driver_id = this.driver ? this.driver.driver_id : null;
	var self = this;
	var handlers = {
		position: function(data, error) {
			var ts = Date.now();
			var probe = {
					ts: ts,
					timestamp: moment(ts).format('YYYY-MM-DDTHH:mm:ss.SSSZ'), // ISO8601
					trip_id: self.trip_id,
					speed: data.speed || 0,
					mo_id: mo_id,
					driver_id: driver_id,
					longitude: data.longitude,
					latitude: data.latitude,
					heading: data.heading || 0
			};
			if(self.prevProps) {
				var props = _.clone(self.prevProps);
				_.each(props, function(value, key) {
					if (self.fixedProps[key] === undefined) {
						if (self.propProviders[key] !== undefined) {
							props[key] = self.propProviders[key].updateValue(props[key]);
						}
					} else {
						props[key] = self.fixedProps[key];
					}
				});
				self.prevProps = probe.props = props;
			}
			callback({vehicleId: vehicleId, data: probe, type: 'probe'});
			return true;
		},
		route: function(data, error) {
			var list = this._waitingForRoute;
			this._waitingForRoute = [];
			
			_.each(list, function(obj) {
				obj.func.call(this, data.route, error, obj.param);
			}.bind(this));
		},
		state: function(data, error) {
			callback({vehicleId: vehicleId, data: self._getState(), type: 'state'});
			return true;
		}
	};

	this.route.listen(function(data) {
		var handler = handlers[data.type];
		if (!_.isFunction(handler) || !handler.call(self, data.data, data.error)) {
			data.vehicleId = vehicleId;
			callback(data);
		}
	});
};

/**
 * Load property handlers of this vehicle from props folder. One java script file corresponds to one property.
 */
simulatedVehicle.prototype.loadProperties = function() {
	this.fixedProps = {};
	this.prevProps = {};
	this.propProviders = {};

	// load properties
	var self = this;
	var folder = __dirname + '/props';
	fs.readdir(folder, function(err, files) {
	    if (err) {
	    	return;
	    }
	    _.each(_.filter(files, function(file) {
	    	var filepath = folder + '/' + file;
	    	if (fs.statSync(filepath).isFile() && /.*\.js$/.test(file)) {
	    		var prop = require(filepath);
	    		var p = new prop();
	    		var name = _.isFunction(p.getName) ? p.getName() : file.substring(0, file.lastIndexOf('.js'));
	    		self.propProviders[name] = p;
	    		self.prevProps[name] = p.getValue();
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
simulatedVehicle.prototype.getVehicleInformation = function(properties) {
	var info = {};
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
		_.each(this.propProviders, function(p, key) {
			var prop = {};
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
simulatedVehicle.prototype.updateRoute = function() {
	return this.route._resetRoute();
};

/**
 * Update route according to route search options
 */
simulatedVehicle.prototype.getRouteData = function() {
	var deferred = Q.defer();
	if (this._getState() === VEHICLE_STATE_SEARCH) {
		// Return later if route being searched
		this._waitingForRoute.push({param: deferred, func: function(data, error, deferred) {
			if (error)
				deferred.reject(error);
			else
				deferred.resolve(data);
		}});
	} else {
		deferred.resolve(this.route.tripRoute);
	}
	return deferred.promise;
};

/**
 * Set current vehicle position
 */
simulatedVehicle.prototype.setCurrentPosition = function(longitude, latitude, heading, donotResetRoute) {
	return this.route.setCurrentPosition({latitude: latitude, longitude: longitude, heading: heading || 0}, donotResetRoute);
};
	
/**
 * Set destination of this vehicle
 */
simulatedVehicle.prototype.setDestination = function(longitude, latitude, heading, donotResetRoute) {
	return this.route.setDestination({latitude: latitude, longitude: longitude, heading: heading || 0}, donotResetRoute);
};
	
/**
 * Set options for route search (e.g. avoid_events, route_loop)
 */
simulatedVehicle.prototype.setRouteOptions = function(options, donotResetRoute) {
	_.each(options, function(value, key) {
		this.route.setOption(key, value);
	}.bind(this));
	return donotResetRoute ? Q() : this.updateRoute();
};

/**
 * Get options for route search
 */
simulatedVehicle.prototype.getetRouteOptions = function() {
	return this.route.options;
};

/**
 * Set property values to be added to probes. Values specified here are set to subsequent probes of 
 * this vehicle as fixed values.
 */
simulatedVehicle.prototype.setProperties = function(properties) {
	_.each(properties, function(value, key) {
		if (value === undefined) {
			delete this.fixedProps[key];
		} else {
			this.fixedProps[key] = value;
			if (this.propProviders[key] !== undefined) {
				this.propProviders[key].updateValue(value);
			}
		}
	}.bind(this));
};

/**
 * Unset property values to be added to probes. If properties values are unset, 
 * these values are calculated automaticaly by corresponding prop simulators
 */
simulatedVehicle.prototype.unsetProperties = function(properties) {
	_.each(properties, function(key) {
		delete this.fixedProps[key];
	}.bind(this));
};

/**
 * Get current vehicle state
 */
simulatedVehicle.prototype._getState = function() {
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
