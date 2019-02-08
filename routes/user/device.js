/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
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
const router = module.exports = require('express').Router();
const Q = require('q');
const debug = require('debug')('device');
debug.log = console.log.bind(console);
const authenticate = require('./auth.js').authenticate;

const deviceManager = require("../../driverInsights/deviceManager.js");
const registration = require('../../driverInsights/registration.js');
const handleError = require('./error.js').handleError;

router.get("/device", authenticate, async (req, res) => {
	try {
		const num_page = req.query.num_page || 1;
		const num_rec_in_page = req.query.num_rec_in_page || 25;
		const response = await deviceManager.getAllDevices(num_page, num_rec_in_page);
		res.send(response);
	} catch (error) {
		return handleError(res, error);
	}
});

router.get("/device/:tcuId", authenticate, async (req, res) => {
	try {
		const tcuId = req.params.tcuId;
		const vehicle = await deviceManager.getVehicleByTcuId(tcuId);
		res.send(vehicle);
	} catch (error) {
		return handleError(res, error);
	}
});

router.post("/device/:tcuId", authenticate, async (req, res) => {
	try {
		const tcuId = req.params.tcuId;
		const errorWhenExists = req.query.errorWhenExists && (req.query.errorWhenExists !== 'false');
		const protocol = req.query.protocol || "http"; // mqtt/http
		let vehicle = (req.body && Object.keys(req.body).length !== 0) ? req.body : {};
		const vehicles = await deviceManager.getVehicleByTcuId(tcuId, protocol).catch(error => {
			if (error.statusCode === 404) {
				return null;
			}
		});
		if (vehicles && vehicles.length > 0) {
			if (errorWhenExists) {
				return handleError(res, { statusCode: 400, message: `Device for ${tcuId} is already registered.` });
			} else {
				res.send(vehicles[0]);
			}
		}
		vehicle = await deviceManager.addVehicle(tcuId, null, protocol);

		res.send(vehicle);
	} catch (error) {
		handleError(res, error);
	}
});

router.get("/device/:tcuId/vehicle", authenticate, function (req, res) {
	var tcuId = req.params.tcuId;
	Q.when(registration.getVehicleInfo(tcuId, null), function (response) {
		res.send(response);
	})["catch"](function (err) {
		return handleError(res, err);
	}).done();
});

router.put("/device/:tcuId/vehicle", authenticate, function (req, res) {
	var tcuId = req.params.tcuId;
	var vehicle = (req.body && Object.keys(req.body).length !== 0) ? req.body : null;
	Q.when(registration.updateVehicleInfo(tcuId, null, vehicle), function (response) {
		res.send(response);
	})["catch"](function (err) {
		return handleError(res, err);
	}).done();
});

router["delete"]("/device/:tcuId", authenticate, function (req, res) {
	var tcuId = req.params.tcuId;
	Q.when(registration.unregister(tcuId, null), function (response) {
		res.send(response);
	})["catch"](function (err) {
		return handleError(res, err);
	}).done();
});
