/**
 * Copyright 2016, 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
/*
 * REST apis for car devices
 */
var router = module.exports = require('express').Router();
var Q = require('q');
var _ = require('underscore');
var fs = require('fs-extra');
var moment = require("moment");
var chance = require("chance")();
var debug = require('debug')('simulator');
debug.log = console.log.bind(console);

var iot4aAsset = app_module_require('iot4a-api/asset.js');
var driverInsightsProbe = require('../../driverInsights/probe.js');

var simulatorManager = require('../../simulator/simulatorManager.js');

var authenticate = require('./auth.js').authenticate;

var request = require("request");

var _sendError = function(res, err){
	//{message: msg, error: error, response: response}
	console.error('error: ' + JSON.stringify(err));
	var response = err.response;
	var status = (response && (response.status||response.statusCode)) || 500;
	var message = err.message || (err.data && err.data.message) || err;
	return res.status(status).send(message);
};

/*
 * REST apis for fleet simulator
 */
var VENDOR_NAME = "IBM";
var NUM_OF_SIMULATOR = 5;


var deviceModelSamples; // caches the template file in memory
var deviceModelSamplesNextSampleIndex = 0;
var _getDeviceModelInfo = function(){
	var samples = deviceModelSamples;
	if (!Array.isArray(samples)){
		samples = fs.readJsonSync('_deviceModelInfoSamples.json').templates;
		if (!samples){
			console.error('Failed to load ./_deviceModelInfoSamples.json');
			samples = [];
		}
		deviceModelSamples = samples;
	}
	// randomly pick one
	if (!samples || samples.length === 0)
		return {};
	return samples[(deviceModelSamplesNextSampleIndex++) % samples.length];
};

var _deactivateFleeSimulatedVehicles = function(num){
	var deferred = Q.defer();
	debug("Try to find free active simulated cars [" + num + "]");
	Q.when(iot4aAsset.getVehicleList({"vendor": VENDOR_NAME, "status": "active"}), function(response){
		var vehicles = response.data;
		debug("Active vehicles: " + JSON.stringify(vehicles));
		var defList = [];
		for(var i=0; i<vehicles.length; i++){
			var deactivate = false;
			var mo_id = vehicles[i].mo_id;
			var last_probe_time = driverInsightsProbe.getLastProbeTime(mo_id);
			if(last_probe_time){
				var since_last_modified = moment().diff(moment(last_probe_time), "seconds");
				debug("since last modified = " + since_last_modified);
				if(since_last_modified > 600){
					deactivate = true;
				}
			}else{
				// server may have been rebooted
				deactivate = true;
			}
			if(deactivate){
				num--;
				debug("try to inactivate: " + mo_id );
				defList.push(iot4aAsset.updateVehicle(mo_id, {"status": "inactive"}));
			}
		}
		Q.all(defList).then(function(){
			deferred.resolve(num);
		});
	})["catch"](function(err){
		debug("No active free simulated cars.");
		deferred.resolve(num);
	}).done();
	return deferred.promise;
};

var _createNewSimulatedVehicles = function(num){
	debug("Simulated car will be created [" + num + "]");
	var deferred = Q.defer();
	var defList = [];
	for(var i=0; i < num; i++){
		var vehicle = {
			"vendor": VENDOR_NAME, 
			"serial_number": "s-" + chance.hash({length: 6})
		};
		vehicle.properties = _getDeviceModelInfo();
		vehicle.model = vehicle.properties.makeModel;
		defList.push(iot4aAsset.addVehicle(vehicle));
	}
	Q.all(defList).then(function(){
		debug("created " + num + " vehicles");
		deferred.resolve();
	})["catch"](function(err){
		debug("Failed to create simulated car");
		deferred.reject(err);
	}).done();
	return deferred.promise;
};

var _createSimulatedVehicles = function(res, exsiting_vehicles){
	var num = exsiting_vehicles ? (NUM_OF_SIMULATOR - exsiting_vehicles.length) : NUM_OF_SIMULATOR;
	debug("Get inactive simulated cars [" + num + "]");
	if(num === 0){
		return Q();
	}
	return Q.when(_deactivateFleeSimulatedVehicles(num)).then(function(){
		return _createNewSimulatedVehicles(num);
	});
};

var _getAvailableVehicles = function(res, exsiting_vehicles){
	Q.when(_createSimulatedVehicles(res, exsiting_vehicles))
	.then(function(){
		debug("get inactive cars again");
		return iot4aAsset.getVehicleList({"vendor": VENDOR_NAME, "status": "inactive"});
	}).then(function(response){
		debug("_getAvailableVehicles: " + response);
		res.send(response);
	})["catch"](function(err){
		debug("Failed to get simulated cars");
		_sendError(res, err);
	}).done();
};

