/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 *
 * Data Privacy Disclaimer
 * 
 * This Program has been developed for demonstration purposes only to illustrate the technical
 * capabilities and potential business uses of the IBM IoT for Automotive
 * 
 * The components included in this Program may involve the processing of personal information
 * (for example location tracking and behavior analytics). When implemented in practice such
 * processing may be subject to specific legal and regulatory requirements imposed by country
 * specific data protection and privacy laws. Any such requirements are not addressed in
 * this Program.
 * 
 * Licensee is responsible for the ensuring Licensee's use of this Program and any deployed
 * solution meets applicable legal and regulatory requirements. This may require the implementation
 * of additional features and functions not included in the Program.
 * 
 * Apple License issue
 * 
 * This Program is intended solely for use with an Apple iOS product and intended to be used
 * in conjunction with officially licensed Apple development tools and further customized
 * and distributed under the terms and conditions of Licensee's licensed Apple iOS Developer
 * Program or Licensee's licensed Apple iOS Enterprise Program.
 * 
 * Licensee agrees to use the Program to customize and build the application for Licensee's own
 * purpose and distribute in accordance with the terms of Licensee's Apple developer program
 * 
 * Risk Mitigation / Product Liability Issues
 * 
 * The Program and any resulting application is not intended for design, construction, control,
 * or maintenance of automotive control systems where failure of such sample code or resulting
 * application could give rise to a material threat of death or serious personal injury.
 * 
 * IBM shall have no responsibility regarding the Program's or resulting application's compliance
 * with laws and regulations applicable to Licensee's business and content. Licensee is responsible
 * for use of the Program and any resulting application.
 * 
 * As with any development process, Licensee is responsible for developing, sufficiently testing
 * and remediating Licensee's products and applications and Licensee is solely responsible for any
 * foreseen or unforeseen consequences or failures of Licensee's products or applications.
 * 
 * REDISTRIBUTABLES
 * 
 * If the Program includes components that are Redistributable, they will be identified 
 * in the REDIST file that accompanies the Program. In addition to the license rights granted
 * in the Agreement, Licensee may distribute the Redistributables subject to the following terms:
 * 
 * 1) Redistribution must be in source code form only and must conform to all directions,
 *    instruction and specifications in the Program's accompanying REDIST or documentation;
 * 2) If the Program's accompanying documentation expressly allows Licensee to modify
 *    the Redistributables, such modification must conform to all directions, instruction and
 *    specifications in that documentation and these modifications, if any, must be treated
 *    as Redistributables;
 * 3) Redistributables may be distributed only as part of Licensee's application that was developed
 *    using the Program ("Licensee's Application") and only to support Licensee's customers
 *    in connection with their use of Licensee's Application. Licensee's application must constitute
 *    significant value add such that the Redistributables are not a substantial motivation
 *    for the acquisition by end users of Licensee's software product;
 * 4) If the Redistributables include a Java Runtime Environment, Licensee must also include other
 *    non-Java Redistributables with Licensee's Application, unless the Application is designed to
 *    run only on general computer devices (e.g., laptops, desktops and servers) and not on handheld
 *    or other pervasive devices (i.e., devices that contain a microprocessor but do not have
 *    computing as their primary purpose);
 * 5) Licensee may not remove any copyright or notice files contained in the Redistributables;
 * 6) Licensee must hold IBM, its suppliers or distributors harmless from and against any claim
 *    arising out of the use or distribution of Licensee's Application;
 * 7) Licensee may not use the same path name as the original Redistributable files/modules;
 * 8) Licensee may not use IBM's, its suppliers or distributors names or trademarks in connection
 *    with the marketing of Licensee's Application without IBM's or that supplier's
 *    or distributor's prior written consent;
 * 9) IBM, its suppliers and distributors provide the Redistributables and related documentation
 *    without obligation of support and "AS IS", WITH NO WARRANTY OF ANY KIND, EITHER EXPRESS
 *    OR IMPLIED, INCLUDING THE WARRANTY OF TITLE, NON-INFRINGEMENT OR NON-INTERFERENCE AND THE
 *    IMPLIED WARRANTIES AND CONDITIONS OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.;
 * 10) Licensee is responsible for all technical assistance for Licensee's Application and any
 *     modifications to the Redistributables; and
 * 11) Licensee's license agreement with the end user of Licensee's Application must notify the end
 *     user that the Redistributables or their modifications may not be i) used for any purpose
 *     other than to enable Licensee's Application, ii) copied (except for backup purposes),
 *     iii) further distributed or transferred without Licensee's Application or 
 *     iv) reverse assembled, reverse compiled, or otherwise translated except as specifically
 *     permitted by law and without the possibility of a contractual waiver. Furthermore, Licensee's
 *     license agreement must be at least as protective of IBM as the terms of this Agreement.
 * 
 * Feedback License
 * 
 * In the event Licensee provides feedback to IBM regarding the Program, Licensee agrees to assign
 * to IBM all right, title, and interest (including ownership of copyright) in any data, suggestions,
 * or written materials that 1) are related to the Program and 2) that Licensee provides to IBM.
 */

