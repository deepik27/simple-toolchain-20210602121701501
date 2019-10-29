/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
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