router.get("/simulatedVehicles", authenticate, function(req, res){
	Q.when(iot4aAsset.getVendor(VENDOR_NAME), function(response){
		debug("There is vendor: " + VENDOR_NAME);
		Q.when(iot4aAsset.getVehicleList({"vendor": VENDOR_NAME, "status": "inactive"}), function(response){
			if(response && response.data && response.data.length < NUM_OF_SIMULATOR){
				// create additional vehicles
				_getAvailableVehicles(res, response.data);
			}else{
				res.send(response);
			}
		})["catch"](function(err){
			// assume vehicle is not available 
			_getAvailableVehicles(res);
		}).done();
	})["catch"](function(err){
		var status = (err.response && (err.response.status||err.response.statusCode)) || 500;
		if(status === 404){
			debug("Create a vendor for simulator");
			Q.when(iot4aAsset.addVendor({"vendor": VENDOR_NAME, "type": "Vendor", "status":"Active"}), function(response){
				debug("A vendor for simulator is created");
				_getAvailableVehicles(res);
			})["catch"](function(err){
				_sendError(res, err);
			}).done();
		}else{
			_sendError(res, err);
		}
	}).done();
});

var DRIVER_NAME = "simulated_driver";
var _createSimulatedDriver = function(res){
	var promise = iot4aAsset.addDriver({"name": DRIVER_NAME, "status":"Active"});
	Q.when(promise, function(response){
		var data = {data: [ {driver_id: response.id, name: DRIVER_NAME} ]};
		debug("Simulated driver was created");
		res.send(data);
	})["catch"](function(err){
		_sendError(res, err);
	}).done();
}
;
router.get("/simulatedDriver", authenticate, function(req, res){
	Q.when(iot4aAsset.getDriverList({"name": DRIVER_NAME}), function(response){
			res.send(response);
	})["catch"](function(err){
		// assume driver is not available 
		_createSimulatedDriver(res);
	}).done();
});

/**
 * 
 */

function handleError(res, err) {
	//{message: msg, error: error, response: response}
	console.error('error: ' + JSON.stringify(err));
	var status = (err && (err.status||err.statusCode)) || 500;
	var message = err.message || (err.data && err.data.message) || err;
	return res.status(status).send(message);
}

/**
 * Create a simulator
 * 
 * request:
 * {numVehicles, location, range} 
 * 
 * response:
 * {numVehicles, createdTime, lastModified}
 */
router.post("/simulator", authenticate, function(req, res) {
	var clientId = req.body.clientId || req.query.clientId || req.get("iota-simulator-uuid");
	var numVehicles = req.body.numVehicles;
	var latitude = req.body.latitude;
	var longitude = req.body.longitude;
	var distance = req.body.distance;
	var noErrorOnExist = req.body.noErrorOnExist;
	Q.when(simulatorManager.create(clientId, numVehicles, longitude, latitude, distance, noErrorOnExist), function(response) {
		res.send(response);
	})["catch"](function(err) {
		handleError(res, err);
	}).done();
});

/**
 * Get simulator list
 * response:
 * {[clientId, numVehicles, createdTime, lastModified]}
 */
router.get("/simulator/simulatorList", authenticate, function(req, res) {
	var clientId = req.query.clientId || req.get("iota-simulator-uuid");
	Q.when(simulatorManager.getSimulatorList(), function(response) {
		res.send(response);
	})["catch"](function(err) {
		handleError(res, err);
	}).done();
});

/**
 * Get a simulator  
 * response:
 * {clientId, numVehicles, createdTime, lastModified}
 */
router.get("/simulator", authenticate, function(req, res) {
	var clientId = req.query.clientId || req.get("iota-simulator-uuid");
	Q.when(simulatorManager.getSimulator(clientId), function(response) {
		res.send(response.getInformation());
	})["catch"](function(err) {
		handleError(res, err);
	}).done();
});

/**
 * Delete a simulator
 * 
 */
router["delete"]("/simulator", authenticate, function(req, res) {
	var clientId = req.query.clientId || req.get("iota-simulator-uuid");
	Q.when(simulatorManager.release(clientId), function(response) {
		res.send(response);
	})["catch"](function(err){
		handleError(res, err);
	}).done();
});

/**
 * Get vehicle list for a simulator
 * request:
 * {numInPage, pageIndex}
 * 
 * response:
 * [{vehicleId, vehicle, state, options, properties}]
 */