/*
 * REST apis for car devices
 */
var router = module.exports = require('express').Router();
var Q = require('q');
var _ = require('underscore');
var fs = require('fs-extra');
var moment = require("moment");
var chance = require("chance")();
var debug = require('debug')('simulator');
debug.log = console.log.bind(console);

var driverInsightsAsset = require('../../driverInsights/asset.js');
var driverInsightsProbe = require('../../driverInsights/probe.js');

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


var deviceModelSamples; // caches the template file in memory
var deviceModelSamplesNextSampleIndex = 0;
var _getDeviceModelInfo = function(){
	var samples = deviceModelSamples;
	if (!Array.isArray(samples)){
		samples = fs.readJsonSync('_deviceModelInfoSamples.json').templates;
		if (!samples){
			console.error('Failed to load ./_deviceModelInfoSamples.json');
			samples = [];
		}
		deviceModelSamples = samples;
	}
	// randomly pick one
	if (!samples || samples.length === 0)
		return {};
	return samples[(deviceModelSamplesNextSampleIndex++) % samples.length];
};

var _deactivateFleeSimulatedVehicles = function(num){
	var deferred = Q.defer();
	debug("Try to find free active simulated cars [" + num + "]");
	Q.when(driverInsightsAsset.getVehicleList({"vendor": VENDOR_NAME, "status": "active"}), function(response){
		var vehicles = response.data;
		debug("Active vehicles: " + JSON.stringify(vehicles));
		var defList = [];
		for(var i=0; i<vehicles.length; i++){
			var deactivate = false;
			var mo_id = vehicles[i].mo_id;
			var last_probe_time = driverInsightsProbe.getLastProbeTime(mo_id);
			if(last_probe_time){
				var since_last_modified = moment().diff(moment(last_probe_time), "seconds");
				debug("since last modified = " + since_last_modified);
				if(since_last_modified > 600){
					deactivate = true;
				}
			}else{
				// server may have been rebooted
				deactivate = true;
			}
			if(deactivate){
				num--;
				debug("try to inactivate: " + mo_id );
				defList.push(driverInsightsAsset.updateVehicle(mo_id, {"status": "inactive"}));
			}
		}
		Q.all(defList).then(function(){
			deferred.resolve(num);
		});
	})["catch"](function(err){
		debug("No active free simulated cars.");
		deferred.resolve(num);
	}).done();
	return deferred.promise;
};

var _createNewSimulatedVehicles = function(num){
	debug("Simulated car will be created [" + num + "]");
	var deferred = Q.defer();
	var defList = [];
	for(var i=0; i < num; i++){
		var vehicle = {
			"vendor": VENDOR_NAME, 
			"serial_number": "s-" + chance.hash({length: 6})
		};
		vehicle.properties = _getDeviceModelInfo();
		vehicle.model = vehicle.properties.makeModel;
		defList.push(driverInsightsAsset.addVehicle(vehicle));
	}
	Q.all(defList).then(function(){
		debug("created " + num + " vehicles");
		deferred.resolve();
	})["catch"](function(err){
		debug("Failed to create simulated car");
		deferred.reject(err);
	}).done();
	return deferred.promise;
};

var _createSimulatedVehicles = function(res, exsiting_vehicles){
	var num = exsiting_vehicles ? (NUM_OF_SIMULATOR - exsiting_vehicles.length) : NUM_OF_SIMULATOR;
	debug("Get inactive simulated cars [" + num + "]");
	if(num === 0){
		return Q();
	}
	return Q.when(_deactivateFleeSimulatedVehicles(num)).then(function(){
		return _createNewSimulatedVehicles(num);
	});
};

var _getAvailableVehicles = function(res, exsiting_vehicles){
	Q.when(_createSimulatedVehicles(res, exsiting_vehicles))
	.then(function(){
		debug("get inactive cars again");
		return driverInsightsAsset.getVehicleList({"vendor": VENDOR_NAME, "status": "inactive"});
	}).then(function(response){
		debug("_getAvailableVehicles: " + response);
		res.send(response);
	})["catch"](function(err){
		debug("Failed to get simulated cars");
		_sendError(res, err);
	}).done();
};

router.get("/simulatedVehicles", authenticate, function(req, res){
	Q.when(driverInsightsAsset.getVendor(VENDOR_NAME), function(response){
		debug("There is vendor: " + VENDOR_NAME);
		Q.when(driverInsightsAsset.getVehicleList({"vendor": VENDOR_NAME, "status": "inactive"}), function(response){
			if(response && response.data && response.data.length < NUM_OF_SIMULATOR){
				// create additional vehicles
				_getAvailableVehicles(res, response.data);
			}else{
				res.send(response);
			}
		})["catch"](function(err){
			// assume vehicle is not available 
			_getAvailableVehicles(res);
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
