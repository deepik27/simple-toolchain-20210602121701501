/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
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
let wiotpsdk = require("@wiotp/sdk");

var util = require('util');
var EventEmitter = require('events');
var _ = require('underscore');
var fs = require('fs-extra');
var appEnv = require("cfenv").getAppEnv();

var getDevicesConfigs, getCredentials;
BM_APPLICATION_ID = appEnv.app.application_id || process.env.USER_PROVIDED_BM_APPLICATION_ID;

function iotfClient(options) {
	if (!(this instanceof iotfClient)) {
		return new iotfClient(options);
	}
	options = (options) ? options : {};
	EventEmitter.call(this);
	var iotfConfig = getCredentials();
	if (!iotfConfig) {
		console.log("IoT Platform service is not available");
		return;
	}
	this.iotfAppClient = new wiotpsdk.ApplicationClient(iotfConfig);
	if (process.env.STAGE1) {
		this.iotfAppClient.staging = true;
	};
	this.devicesConfigs = [];
	if (options.configFile) {
		this.devicesConfigs = getDevicesConfigs(options.configFile);
		if (options.configs) {
			this.devicesConfigs = options.configs;
		}
		if (options.config) {
			this.devicesConfigs.push(options.config);
		}
		this.createCommandsMethods();
		this.iotfAppClient.on("connect", _.bind(this.subscribeToDevices, this));
		this.iotfAppClient.on("deviceEvent", _.bind(this.onDeviceEvent, this));
		this.iotfAppClient.on("deviceStatus", _.bind(this.onDeviceStatus, this));
		this.iotfAppClient.on("deviceCommand", _.bind(this.onDeviceCommand, this));
	}
	this.iotfAppClient.connect();
}

module.exports = iotfClient;
//Inherit functions from `EventEmitter`'s prototype
util.inherits(iotfClient, EventEmitter);

iotfClient.prototype.onDeviceStatus = function (deviceType, deviceId, payload, topic) {
	payload = JSON.parse(payload);
	this.emit(deviceId + "_" + payload.Action, deviceType, deviceId, payload, topic);
	this.emit(deviceType + "_" + payload.Action, deviceType, deviceId, payload, topic);
	this.emit("+_" + payload.Action, deviceType, deviceId, payload, topic);
	this.emit("+_DeviceStatus", deviceType, deviceId, payload, topic);
};

iotfClient.prototype.onDeviceEvent = function (deviceType, deviceId, eventType, format, payload) {
	payload = (format === 'json') ? JSON.parse(payload).d : payload;
	this.emit(deviceId + "_+", payload, deviceType, deviceId, eventType, format);
	this.emit(deviceId + "_" + payload, deviceType, deviceId, eventType, format);
	this.emit(deviceType + "_+", payload, deviceType, deviceId, eventType, format);
	this.emit(deviceType + "_" + payload, deviceType, deviceId, eventType, format);
	this.emit("+", payload, deviceType, deviceId, eventType, format);
};

iotfClient.prototype.onDeviceCommand = function (deviceType, deviceId, cmdType, format, payload, topic) {
	if (format === "json") {
		const parsed = JSON.parse(payload);
		payload = parsed.d || parsed;
	}
	this.emit(deviceId + "_" + cmdType, payload, deviceType, deviceId, cmdType, format);
	this.emit(deviceType + "_" + cmdType, payload, deviceType, deviceId, cmdType, format);
	this.emit("+_" + cmdType, payload, deviceType, deviceId, cmdType, format);
	this.emit("+_DeviceCommand", payload, deviceType, deviceId, cmdType, format);
}

iotfClient.prototype.subscribeToDevices = function () {
	_.each(this.devicesConfigs, function (config) {
		config.deviceType = (config.deviceType) ? config.deviceType : ["+"];
		config.Ids = (config.Ids) ? config.Ids : ["+"];
		config.events = (config.events) ? config.events : ["+"];
		config.commands = config.commands || ["+"];
		if (config.subscribeToStatus) {
			this.iotfAppClient.subscribeToDeviceStatus(config.deviceType, "+");
		}
		_.each(config.Ids, function (deviceID) {
			_.each(config.events, function (event) {
				this.iotfAppClient.subscribeToEvents(config.deviceType, deviceID, event, "json");
			}, this);
			_.each(config.commands, function (command) {
				this.iotfAppClient.subscribeToCommands(config.deviceType, deviceID, command, "json");
			}, this);
		}, this);
	}, this);
};

iotfClient.prototype.sendCommand = function (deviceType, deviceID, command, payload) {
	payload = (payload) ? payload : {};
	this.iotfAppClient.publishDeviceCommand(deviceType, deviceID, command, 'json', JSON.stringify(payload));
};

iotfClient.prototype.createCommandsMethods = function createCommandsMethonds() {
	//create send<message name>Message function
	_.each(this.devicesConfigs,
		function (config) {
			this[config.deviceType] = {};
			_.each(config.commands,
				function (command) {
					// generate the camelized function
					var functionName = ('send_' + command.name + '_Message').replace(/(\-|\_)(\w)/g, function (all, g1, g2) { return g2.toUpperCase(); })
					var funct = _.bind(function (deviceID, payload) {
						return this.sendCommand(config.deviceType, deviceID, command.name, payload);
					}, this);
					//set the method both on this and on this.<deviceType>
					this[functionName] = funct;
					this[config.deviceType][functionName] = funct;
				}, this);
		}, this);
};

getCredentials = function () {
	var iotfservices = VCAP_SERVICES["iotf-service"];
	if (!iotfservices || iotfservices.length === 0) {
		if (process.env.USER_PROVIDED_VCAP_SERVICES) {
			var vcap = JSON.parse(process.env.USER_PROVIDED_VCAP_SERVICES);
			iotfservices = vcap["iotf-service"];
		}
		if (!iotfservices || iotfservices.length === 0) {
			return null;
		}
	}
	var iotFcreds = iotfservices[0].credentials;
	return new wiotpsdk.ApplicationConfig(
		{ "appId": BM_APPLICATION_ID },
		{
			"key": iotFcreds.apiKey,
			"token": iotFcreds.apiToken
		},
		{
			"logLevel": "debug",
			"mqtt": {
				"instanceId": iotFcreds.org
			}
		}
	);
};

getDevicesConfigs = function getDevicesConfigs(file) {
	var obj = fs.readJsonSync(file, { throws: false });
	if (!obj) {
		console.error("cannot load devices info file");
		obj = {};
	}
	return obj;
};