router.get("/simulator/vehicleList", authenticate, function(req, res) {
	var clientId = req.query.clientId || req.get("iota-simulator-uuid");
	var numInPages = req.query.numInPages ? parseInt(req.query.numInPages) : null;
	var pageIndex = req.query.pageIndex ? parseInt(req.query.pageIndex) : 0;
	var properties = req.query.properties ? req.query.properties.split(',') : null;
	Q.when(simulatorManager.getSimulator(clientId), function(simulator) {
		res.send({data: simulator.getVehicleList(numInPages, pageIndex, properties)});
	})["catch"](function(err) {
		handleError(res, err);
	}).done();
});

/**
 * Get vehicle details for given vehicle id
 * 
 * response:
 * {vehicleId, vehicle, state, options, properties}
 */
router.get("/simulator/vehicle/:vehicle_id", authenticate, function(req, res) {
	var clientId = req.query.clientId || req.get("iota-simulator-uuid");
	var properties = req.query.properties ? req.query.properties.split(',') : null;
	Q.when(simulatorManager.getSimulator(clientId), function(simulator) {
		var data = simulator.getVehicleInformation(req.params.vehicle_id, properties);
		if (data) {
			res.send({data: simulator.getVehicleInformation(req.params.vehicle_id, properties)});
		} else {
			handleError(res, {statusCode: 404, message: "vehicle does not exist."});
		}
	})["catch"](function(err) {
		handleError(res, err);
	}).done();
});

/**
 * Start/stop all vehicles
 */
router.put("/simulator/vehicles", authenticate, function(req, res) {
	var clientId = req.query.clientId || req.body.clientId || req.get("iota-simulator-uuid");
	var command =  req.query.command || req.body.command;
	var parameters = req.body.parameters;
	if (!command) {
		handleError(res, {statusCode: 400, message: "Command must be specified"});
	}
	
	Q.when(simulatorManager.getSimulator(clientId), function(simulator) {
		if (command === 'start') {
			Q.when(simulator.start(), function(result) { res.send(result); });
		} else if (command === 'stop') {
			Q.when(simulator.stop(), function(result) { res.send(result); });
		} else if (command === 'properties') {
			Q.when(simulator.setProperties(null, parameters), function(result) { res.send(result); });
		} else if (command === 'unsetproperties') {
			Q.when(simulator.unsetProperties(null, parameters), function(result) { res.send(result); });
		} else if (command === 'position') {
			Q.when(simulator.setProperties(null, parameters), function(result) { res.send(result); });
		} else if (command === 'route') {
			Q.when(simulator.setRouteOptions(null, parameters), function(result) { res.send(result); });
		} else {
			handleError(res, {statusCode: 400, message: "Invalid command"});
		}
	})["catch"](function(err) {
		handleError(res, err);
	}).done();
});

/**
 * Start or stop a vehicle or change route options
 */
router.put("/simulator/vehicle/:vehicle_id", authenticate, function(req, res) {
	var clientId = req.body.clientId || req.query.clientId || req.get("iota-simulator-uuid");
	var vehicleId = req.params.vehicle_id;
	var command =  req.query.command || req.body.command;
	var parameters = req.body.parameters;
	if (!command) {
		handleError(res, {statusCode: 400, message: "Command must be specified"});
	}
	
	Q.when(simulatorManager.getSimulator(clientId), function(simulator) {
		if (command === 'start') {
			Q.when(simulator.start(vehicleId), function(result) { res.send(result); });
		} else if (command === 'stop') {
			Q.when(simulator.stop(vehicleId), function(result) { res.send(result); });
		} else if (command === 'properties') {
			Q.when(simulator.setProperties(vehicleId, parameters), function(result) { res.send(result); });
		} else if (command === 'unsetproperties') {
			Q.when(simulator.unsetProperties(vehicleId, parameters), function(result) { res.send(result); });
		} else if (command === 'position') {
			Q.when(simulator.setProperties(vehicleId, parameters), function(result) { res.send(result); });
		} else if (command === 'route') {
			Q.when(simulator.setRouteOptions(vehicleId, parameters), function(result) { res.send(result); });
		} else {
			handleError(res, {statusCode: 400, message: "Invalid command"});
		}
	})["catch"](function(err) {
		handleError(res, err);
	}).done();
});

/**
 * watch vehicles
 */
router.get("/simulator/watch", authenticate, function(req, res){
	var server = req.app.server;

	// initialize WSS server
	var wssUrl = req.baseUrl + req.route.path;
	if (!req.app.server) {
		handleError(res, {statusCode: 500, message: 'failed to create WebSocketServer due to missing app.server'});
		return;
	}
	
	Q.when(simulatorManager.watch(server, wssUrl), function(response){
			res.send(response);
	})["catch"](function(err){
		handleError(res, err);
	}).done();
});
