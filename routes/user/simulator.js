/**
 * Copyright 2016, 2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
/*
 * REST apis for car devices
 */
const router = module.exports = require('express').Router();
const authenticate = require('./auth.js').authenticate;
const simulatorManager = require('../../simulator/simulatorManager.js');

const handleError = require('./error.js').handleError;
const debug = require('debug')('route:simulator');
debug.log = console.log.bind(console);


/**
 * Create a simulator. One simulator can be created per client id. 404 error is returned
 * if a simulator for specified client id exists. To avoid the error, set noErrorOnExist true.
 * The created simulator will be terminated automatically when specified minutes by timeoutInMinutes pass after last access.
 *
 * request:
 * {numVehicles, latitude, longitude, distance, timeoutInMinutes, noErrorOnExist}
 *
 * response:
 * {numVehicles, state, creationTime, lastModified, latitude, longitude, distance}
 */
router.post("/simulator", authenticate, function (req, res) {
	const clientId = req.body.clientId || req.query.clientId || req.get("iota-simulator-uuid");
	const numVehicles = req.body.numVehicles;
	const latitude = req.body.latitude;
	const longitude = req.body.longitude;
	const distance = req.body.distance;
	const timeoutInMinutes = req.body.timeoutInMinutes;
	const noErrorOnExist = req.body.noErrorOnExist;
	simulatorManager.create(clientId, numVehicles, longitude, latitude, distance, timeoutInMinutes, noErrorOnExist)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		});
});

/**
 * Get simulator list
 * response:
 * {[clientId, {numVehicles, state, creationTime, lastModified, latitude, longitude, distance}]}
 */
router.get("/simulator/simulatorList", authenticate, function (req, res) {
	try {
		return res.send({ data: simulatorManager.getSimulatorList() });
	} catch (error) {
		handleError(res, error);
	}
});

/**
 * Get a simulator
 * response:
 * {clientId, numVehicles, createdTime, lastModified}
 */
router.get("/simulator", authenticate, function (req, res) {
	const clientId = req.query.clientId || req.get("iota-simulator-uuid");
	simulatorManager.getSimulator(clientId)
		.then(function (result) {
			return res.send(result.getInformation());
		}).catch(function (error) {
			handleError(res, error);
		});
});

/**
 * Terminate a simulator
 *
 */
router["delete"]("/simulator", authenticate, function (req, res) {
	const clientId = req.query.clientId || req.get("iota-simulator-uuid");
	simulatorManager.release(clientId)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		});
});

/**
 * Get vehicle list for a simulator. Specify properties to get with properties parameter in body.
 * The properties value is a comma-separated text that contains one or more of the following values
 *
 * vehicleId: vehicle id
 * vehicle: vehicle object that shows vehicle's detail
 * driverId: driver id associated for the vehicle
 * driver: driver object that shows driver's detail
 * state: vehicle's state (stop, idling, routing or driving)
 * position: location of the vehicle
 * options: options for route search
 * properties: properties to be added to car probe
 *
 * request:
 * {numInPage, pageIndex, properties}
 *
 * response:
 * {[{vehicleId, vehicle, driverId, driver, state, position, options, properties}]}
 */
router.get("/simulator/vehicleList", authenticate, function (req, res) {
	const clientId = req.query.clientId || req.get("iota-simulator-uuid");
	const numInPages = req.query.numInPages ? parseInt(req.query.numInPages) : null;
	const pageIndex = req.query.pageIndex ? parseInt(req.query.pageIndex) : 0;
	const properties = req.query.properties ? req.query.properties.split(',') : null;
	simulatorManager.getSimulator(clientId)
		.then(function (simulator) {
			return res.send({ data: simulator.getVehicleList(numInPages, pageIndex, properties) });
		}).catch(function (error) {
			handleError(res, error);
		});
});

/**
 * Get vehicle details for given vehicle id. Specify properties to get with properties parameter in body.
 * The properties value is a comma-separated text that contains one or more of the following values
 *
 * vehicleId: vehicle id
 * vehicle: vehicle object that shows vehicle's detail
 * driverId: driver id associated for the vehicle
 * driver: driver object that shows driver's detail
 * state: vehicle's state (stop, idling, routing or driving)
 * position: location of the vehicle
 * options: options for route search
 * properties: properties to be added to car probe
 *
 * response:
 * {vehicleId, vehicle, driverId, driver, state, position, options, properties}
 */
