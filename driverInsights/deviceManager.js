/**
 * Copyright 2019 IBM Corp. All Rights Reserved.
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
const Chance = require('chance');
const chance = new Chance();
const debug = require('debug')('deviceManager');
debug.log = console.log.bind(console);

const cviAsset = app_module_require("cvi-node-lib").asset;
const mqttConfig = app_module_require("mqttclient").mqttConfig;
const wiotpDeviceApi = app_module_require('mqttclient').wiotpDeviceApi;

const SEND_PROBE_USER_AGENT = process.env.SEND_PROBE_USER_AGENT || "IBM IoT Connected Vehicle Insights Client";
const VENDOR_NAME = process.env.SIMULATOR_VENDOR || "IBM";
const DEVICE_TYPE = process.env.DEVICE_TYPE || "TCU";
const ERROR_ON_VEHICLE_INCONSISTENT = process.env.ERROR_ON_VEHICLE_INCONSISTENT || false;

class DeviceManager {

	constructor() {
		if (mqttConfig.org) {
			this.mqttAccessInfo = {
				tenant_id: cviAsset.assetConfig.tenant_id || "public",
				vendor: DEVICE_TYPE,
				endpoint: mqttConfig.org,
				username: "use-token-auth"
			};
		}
		this.httpAccessInfo = {
			tenant_id: cviAsset.assetConfig.tenant_id || "public",
			vendor: DEVICE_TYPE,
			endpoint: cviAsset.assetConfig.vdh.baseURL + "/carProbe",
			userAgent: SEND_PROBE_USER_AGENT,
			username: cviAsset.assetConfig.vdh.username,
			password: cviAsset.assetConfig.vdh.password
		};

		this._initialize();
	}

	async _initialize() {
		let vendors = await cviAsset.getVendorList({ "name": VENDOR_NAME });
		debug(vendors);
		if (vendors && vendors.data && vendors.data.length > 0) {
			this.vendor_id = vendors.data[0].vendor;
		} else {
			this.vendor_id = chance.hash({ length: 12 });
			await cviAsset.addVendor({
				"vendor": this.vendor_id,
				"type": "Vendor",
				"status": "Active",
				"name": VENDOR_NAME,
				"description": VENDOR_NAME
			});
		}

		if (this.isIoTPlatformAvailable()) {
			let deviceType = await wiotpDeviceApi.getDeviceType(DEVICE_TYPE).catch(async error => {
				if (error.status === 404) {
					return await wiotpDeviceApi.registerDeviceType(DEVICE_TYPE);
				}
				return Promise.reject(error);
			});
			debug(deviceType);

			this.deleteUnusedDevices();
		}
	}
	isIoTPlatformAvailable() {
		return wiotpDeviceApi.isIoTPlatformAvailable;
	}
	/**
	 * Remove IoTP devices which is not in CVI asset
	 */
	async deleteUnusedDevices() {
		if (!this.isIoTPlatformAvailable()) {
			return;
		}

		const vehiclearray = [];
		const params = { "model": DEVICE_TYPE, num_rec_in_page: 100, num_page: 1 }
		while (true) {
			try {
				const vehicles = await cviAsset.getVehicleList(params);
				vehicles.data.forEach(vehicle => {
					vehiclearray.push(vehicle.mo_id.toUpperCase());
				});
				params.num_page++;
				if (vehicles.data.length < params.num_rec_in_page) {
					break;
				}
			} catch (e) {
				if (!e.response || e.response.statusCode !== 400)
					return Promise.reject(error);
				// Probably end of pages
				break;
			}
		}

		const deleteDevices = [];
		if (this.isIoTPlatformAvailable()) {
			const devices = await wiotpDeviceApi.getAllDevices({ "typeId": DEVICE_TYPE });
			devices.results.forEach(device => {
				if (!vehiclearray.includes(device.deviceId.toUpperCase())) {
					deleteDevices.push({ "typeId": DEVICE_TYPE, "deviceId": device.deviceId });
				}
			});
			if (deleteDevices.length > 0) {
				const response = await wiotpDeviceApi.deleteMultipleDevices(deleteDevices).catch(error => {
					// Workaround of defect of iotf client
					if (error.message.indexOf("Expected HTTP 201 from server but got HTTP 202.") > 0) {
						return deleteDevices.map(d => { d.success = true; return d; });
					}
					return Promise.reject(error);
				});
				debug(JSON.stringify(response));
			}
		}
		return `${deleteDevices.length} of devices are deleted.`;
	}

	/**
	 * Create a vehicle on both of IoT Platform and IoT Connected Vehicle Insights with same id
	 * Recreate another device if the vehicle has already been on IoT Platform
	 *
	 * @param {String} tcuId
	 * @param {Object} vehicle Vehicle information to be created. Use default
	 * @param {String} protocol "mqtt" | "http"
	 */
	async addVehicle(tcuId, vehicle, protocol) {
		vehicle = Object.assign({
			"mo_id": chance.hash({ length: 6 }).toUpperCase(),
			"serial_number": "s-" + chance.hash({ length: 6 }),
			"status": "active",
			"model": "TCU",
			"vendor": this.vendor_id,
			"properties": {}
		}, vehicle || {});
		if (cviAsset.acceptVehicleProperties()) {
			vehicle.properties["TCU_ID"] = tcuId;
			vehicle.properties["fueltank"] = 60;
		} else {
			delete vehicle.properties;
		}

		vehicle.iotcvusealtid = true;
		vehicle.iotcvaltmoid = (vehicle.iotcvaltmoid || vehicle.mo_id).toUpperCase(); // Alternate MO ID is case sensitive and MO_ID will be stored as uppercase.
		const response = await cviAsset.addVehicle(vehicle, false);

		let device = {};
		if (protocol === "mqtt") {
			if (!this.isIoTPlatformAvailable()) {
				return { "statusCode": 400, "message": "IoT Platform is not available. Use HTTP to send car probe." };
			}
			device = await wiotpDeviceApi.getDevice(DEVICE_TYPE, vehicle.mo_id).catch(error => {
				if (error && error.status === 404) {
					return null;
				}
			});
			if (device) {
				if (ERROR_ON_VEHICLE_INCONSISTENT) {
					return Promise.reject({ "statusCode": 409, "message": `Device with id=${vehicle.mo_id} has already been existing.` });
				} else {
					await wiotpDeviceApi.unregisterDevice(DEVICE_TYPE, vehicle.mo_id);
				}
			}

			const deviceInfo = {};
			if (vehicle.serial_number) {
				deviceInfo.serialNumber = vehicle.serial_number;
			}
			device = await wiotpDeviceApi.registerDevice(DEVICE_TYPE, vehicle.mo_id, null, deviceInfo);
		}

		return this._extractAccessInfo(Object.assign(device, response));
	}

	/**
	 * Get access information for a vehicle that associated with tcuId
	 * Recreate another device if if ERROR_ON_VEHICLE_INCONSISTENT
	 *
	 * @param {*} tcuId
	 * @param {*} protocol "mqtt" | "http"
	 */
	async getVehicleByTcuId(tcuId, protocol) {
		const vehicles = await cviAsset.getVehicleList(null, { "TCU_ID": tcuId }).catch(error => {
			if (error.statusCode === 404) {
				return;
			}
		});
		if (vehicles && vehicles.data && vehicles.data.length > 0) {
			const vehicle = vehicles.data[0];
			const mo_id = vehicle.mo_id;
			let device;
			if (protocol === "mqtt" && this.isIoTPlatformAvailable()) {
				device = await wiotpDeviceApi.getDevice(DEVICE_TYPE, mo_id).catch(async error => {
					if (error && error.status === 404) {
						if (ERROR_ON_VEHICLE_INCONSISTENT) {
							return Promise.reject({ "statusCode": 404, "message": "CVI Vehicle and IoTP Device are inconcistent." });
						}
						return null;
					}
					return Promise.reject(error);
				});
				if (device) {
					await wiotpDeviceApi.unregisterDevice(DEVICE_TYPE, vehicle.mo_id);
				}
				const deviceInfo = vehicle.serial_number ? { "serialNumber": vehicle.serial_number } : {};
				device = await wiotpDeviceApi.registerDevice(DEVICE_TYPE, vehicle.mo_id, null, deviceInfo);
			}
			return this._extractAccessInfo(Object.assign(device || {}, vehicle));
		}
		return Promise.reject({ "statusCode": 404, "message": `Vehicle with TCU_ID=${tcuId} is not found.` });
	}
	async deleteVehicleByTcuId(tcuId) {
		const vehicles = await cviAsset.getVehicleList(null, { "TCU_ID": tcuId }).catch(error => {
			if (error.statusCode === 404) {
				return;
			}
		});
		if (vehicles.data && vehicles.data.length > 0) {
			let vehicle = vehicles.data[0];
			vehicle = await cviAsset.deleteVehicle(vehicle.mo_id);
			if (this.isIoTPlatformAvailable()) {
				await wiotpDeviceApi.unregisterDevice(DEVICE_TYPE, vehicle.mo_id);
			}
			return vehicle;
		} else {
			return Promise.reject({ "statusCode": 404, "message": "Not Found" });
		}
	}
	async deleteVehicle(mo_id) {
		const vehicle = await cviAsset.deleteVehicle(mo_id);
		if (this.isIoTPlatformAvailable()) {
			await wiotpDeviceApi.unregisterDevice(DEVICE_TYPE, mo_id).catch(error => {
				if (error.statusCode === 404) {
					// The vehicle is not associated with IoTP
					return null;
				}
			});
		}
		return vehicle;
	}

	_extractAccessInfo(vehicle, protocol) {
		if (protocol === "mqtt" || (!protocol && vehicle.clientId)) {
			return Object.assign(this.mqttAccessInfo, {
				clientId: vehicle.clientId,
				password: vehicle.authToken,
				"mo_id": vehicle.mo_id
			});
		} else {
			return Object.assign(this.httpAccessInfo, { "mo_id": vehicle.mo_id });
		}
	}
}

module.exports = DeviceManager = new DeviceManager();
