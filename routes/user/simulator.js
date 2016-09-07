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
var debug = require('debug')('device');
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
var NUM_OF_SIMULATOR = 5;
var _createSimulatedVehicle = function(res, num){
	num = (num || NUM_OF_SIMULATOR);
	console.log("Simulated car will be created [" + num + "]");
	var defList = [];
	for(var i=0; i < num; i++){
		defList.push(driverInsightsAsset.addVehicle({"vendor": "IBM", "serial_number": "sim" + i}));
	}
	Q.when(defList, function(){
		console.log("Simulated cars were created");
		Q.when(driverInsightsAsset.getVehicleList({"vendor": "IBM"}), function(response){
			res.send(response);
		})["catch"](function(err){
			_sendError(res, err);
		}).done();
	})["catch"](function(err){
		_sendError(res, err);
	}).done();
};

router.get("/simulatedVehicle", authenticate, function(req, res){
	Q.when(driverInsightsAsset.getVendor("IBM"), function(response){
		console.log("There is vendor IBM");
		Q.when(driverInsightsAsset.getVehicleList({"vendor": "IBM"}), function(response){
			if(response && response.data && response.data.length < NUM_OF_SIMULATOR){
				_createSimulatedVehicle(res, NUM_OF_SIMULATOR - response.data.length);
			}else{
				res.send(response);
			}
		})["catch"](function(err){
			// assume vehicle is not available 
			_createSimulatedVehicle(res);
		}).done();
	})["catch"](function(err){
		var status = (err.response && (err.response.status||err.response.statusCode)) || 500;
		if(status === 404){
			Q.when(driverInsightsAsset.addVendor({"vendor": "IBM", "type": "Vendor", "status":"Active"}), function(response){
				console.log("Vendor IBM is created");
				_createSimulatedVehicle(res);
			})["catch"](function(err){
				_sendError(res, err);
			}).done();
		}else{
			_sendError(res, err);
		}
	}).done();
});
