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
		if (this.mqttAccessInfo) {
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
					"description": VENDOR_NAME
				});
			}
			return Promise.reject(error);
		});
		debug(vendor);
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
	 *
	 * @param {String} id vehicle/device id
	 * @param {Object} vehicle
	 * @param {String} protocol "mqtt" | "http"
	 */
	async addVehicle(id, vehicle, protocol) {
		vehicle = Object.assign({
			"mo_id": chance.hash({ length: 10 }),
			"vendor": VENDOR_NAME,
			"serial_number": "s-" + chance.hash({ length: 6 }),
			"status": "active"
		}, vehicle || {});
		if (!cviAsset.acceptVehicleProperties()) {
			delete vehicle.properties;
		}

		vehicle.iotcvusealtid = true;
		vehicle.iotcvaltmoid = vehicle.iotcvaltmoid || vehicle.mo_id;
		const response = await cviAsset.addVehicle(vehicle, false);

		let device = {};
		if (protocol === "mqtt") {
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
	async getVehicleByTcuId(tcuId) {
		const vehicles = await cviAsset.getVehicleList(null, { "TCU_ID": tcuId }).catch(error => {
			if (error.statusCode === 404) {
				return;
			}
		});
		if (vehicles && vehicles.length > 0) {
			const mo_id = vehicles[0].mo_id;
			const device = await iotfAppClient.getDevice(VENDOR_NAME, mo_id).catch(async error => {
				if (error && error.status === 404) {
					if (ERROR_ON_VEHICLE_INCONSISTENT) {
						return Promise.reject({ "statusCode": 500, "message": "CVI Vehicle and IoTP Device are inconcistent." });
					}
					return await iotfAppClient.registerDevice(vehicle.vendor, vehicle.mo_id, null, deviceInfo);
				}
				return Promise.reject(error);
			});
			return Object.assign(device, vehicles[0]);
		}
		return Promise.reject({ "statusCode": 404, "message": `Vehicle with TCU_ID=${tcuId} is not found.` });
	}
	async getVehicle(id) {
		const vehicle = await cviAsset.getVehicle({ "mo_id": id });
		const device = await iotfAppClient.getDevice(VENDOR_NAME, id).catch(error => {
			if (error.status === 404) {
				error.statusCode = 404;
			}
			return Promise.reject(error);
		});
		if (device && vehicle) {
			return Object.assign(device, vehicle);
		} else {
			//TODO
		}
	}
	async getVehicleInfo(mo_id) {

	}
	async deleteVehicle() {
	}
	async getAllDevices(num_page, num_rec_in_page) {
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
