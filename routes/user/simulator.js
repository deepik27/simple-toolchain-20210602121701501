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
 * REST apis for car devices
 */
var router = module.exports = require('express').Router();
var Q = require('q');
var _ = require('underscore');
var debug = require('debug')('simulator');
debug.log = console.log.bind(console);

var driverInsightsAsset = require('../../driverInsights/asset.js');

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

var _createSimulatedVehicles = function(res, num){
	num = (num || NUM_OF_SIMULATOR);
	debug("Simulated car will be created [" + num + "]");
	var defList = [];
	for(var i=0; i < num; i++){
		defList.push(driverInsightsAsset.addVehicle({"vendor": VENDOR_NAME, "serial_number": "simulated_vehicle_" + i}));
	}
	Q.all(defList).then(function(){
		debug("Simulated cars were created");
		Q.when(driverInsightsAsset.getVehicleList({"vendor": VENDOR_NAME}), function(response){
			res.send(response);
		})["catch"](function(err){
			_sendError(res, err);
		}).done();
	})["catch"](function(err){
		_sendError(res, err);
	}).done();
};

router.get("/simulatedVehicles", authenticate, function(req, res){
	Q.when(driverInsightsAsset.getVendor(VENDOR_NAME), function(response){
		debug("There is vendor: " + VENDOR_NAME);
		Q.when(driverInsightsAsset.getVehicleList({"vendor": VENDOR_NAME}), function(response){
			if(response && response.data && response.data.length < NUM_OF_SIMULATOR){
				_createSimulatedVehicles(res, NUM_OF_SIMULATOR - response.data.length);
			}else{
				res.send(response);
			}
		})["catch"](function(err){
			// assume vehicle is not available 
			_createSimulatedVehicles(res);
		}).done();
	})["catch"](function(err){
		var status = (err.response && (err.response.status||err.response.statusCode)) || 500;
		if(status === 404){
			debug("Create a vendor for simulator");
			Q.when(driverInsightsAsset.addVendor({"vendor": VENDOR_NAME, "type": "Vendor", "status":"Active"}), function(response){
				debug("A vendor for simulator is created");
				_createSimulatedVehicles(res);
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
	var promise = driverInsightsAsset.addDriver({"name": DRIVER_NAME, "status":"Active"});
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
	Q.when(driverInsightsAsset.getDriverList({"name": DRIVER_NAME}), function(response){
			res.send(response);
	})["catch"](function(err){
		// assume driver is not available 
		_createSimulatedDriver(res);
	}).done();
});
