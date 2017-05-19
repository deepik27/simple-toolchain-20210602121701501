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
var authenticate = require('./auth.js').authenticate;
var simulatorManager = require('../../simulator/simulatorManager.js');

var debug = require('debug')('simulator');
debug.log = console.log.bind(console);


/**
 * 
 */

function handleError(res, err) {
	//{message: msg, error: error, response: response}
	console.error('error: ' + JSON.stringify(err));
	var status = (err && (err.status||err.statusCode)) || 500;
	var message = (err && (err.message||(err.data&&err.data.message)||err)) || 'Unknown error';
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
			res.send({data: data});
		} else {
			handleError(res, {statusCode: 404, message: "vehicle does not exist."});
		}
	})["catch"](function(err) {
		handleError(res, err);
	}).done();
});

/**
 * Get route of specific vehicle
 * 
 * response:
 * {vehicleId: vehicleId, data: [array of route node]}
 */
router.get("/simulator/vehicle/:vehicle_id/route", authenticate, function(req, res) {
	var clientId = req.query.clientId || req.get("iota-simulator-uuid");
	var properties = req.query.properties ? req.query.properties.split(',') : null;
	Q.when(simulatorManager.getSimulator(clientId), function(simulator) {
		Q.when(simulator.getRouteData(req.params.vehicle_id), function(data) {
			res.send({data: data});
		})["catch"](function(err) {
			handleError(res, err);
		});
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
			Q.when(simulator.start(null, parameters), function(result) { res.send(result); })["catch"](function(err) { handleError(res, err); }).done();
		} else if (command === 'stop') {
			Q.when(simulator.stop(null, parameters), function(result) { res.send(result); })["catch"](function(err) { handleError(res, err); }).done();
		} else if (command === 'properties') {
			Q.when(simulator.setProperties(null, parameters), function(result) { res.send(result); })["catch"](function(err) { handleError(res, err); }).done();
		} else if (command === 'unsetproperties') {
			Q.when(simulator.unsetProperties(null, parameters), function(result) { res.send(result); })["catch"](function(err) { handleError(res, err); }).done();
		} else if (command === 'position') {
			Q.when(simulator.setPosition(null, parameters), function(result) { res.send(result); })["catch"](function(err) { handleError(res, err); }).done();
		} else if (command === 'route') {
			Q.when(simulator.setRouteOptions(null, parameters), function(result) { res.send(result); })["catch"](function(err) { handleError(res, err); }).done();
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
			Q.when(simulator.start(vehicleId, parameters), function(result) { res.send(result); })["catch"](function(err) { handleError(res, err); }).done();
		} else if (command === 'stop') {
			Q.when(simulator.stop(vehicleId, parameters), function(result) { res.send(result); })["catch"](function(err) { handleError(res, err); }).done();
		} else if (command === 'properties') {
			Q.when(simulator.setProperties(vehicleId, parameters), function(result) { res.send(result); })["catch"](function(err) { handleError(res, err); }).done();
		} else if (command === 'unsetproperties') {
			Q.when(simulator.unsetProperties(vehicleId, parameters), function(result) { res.send(result); })["catch"](function(err) { handleError(res, err); }).done();
		} else if (command === 'position') {
			Q.when(simulator.setPosition(vehicleId, parameters), function(result) { res.send(result); })["catch"](function(err) { handleError(res, err); }).done();
		} else if (command === 'route') {
			Q.when(simulator.setRouteOptions(vehicleId, parameters), function(result) { res.send(result); })["catch"](function(err) { handleError(res, err); }).done();
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
