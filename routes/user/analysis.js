/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
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
router.get("/capability/analysis", authenticate, function(req, res) {
	res.send({ available: driverInsightsAnalysis.isAvailable() });
})

router.get('/analysis/trip/:mo_id', authenticate, function(req, res) {
	driverInsightsAnalysis.getTrips(req.params.mo_id, req.query.limit)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.get('/analysis/behaviors/:mo_id', authenticate, function(req, res) {
	driverInsightsAnalysis.getTripBehavior(req.params.mo_id, req.query.trip_id, req.query.lastHours)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.get("/analysis/triproutes/:mo_id", function(req, res) {
	driverInsightsAnalysis.getTripRoute(req.params.mo_id, req.query.trip_id, req.query.lastHours)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});
