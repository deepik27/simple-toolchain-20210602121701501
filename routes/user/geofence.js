/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
/*
 * REST apis for geofence
 */
const router = module.exports = require('express').Router();
const authenticate = require('./auth.js').authenticate;

const driverInsightsGeofence = require('../../driverInsights/geofence.js');

const handleError = require('./error.js').handleError;
const debug = require('debug')('geofence');
debug.log = console.log.bind(console);

router.get("/capability/geofence", authenticate, function (req, res) {
	res.send({ available: driverInsightsGeofence.getSupportInfo() });
});

router.post("/geofence", authenticate, function (req, res) {
	driverInsightsGeofence.createGeofence(req.body)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.get("/geofence", authenticate, function (req, res) {
	var min_latitude = req.query.min_latitude;
	var min_longitude = req.query.min_longitude;
	var max_latitude = req.query.max_latitude;
	var max_longitude = req.query.max_longitude;
	driverInsightsGeofence.queryGeofence(min_latitude, min_longitude, max_latitude, max_longitude)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.get("/geofence/:geofence_id", authenticate, function (req, res) {
	var geofence_id = req.params.geofence_id;
	driverInsightsGeofence.getGeofence(geofence_id)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.put("/geofence/:geofence_id", authenticate, function (req, res) {
	var geofence_id = req.params.geofence_id;
	driverInsightsGeofence.updateGeofence(geofence_id, req.body)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router["delete"]("/geofence/:geofence_id", authenticate, function (req, res) {
	var geofence_id = req.params.geofence_id;
	driverInsightsGeofence.deleteGeofence(geofence_id)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});
