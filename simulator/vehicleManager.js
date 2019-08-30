/**
 * Copyright 2017,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
const simulatedVehicleManager = module.exports = {};

const Q = require('q');
const _ = require('underscore');
const fs = require('fs-extra');
const Chance = require('chance');
const asset = app_module_require("cvi-node-lib").asset;

const debug = require('debug')('simulatedVehicleManager');
debug.log = console.log.bind(console);

const DRIVER_NAME = process.env.SIMULATOR_DRIVER || "simulated_driver";
const VENDOR_NAME = process.env.SIMULATOR_VENDOR || "IBM";
const NUM_OF_SIMULATOR = 5;
const TCU_MODEL_NAME = "TCU";

_.extend(simulatedVehicleManager, {
	clients: {},

	getSimulatedVehicles: function (clientId, numVehicles, excludes) {
		numVehicles = numVehicles || NUM_OF_SIMULATOR;

		var deferred = Q.defer();
		// Get a vendor for simulator
		Q.when(this._getSimulationVendor(VENDOR_NAME), (vendor) => {
			if (vendor) {
				debug("There is vendor: " + VENDOR_NAME);

				// Get Vehicles associated with the vendor for simulator
				Q.when(this._getVehicleList('active', excludes, vendor), (vehicles) => {
					if (vehicles.length < numVehicles) {
						// create additional vehicles
						deferred.resolve(this._getAvailableVehicles(numVehicles, vehicles, excludes, vendor));
					} else if (vehicles.length > numVehicles) {
						deferred.resolve({ data: vehicles.slice(0, numVehicles) });
					} else {
						deferred.resolve({ data: vehicles });
					}
				}).catch((err) => {
					var status = (err.response && (err.response.status || err.response.statusCode)) || 500;
					if (status === 404) {
						// assume vehicle is not available
						deferred.resolve(this._getAvailableVehicles(numVehicles, null, excludes, vendor));
					} else {
						deferred.reject(this._getError(err));
					}
				});
			} else {
				debug("Create a vendor for simulator");
				let chance = new Chance();
				vendor = chance.hash({ length: 12 });
				let params = {
					"type": "Vendor",
					"status": "Active",
					"vendor": vendor,
					"name": VENDOR_NAME
				};
				Q.when(asset.addVendor(params), (response) => {
					debug("A vendor for simulator is created");
					deferred.resolve(this._getAvailableVehicles(numVehicles, null, excludes, vendor));
				})["catch"]((err) => {
					deferred.reject(this._getError(err));
				});
			}
		}).catch((err) => {
			deferred.reject(this._getError(err));
		});
		return deferred.promise;
	},

	_getSimulationVendor: function () {
		return Q.when(asset.getVendorList({ name: VENDOR_NAME }), (response) => {
			if (response && response.data && response.data.length > 0) {
				return response.data[0].vendor;
			}
		});
	},

	_getVehicleList: function (status, excludes, vendor) {
		return Q.when(asset.getVehicleList({ "vendor": vendor, "status": status }), (response) => {
			let vehicles = response && response.data || [];
			vehicles = _.filter(vehicles, (vehicle) => { return !_.contains(excludes, vehicle.mo_id) && TCU_MODEL_NAME != vehicle.model; });
			return vehicles;
		});
	},

	_getError: function (err) {
		//{message: msg, error: error, response: response}
		let response = err.response;
		let status = (response && (response.status || response.statusCode)) || 500;
		let message = err.message || (err.data && err.data.message) || err;
		return { statusCode: status, message: message };
	},

	_getAvailableVehicles: function (numVehicles, exsiting_vehicles, excludes, vendor) {
		let num = exsiting_vehicles ? (numVehicles - exsiting_vehicles.length) : numVehicles;
		return Q.when(num > 0 && this._createNewSimulatedVehicles(num, vendor))
			.then(() => {
				debug("get active cars again");
				return this._getVehicleList('active', excludes, vendor);
			}).then((response) => {
				debug("_getAvailableVehicles: " + response);
				return { data: response };
			});
	},

	_createNewSimulatedVehicles: function (num, vendor) {
		debug("Simulated car will be created [" + num + "]");
		let chance = new Chance();
		let deferred = Q.defer();
		let defList = [];
		for (let i = 0; i < num; i++) {
			let vehicle = {
				"vendor": vendor,
				"serial_number": "s-" + chance.hash({ length: 6 }),
				"status": "active"
			};
			let properties = this._getDeviceModelInfo();
			vehicle.model = "Simulated Vehicle";
			if (asset.acceptVehicleProperties()) {
				vehicle.properties = properties;
			}
			defList.push(asset.addVehicle(vehicle));
		}
		Q.all(defList).then(() => {
			debug("created " + num + " vehicles");
			deferred.resolve();
		}).catch((err) => {
			debug("Failed to create simulated car");
			deferred.reject(err);
		});
		return deferred.promise;
	},

	deviceModelSamples: null, // caches the template file in memory
	deviceModelSamplesNextSampleIndex: 0,
	_getDeviceModelInfo: function () {
		let samples = this.deviceModelSamples;
		if (!Array.isArray(samples)) {
			samples = fs.readJsonSync(__dirname + '/_simulatedVehicleModels.json').templates;
			if (!samples) {
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

	_createSimulatedDriver: function () {
		let chance = new Chance();
		let driver_id = chance.hash({ length: 12 });

		let promise = asset.addDriver({ "name": DRIVER_NAME, "driver_id": driver_id, "status": "Active" });
		return Q.when(promise, (response) => {
			let data = { driver_id: response.driver_id, name: DRIVER_NAME };
			debug("Simulated driver was created");
			return data;
		});
	},

	getSimulatorDriver: function () {
		let deferred = Q.defer();
		Q.when(asset.getDriverList({ "name": DRIVER_NAME }), (response) => {
			if (response && response.data && response.data.length > 0) {
				deferred.resolve(response.data[0]);
			} else {
				Q.when(this._createSimulatedDriver(), (driver) => {
					deferred.resolve(driver);
				}).catch((err) => {
					deferred.reject(err);
				});
			}
		}).catch((err) => {
			let status = (err.response && (err.response.status || err.response.statusCode)) || 500;
			if (status === 404) {
				// assume driver is not available
				Q.when(this._createSimulatedDriver(), (driver) => {
					deferred.resolve(driver);
				}).catch((err) => {
					deferred.reject(err);
				});
			} else {
				deferred.reject(err);
			}
		});
		return deferred.promise;
	}
});