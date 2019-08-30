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
 * REST APIs using Driver Behavior service as backend
 */
const router = module.exports = require('express').Router();
const authenticate = require('./auth.js').authenticate;

const driverInsightsAnalysis = require('../../driverInsights/analysis.js');

const handleError = require('./error.js').handleError;
const debug = require('debug')('route:analysis');
debug.log = console.log.bind(console);

//
// Driving Behavior Analysis APIs
//
router.get("/capability/analysis", authenticate, function (req, res) {
	res.send({ available: driverInsightsAnalysis.isAvailable() });
})

router.get('/analysis/trip/:mo_id', authenticate, function (req, res) {
	driverInsightsAnalysis.getTrips(req.params.mo_id, req.query.limit)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.get('/analysis/behaviors/:mo_id', authenticate, function (req, res) {
	driverInsightsAnalysis.getTripBehavior(req.params.mo_id, req.query.trip_id, req.query.lastHours)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.get("/analysis/triproutes/:mo_id", function (req, res) {
	driverInsightsAnalysis.getTripRoute(req.params.mo_id, req.query.trip_id, req.query.offset, req.query.limit)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.get("/analysis/triplength/:mo_id", function (req, res) {
	driverInsightsAnalysis.getTripRouteLength(req.params.mo_id, req.query.trip_id)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});
