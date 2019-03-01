const Chance = require('chance');
const chance = new Chance();
const debug = require('debug')('deviceManager');
debug.log = console.log.bind(console);

const cviAsset = app_module_require("cvi-node-lib").asset;
const iotfAppClient = app_module_require('iotfclient').iotfAppClient;

const VENDOR_NAME = process.env.SIMULATOR_VENDOR || "IBM";
const DEVICE_TYPE = process.env.DEVICE_TYPE || "TCU";
const ERROR_ON_VEHICLE_INCONSISTENT = process.env.ERROR_ON_VEHICLE_INCONSISTENT || false;

class DeviceManager {

	constructor() {
		if (process.env.VCAP_SERVICES || process.env.USER_PROVIDED_VCAP_SERVICES) {
			const userVcapSvc = JSON.parse(process.env.USER_PROVIDED_VCAP_SERVICES || '{}');
			const vcapSvc = Object.assign(JSON.parse(process.env.VCAP_SERVICES), userVcapSvc);
			const iotf_service = vcapSvc["iotf-service"] && vcapSvc["iotf-service"][0].credentials;
			if (iotf_service) {
				this.mqttAccessInfo = {
					vendor: DEVICE_TYPE,
					endpoint: iotf_service.org,
					username: "use-token-auth"
				};
			}
		} else if (process.env.IOTP_SERVICE_ORG) {
			this.mqttAccessInfo = {
				vendor: DEVICE_TYPE,
				endpoint: process.env.IOTP_SERVICE_ORG,
				username: "use-token-auth"
			}
		}
		this.httpAccessInfo = {
			vendor: DEVICE_TYPE,
			endpoint: cviAsset.assetConfig.vdh.baseURL + "/carProbe",
			username: cviAsset.assetConfig.vdh.username,
			password: cviAsset.assetConfig.vdh.password
		};

		this._initialize();
	}

	async _initialize() {
		let vendor = await cviAsset.getVendor(VENDOR_NAME).catch(async error => {
			if (error.statusCode === 404) {
				return await cviAsset.addVendor({
					"vendor": chance.hash({ length: 12 }),
					"type": "Vendor",
					"status": "Active",
					"description": VENDOR_NAME
				});
			}
			return Promise.reject(error);
		});
		debug(vendor);

		if (this.isIoTPlatformAvailable()) {
			let deviceType = await iotfAppClient.getDeviceType(DEVICE_TYPE).catch(async error => {
				if (error.status === 404) {
					return await iotfAppClient.registerDeviceType(DEVICE_TYPE);
				}
				return Promise.reject(error);
			});
			debug(deviceType);

			this.deleteUnusedDevices();
		}
	}
	isIoTPlatformAvailable() {
		return !!iotfAppClient;
	}
	/**
	 * Remove IoTP devices which is not in CVI asset
	 */
	async deleteUnusedDevices() {
		if (!this.isIoTPlatformAvailable()) {
			return;
		}
		const vehicles = await cviAsset.getVehicleList({ "vendor": VENDOR_NAME });
		const devices = await iotfAppClient.getAllDevices({ "typeId": DEVICE_TYPE });

		const vehiclemap = {};
		vehicles.data.forEach(vehicle => {
			vehiclemap[vehicle.mo_id.toUpperCase()] = vehicle;
		});
		const deleteDevices = [];
		devices.results.forEach(device => {
			if (!vehiclemap[device.deviceId.toUpperCase()]) {
				deleteDevices.push({ "typeId": DEVICE_TYPE, "deviceId": device.deviceId });
			}
		});
		if (deleteDevices.length > 0) {
			const response = await iotfAppClient.deleteMultipleDevices(deleteDevices).catch(error => {
				// Workaround of defect of iotf client
				if (error.message.indexOf("Expected HTTP 201 from server but got HTTP 202.") > 0) {
					return deleteDevices.map(d => { d.success = true; return d; });
				}
				return Promise.reject(error);
			});
			debug(JSON.stringify(response));
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
			"properties": {}
		}, vehicle || {});
		vehicle.vendor = VENDOR_NAME; // Force use vendor specified in the application side
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
			device = await iotfAppClient.getDevice(DEVICE_TYPE, vehicle.mo_id).catch(error => {
				if (error && error.status === 404) {
					return null;
				}
			});
			if (device) {
				if (ERROR_ON_VEHICLE_INCONSISTENT) {
					return Promise.reject({ "statusCode": 409, "message": `Device with id=${vehicle.mo_id} has already been existing.` });
				} else {
					await iotfAppClient.unregisterDevice(DEVICE_TYPE, vehicle.mo_id);
				}
			}

			const deviceInfo = {};
			if (vehicle.serial_number) {
				deviceInfo.serialNumber = vehicle.serial_number;
			}
			device = await iotfAppClient.registerDevice(DEVICE_TYPE, vehicle.mo_id, null, deviceInfo);
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
		if (vehicles.data && vehicles.data.length > 0) {
			const vehicle = vehicles.data[0];
			const mo_id = vehicle.mo_id;
			let device;
			if (protocol === "mqtt" && this.isIoTPlatformAvailable()) {
				device = await iotfAppClient.getDevice(DEVICE_TYPE, mo_id).catch(async error => {
					if (error && error.status === 404) {
						if (ERROR_ON_VEHICLE_INCONSISTENT) {
							return Promise.reject({ "statusCode": 404, "message": "CVI Vehicle and IoTP Device are inconcistent." });
						}
						return null;
					}
					return Promise.reject(error);
				});
				if (device) {
					await iotfAppClient.unregisterDevice(DEVICE_TYPE, vehicle.mo_id);
				}
				const deviceInfo = vehicle.serial_number ? { "serialNumber": vehicle.serial_number } : {};
				device = await iotfAppClient.registerDevice(DEVICE_TYPE, vehicle.mo_id, null, deviceInfo);
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
				await iotfAppClient.unregisterDevice(DEVICE_TYPE, vehicle.mo_id);
			}
			return vehicle;
		} else {
			return Promise.reject({ "statusCode": 404, "message": "Not Found" });
		}
	}
	async deleteVehicle(mo_id) {
		const vehicle = await cviAsset.deleteVehicle(mo_id);
		if (this.isIoTPlatformAvailable()) {
			await iotfAppClient.unregisterDevice(DEVICE_TYPE, mo_id).catch(error => {
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
