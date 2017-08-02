/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */

var simulatedVehicleManager = module.exports = {};

var Q = require('q');
var _ = require('underscore');
var fs = require('fs-extra');
var Chance = require('chance');
var iot4aAsset = app_module_require('iot4a-api/asset.js');

var debug = require('debug')('simulatedVehicleManager');
debug.log = console.log.bind(console);

var DRIVER_NAME = process.env.SIMULATOR_DRIVER || "simulated_driver";
var VENDOR_NAME = process.env.SIMULATOR_VENDOR || "IBM";
var NUM_OF_SIMULATOR = 5;

_.extend(simulatedVehicleManager, {
	clients: {},

	getSimulatedVehicles: function(clientId, numVehicles, excludes) {
		numVehicles = numVehicles || NUM_OF_SIMULATOR;
		
		var deferred = Q.defer();
		var self = this;
		Q.when(iot4aAsset.getVendor(VENDOR_NAME), function(response) {
			debug("There is vendor: " + VENDOR_NAME);
			Q.when(self._getVehicleList('inactive', excludes), function(vehicles) {
				if (vehicles.length < numVehicles) {
					// create additional vehicles
					deferred.resolve(self._getAvailableVehicles(numVehicles, vehicles, excludes));
				} else if (vehicles.length > numVehicles) {
					deferred.resolve({data: vehicles.slice(0, numVehicles)});
				}else{
					deferred.resolve({data: vehicles});
				}
			})["catch"](function(err){
				var status = (err.response && (err.response.status||err.response.statusCode)) || 500;
				if(status === 404){
					// assume vehicle is not available 
					deferred.resolve(self._getAvailableVehicles(numVehicles, null, excludes));
				} else {
					deferred.reject(self._getError(err));
				}
			}).done();
		})["catch"](function(err){
			var status = (err.response && (err.response.status||err.response.statusCode)) || 500;
			if(status === 404){
				debug("Create a vendor for simulator");
				Q.when(iot4aAsset.addVendor({"vendor": VENDOR_NAME, "type": "Vendor", "status":"Active"}), function(response){
					debug("A vendor for simulator is created");
					deferred.resolve(self._getAvailableVehicles(numVehicles, null, excludes));
				})["catch"](function(err){
					deferred.reject(self._getError(err));
				}).done();
			}else{
				deferred.reject(self._getError(err));
			}
		}).done();		
		return deferred.promise;
	},

	_getVehicleList: function(status, excludes) {
		return Q.when(iot4aAsset.getVehicleList({"vendor": VENDOR_NAME, "status": status}), function(response) {
			var vehicles = response && response.data || [];
			if (excludes && excludes.length > 0) {
				vehicles = _.filter(vehicles, function(vehicle) { return !_.contains(excludes, vehicle.mo_id); });
			}
			return vehicles;
		});
	},

	_getError: function(err){
		//{message: msg, error: error, response: response}
		var response = err.response;
		var status = (response && (response.status||response.statusCode)) || 500;
		var message = err.message || (err.data && err.data.message) || err;
		return {statusCode: status, message: message};
	},
	
	_getAvailableVehicles: function(numVehicles, exsiting_vehicles, excludes) {
		var self = this;
		return Q.when(this._createSimulatedVehicles(numVehicles, exsiting_vehicles, excludes))
		.then(function(){
			debug("get inactive cars again");
			return self._getVehicleList('inactive', excludes);
		}).then(function(response){
			debug("_getAvailableVehicles: " + response);
			return {data: response};
		});
	},

	_createSimulatedVehicles: function(numVehicles, exsiting_vehicles, excludes){
		var num = exsiting_vehicles ? (numVehicles - exsiting_vehicles.length) : numVehicles;
		debug("Get inactive simulated cars [" + num + "]");
		if(num === 0){
			return Q();
		}
		var self = this;
		return Q.when(self._deactivateFleeSimulatedVehicles(num, excludes)).then(function(num){
			return self._createNewSimulatedVehicles(num);
		});
	},

	_deactivateFleeSimulatedVehicles: function(num, excludes){
		var deferred = Q.defer();
		debug("Try to find free active simulated cars [" + num + "]");
		Q.when(this._getVehicleList('active', excludes), function(vehicles){
			debug("Active vehicles: " + JSON.stringify(vehicles));
			var defList = [];
			for(var i=0; i<vehicles.length && num > 0; i++){
				var mo_id = vehicles[i].mo_id;
				if (!_.contains(excludes, mo_id)) {
					num--;
					debug("try to inactivate: " + mo_id );
					defList.push(iot4aAsset.updateVehicle(mo_id, {"status": "inactive"}));
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
	},

	_createNewSimulatedVehicles: function(num){
		debug("Simulated car will be created [" + num + "]");
		var chance = new Chance();
		var deferred = Q.defer();
		var defList = [];
		for(var i=0; i < num; i++){
			var vehicle = {
				"vendor": VENDOR_NAME, 
				"serial_number": "s-" + chance.hash({length: 6})
			};
			var properties = this._getDeviceModelInfo();
			vehicle.model = properties.makeModel;
			if (iot4aAsset.acceptVehicleProperties()) {
				vehicle.properties = properties;				
			}
			defList.push(iot4aAsset.addVehicle(vehicle));
		}
		Q.all(defList).then(function(){
			debug("created " + num + " vehicles");
			deferred.resolve();
		})["catch"](function(err){
			debug("Failed to create simulated car");
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},

	deviceModelSamples: null, // caches the template file in memory
	deviceModelSamplesNextSampleIndex: 0,
	_getDeviceModelInfo: function(){
		var samples = this.deviceModelSamples;
		if (!Array.isArray(samples)){
			samples = fs.readJsonSync(__dirname + '/_simulatedVehicleModels.json').templates;
			if (!samples){
				console.error('Failed to load ./_simulatedVehicleModels.json');
				samples = [];
			}
			this.deviceModelSamples = samples;
		}
		// randomly pick one
		if (!samples || samples.length === 0)
			return {};
		return samples[(this.deviceModelSamplesNextSampleIndex++) % samples.length];
	},
	
	_createSimulatedDriver: function(){
		var deferred = Q.defer();
		var promise = iot4aAsset.addDriver({"name": DRIVER_NAME, "driver_id": DRIVER_NAME, "status":"Active"});
		Q.when(promise, function(response){
			var data = {driver_id: response.id, name: DRIVER_NAME};
			debug("Simulated driver was created");
			deferred.resolve(data);
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	
	getSimulatorDriver: function() {
		var self = this;
		var deferred = Q.defer();
		Q.when(iot4aAsset.getDriverList({"name": DRIVER_NAME}), function(response){
			if (response && response.data && response.data.length > 0) {
				deferred.resolve(response.data[0]);
			} else {
				Q.when(self._createSimulatedDriver(), function(driver) {
					deferred.resolve(driver);
				})["catch"](function(err){
					deferred.reject(err);
				});
			}
		})["catch"](function(err) {
			var status = (err.response && (err.response.status||err.response.statusCode)) || 500;
			if(status === 404){
				// assume driver is not available 
				Q.when(self._createSimulatedDriver(), function(driver) {
					deferred.resolve(driver);
				})["catch"](function(err){
					deferred.reject(err);
				});
			} else {
				deferred.reject(err);
			}
		}).done();
		return deferred.promise;
	}
});