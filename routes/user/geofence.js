/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
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
var router = module.exports = require('express').Router();
var Q = require('q');
var _ = require('underscore');
var debug = require('debug')('geofence');
debug.log = console.log.bind(console);

var driverInsightsGeofence = require('../../driverInsights/geofence.js');

var authenticate = require('./auth.js').authenticate;

function handleAssetError(res, err) {
	//{message: msg, error: error, response: response}
	console.error('error: ' + JSON.stringify(err));
	var response = err.response;
	var status = err.statusCode || (response && (response.status||response.statusCode)) || 500;
	var message = err.message || (err.data && err.data.message) || err;
	return res.status(status).send(message);
}

router.post("/geofence", authenticate, function(req, res){
	Q.when(driverInsightsGeofence.createGeofence(req.body), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.get("/geofence", authenticate, function(req, res){
	var min_latitude = req.query.min_latitude;
	var min_longitude = req.query.min_longitude;
	var max_latitude = req.query.max_latitude;
	var max_longitude = req.query.max_longitude;
	Q.when(driverInsightsGeofence.queryGeofence(min_latitude, min_longitude, max_latitude, max_longitude), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.get("/geofence/:geofence_id", authenticate, function(req, res){
	var geofence_id = req.params.geofence_id;
	Q.when(driverInsightsGeofence.getGeofence(geofence_id), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.put("/geofence/:geofence_id", authenticate, function(req, res){
	var geofence_id = req.params.geofence_id;
	Q.when(driverInsightsGeofence.updateGeofence(geofence_id, req.body), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router["delete"]("/geofence/:geofence_id", authenticate, function(req, res){
	var geofence_id = req.params.geofence_id;
	Q.when(driverInsightsGeofence.deleteGeofence(geofence_id), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