router.get("/simulator/vehicle/:vehicle_id", authenticate, function (req, res) {
	const clientId = req.query.clientId || req.get("iota-simulator-uuid");
	const properties = req.query.properties ? req.query.properties.split(',') : null;
	simulatorManager.getSimulator(clientId)
		.then(function (simulator) {
			const data = simulator.getVehicleInformation(req.params.vehicle_id, properties);
			if (data) {
				res.send({ data: data });
			} else {
				handleError(res, { statusCode: 404, message: "vehicle does not exist." });
			}
		}).catch(function (error) {
			handleError(res, error);
		});
});

/**
 * Get route of specific vehicle
 *
 * response:
 * {vehicleId, [array of route node]}
 */
router.get("/simulator/vehicle/:vehicle_id/route", authenticate, function (req, res) {
	const clientId = req.query.clientId || req.get("iota-simulator-uuid");
	simulatorManager.getSimulator(clientId)
		.then(function (simulator) {
			return simulator.getRouteData(req.params.vehicle_id);
		}).then(function (data) {
			res.send({ data: data });
		}).catch(function (error) {
			handleError(res, error);
		});
});

/**
 * Control vehicles (start, stop, move, set/unset properties, route search)
 */
router.put("/simulator/vehicles", authenticate, function (req, res) {
	const clientId = req.query.clientId || req.body.clientId || req.get("iota-simulator-uuid");
	const command = req.query.command || req.body.command;
	const parameters = req.body.parameters;
	if (!command) {
		return handleError(res, { statusCode: 400, message: "Command must be specified" });
	}

	simulatorManager.getSimulator(clientId)
		.then(function (simulator) {
			if (command === 'start') {
				return simulator.start(null, parameters);
			} else if (command === 'stop') {
				return simulator.stop(null, parameters);
			} else if (command === 'properties') {
				return simulator.setProperties(null, parameters);
			} else if (command === 'unsetproperties') {
				return simulator.unsetProperties(null, parameters);
			} else if (command === 'position') {
				return simulator.setPosition(null, parameters);
			} else if (command === 'route') {
				return simulator.setRouteOptions(null, parameters);
			}
		}).then(function (result) {
			if (result) {
				res.send(result);
			} else {
				handleError(res, { statusCode: 400, message: "Invalid command" });
			}
		}).catch(function (error) {
			handleError(res, error);
		});
});

/**
 * Start or stop a vehicle or change route options
 */
router.put("/simulator/vehicle/:vehicle_id", authenticate, function (req, res) {
	const clientId = req.body.clientId || req.query.clientId || req.get("iota-simulator-uuid");
	const vehicleId = req.params.vehicle_id;
	const command = req.query.command || req.body.command;
	const parameters = req.body.parameters;
	if (!command) {
		return handleError(res, { statusCode: 400, message: "Command must be specified" });
	}

	simulatorManager.getSimulator(clientId)
		.then(function (simulator) {
			if (command === 'start') {
				return simulator.start(vehicleId, parameters);
			} else if (command === 'stop') {
				return simulator.stop(vehicleId, parameters);
			} else if (command === 'properties') {
				return simulator.setProperties(vehicleId, parameters);
			} else if (command === 'unsetproperties') {
				return simulator.unsetProperties(vehicleId, parameters);
			} else if (command === 'position') {
				return simulator.setPosition(vehicleId, parameters);
			} else if (command === 'waypoints') {
				return simulator.setWaypoints(vehicleId, parameters);
			} else if (command === 'route') {
				return simulator.setRouteOptions(vehicleId, parameters);
			} else if (command === 'acceleration') {
				return simulator.setAcceleration(vehicleId, parameters);
			}
		}).then(function (result) {
			if (result) {
				res.send(result);
			} else {
				handleError(res, { statusCode: 400, message: "Invalid command" });
			}
		}).catch(function (error) {
			handleError(res, error);
		});
});

/**
 * watch vehicles
 */
router.get("/simulator/watch", authenticate, function (req, res) {
	const server = req.app.server;

	// initialize WSS server
	const wssUrl = req.baseUrl + req.route.path;
	if (!req.app.server) {
		return handleError(res, { statusCode: 500, message: 'failed to create WebSocketServer due to missing app.server' });
	}

	try {
		simulatorManager.watch(server, wssUrl);
		res.send({ result: "soccess" });
	} catch (error) {
		handleError(res, error);
	}
});
