const Chance = require('chance');
const chance = new Chance();
const debug = require('debug')('deviceManager');
debug.log = console.log.bind(console);

const cviAsset = app_module_require("cvi-node-lib").asset;
const iotfAppClient = app_module_require('iotfclient').iotfAppClient;

const VENDOR_NAME = process.env.SIMULATOR_VENDOR || "IBM";
const ERROR_ON_VEHICLE_INCONSISTENT = process.env.ERROR_ON_VEHICLE_INCONSISTENT || false;

class DeviceManager {

	constructor() {
		if (process.env.VCAP_SERVICES || process.env.USER_PROVIDED_VCAP_SERVICES) {
			const userVcapSvc = JSON.parse(process.env.USER_PROVIDED_VCAP_SERVICES || '{}');
			const vcapSvc = Object.assign(JSON.parse(process.env.VCAP_SERVICES), userVcapSvc);
			const iotf_service = vcapSvc["iotf-service"] && vcapSvc["iotf-service"][0].credentials;
			if (iotf_service) {
				this.mqttAccessInfo = {
					mqttEndpoint: `mqtts://${iotf_service.mqtt_host}:${iotf_service.mqtt_s_port}`,
					username: "use-token-auth"
				};
			}
		} else if (process.env.IOTP_SERVICE_MQTT_ENDPOINT) {
			this.mqttAccessInfo = {
				mqttEndpoint: process.env.IOTP_SERVICE_MQTT_ENDPOINT,
				username: "use-token-auth"
			}
		}
		this.httpAccessInfo = {
			httpEndpoint: cviAsset.assetConfig.vdh.baseURL + "/carProbe",
			username: cviAsset.assetConfig.vdh.username,
			password: cviAsset.assetConfig.vdh.password
		};

		this._initialize();
	}

	async _initialize() {
		if (this.isIoTPlatformAvailable()) {
			let deviceType = await this.getDeviceType(VENDOR_NAME);
			if (!deviceType) {
				deviceType = await this.registerDeviceType(VENDOR_NAME);
			}
			debug(deviceType);
		}

		let vendor = await cviAsset.getVendor(VENDOR_NAME).catch(async error => {
			if (error.statusCode === 404) {
				return await cviAsset.addVendor({
					"vendor": VENDOR_NAME,
					"type": "Vendor",
					"status": "Active",
					"model": "TCU",
					"description": VENDOR_NAME
				});
			}
			return Promise.reject(error);
		});
		debug(vendor);

		deleteUnusedDevices();
	}
	isIoTPlatformAvailable() {
		return !!iotfAppClient;
	}
	/**
	 * Remove IoTP devices which is not in CVI asset
	 */
	async deleteUnusedDevices() {
		const vehicles = await cviAsset.getVehicleList({ "vendor": VENDOR_NAME });
		const devices = await iotfAppClient.getAllDevices({ "typeId": VENDOR_NAME });

		const vehiclemap = {};
		vehicles.data.forEach(vehicle => {
			vehiclemap[vehicle.mo_id.toUpperCase()] = vehicle;
		});
		const deleteDevices = [];
		devices.results.forEach(device => {
			if (!vehiclemap[device.deviceId.toUpperCase()]) {
				deleteDevices.push({ "typeId": VENDOR_NAME, "deviceId": device.deviceId });
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

	async getDeviceType(deviceType) {
		const type = await iotfAppClient.getDeviceType(deviceType).catch(error => {
			if (error.status === 404) {
				return null;
			}
			return Promise.reject(error);
		});
		return type;
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
			"mo_id": chance.hash({ length: 10 }),
			"serial_number": "s-" + chance.hash({ length: 6 }),
			"status": "active",
			"properties": {}
		}, vehicle || {});
		vehicle.vendor = VENDOR_NAME; // Force use vendor specified in the application side
		if (cviAsset.acceptVehicleProperties()) {
			vehicle.properties["TCU_ID"] = tcuId;
		} else {
			delete vehicle.properties;
		}

		vehicle.iotcvusealtid = true;
		vehicle.iotcvaltmoid = vehicle.iotcvaltmoid || vehicle.mo_id;
		const response = await cviAsset.addVehicle(vehicle, false);

		let device = {};
		if (protocol === "mqtt") {
			if (!this.isIoTPlatformAvailable()) {
				return { "statusCode": 400, "message": "IoT Platform is not available. Use HTTP to send car probe." };
			}
			device = await iotfAppClient.getDevice(VENDOR_NAME, vehicle.mo_id).catch(error => {
				if (error && error.status === 404) {
					return null;
				}
			});
			if (device) {
				if (ERROR_ON_VEHICLE_INCONSISTENT) {
					return Promise.reject({ "statusCode": 500, "message": `Device with id=${vehicle.mo_id} has already been existing.` });
				} else {
					await iotfAppClient.unregisterDevice(VENDOR_NAME, vehicle.mo_id);
				}
			}

			const deviceInfo = {};
			if (vehicle.serial_number) {
				deviceInfo.serialNumber = vehicle.serial_number;
			}
			device = await iotfAppClient.registerDevice(VENDOR_NAME, vehicle.mo_id, null, deviceInfo);
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
				device = await iotfAppClient.getDevice(VENDOR_NAME, mo_id).catch(async error => {
					if (error && error.status === 404) {
						if (ERROR_ON_VEHICLE_INCONSISTENT) {
							return Promise.reject({ "statusCode": 404, "message": "CVI Vehicle and IoTP Device are inconcistent." });
						}
						return null;
					}
					return Promise.reject(error);
				});
				if (device) {
					await iotfAppClient.unregisterDevice(VENDOR_NAME, vehicle.mo_id);
				}
				const deviceInfo = vehicle.serial_number ? { "serialNumber": vehicle.serial_number } : {};
				device = await iotfAppClient.registerDevice(VENDOR_NAME, vehicle.mo_id, null, deviceInfo);
			}
			return this._extractAccessInfo(Object.assign(device, vehicle));
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
				await iotfAppClient.unregisterDevice(VENDOR_NAME, vehicle.mo_id);
			}
			return vehicle;
		} else {
			return Promise.reject({ "statusCode": 404, "message": "Not Found" });
		}
	}
	async deleteVehicle(mo_id) {
		const vehicle = await cviAsset.deleteVehicle(mo_id);
		if (this.isIoTPlatformAvailable()) {
			await iotfAppClient.unregisterDevice(VENDOR_NAME, mo_id);
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
