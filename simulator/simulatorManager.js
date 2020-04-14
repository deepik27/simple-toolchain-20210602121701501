/**
 * Copyright 2017,2019 IBM Corp. All Rights Reserved.
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
const simulatorManager = module.exports = {};

const Q = require('q');
const _ = require('underscore');
const appEnv = require("cfenv").getAppEnv();
const wsConnection = require('../routes/user/wsConnection.js');
const simulatorEngine = require('./simulatorEngine.js');

const debug = require('debug')('simulatedVehicleManager');
debug.log = console.log.bind(console);

const DEFAULT_CLIENT_ID = 'default_simulator';
const DEFAULT_MAX_VEHICLES = (process.env.MAX_SIMULATOR_VEHICLES && parseInt(process.env.MAX_SIMULATOR_VEHICLES)) || 50;
const DEFAULT_NUM_VEHICLES = Math.min((process.env.DEFAULT_SIMULATOR_VEHICLES && parseInt(process.env.DEFAULT_SIMULATOR_VEHICLES)) || 5, DEFAULT_MAX_VEHICLES);
const DEFAULT_TIMEOUT = (process.env.DEFAULT_SIMULATOR_TIMEOUT && parseInt(process.env.DEFAULT_SIMULATOR_TIMEOUT)) || 10;
const SIMULATOR_MONITOR_WSS_ID = "simulator_monitor";

/*
 * Manage simulator engines per client
 */
_.extend(simulatorManager, {
	simulatorInfoMap: {},
	messageQueue: {},

	/**
	 * Create a simulator engine for given client. Default client is created if the clientId is not specified.
	 * Created simulator engine enables specified number of vehicles within area of (longitude, latitude, distance(m)).
	 */
	create: function (clientId, numVehicles, preferred, longitude, latitude, distance, timeoutInMinutes, noErrorOnExist) {

		if (isNaN(longitude) || isNaN(latitude)) {
			return Q.reject({ statusCode: 400, message: 'Invalid longitude or latitude parameter' });
		}
		if (numVehicles > DEFAULT_MAX_VEHICLES || (preferred && preferred.length > DEFAULT_MAX_VEHICLES)) {
			return Q.reject({ statusCode: 400, message: "Too many simulated vehicles are requested. maximum number of vehicles is " + DEFAULT_MAX_VEHICLES + "." });
		}

		// check if the simulator already exists or not
		timeoutInMinutes = timeoutInMinutes !== undefined ? timeoutInMinutes : DEFAULT_TIMEOUT;
		simulatorInfoMap = this.simulatorInfoMap;
		clientId = clientId || DEFAULT_CLIENT_ID;

		let excludes = [];
		let invalidSimulatorKeys = [];
		_.each(simulatorInfoMap, (value, key) => {
			if (value.simulator && value.simulator.isValid()) {
				if (value.simulator.clientId != clientId) {
					excludes = _.union(excludes, _.pluck(value.simulator.getVehicleList(-1, 0, ['vehicleId']), 'vehicleId'));
				}
			}
			else {
				// probably automatically closed
				invalidSimulatorKeys.push(key);
			}
		});
		_.each(invalidSimulatorKeys, (key) => {
			delete simulatorInfoMap[key];
		});
		perferrd = _.difference(preferred, excludes);

		let simulator = simulatorInfoMap[clientId] && simulatorInfoMap[clientId].simulator;
		if (simulator) {
			if (noErrorOnExist) {
				let current = _.pluck(simulator.getVehicleList(-1, 0, ['vehicleId']), 'vehicleId');
				if ((perferrd.length == 0 && numVehicles == 0) || (perferrd.length == current.length && !_.difference(preferred, current))) {
					simulator.setTimeout(timeoutInMinutes);
					simulator.updateTime();
//					simulator.updateBaseLocation(longitude, latitude, distance);
					return Q(simulator.getInformation());
				} else {
					return simulator.updateVehicles(preferred, excludes, longitude, latitude, distance, timeoutInMinutes);
				}
			} else {
				return Q.reject({ statusCode: 400, message: "simulator already exist." });
			}
		} else {
			numVehicles = numVehicles || DEFAULT_NUM_VEHICLES;
			if (numVehicles < 1) numVehicles = 5;
			if (numVehicles > DEFAULT_MAX_VEHICLES) {
				return Q.reject({ statusCode: 400, message: "Too many simulated vehicles are requested. maximum number of vehicles is " + DEFAULT_MAX_VEHICLES + "." });
			}
			simulator = new simulatorEngine(clientId, timeoutInMinutes);
			simulatorInfoMap[clientId] = { clientId: clientId, simulator: simulator };
			return simulator.open(numVehicles, preferred, excludes, longitude, latitude, distance);
		}
	},

	/**
	 * Terminate a simulator and release all resources. All vehicles are stopped if they are running.
	 */
	release: function (clientId, timeoutInMinutes) {
		clientId = clientId || DEFAULT_CLIENT_ID;

		simulatorInfoMap = this.simulatorInfoMap;
		let simulatorInfo = simulatorInfoMap[clientId];
		if (!simulatorInfo) {
			return Q.reject({ statusCode: 404, message: "simulator does not exist." });
		}

		if (!timeoutInMinutes || timeoutInMinutes == 0) {
			delete simulatorInfoMap[clientId];
			delete this.messageQueue[clientId];
			if (_.isEmpty(this.messageQueue) && this.intervalHandle) {
				clearInterval(this.intervalHandle);
				delete this.intervalHandle;
			}
	
			return Q.when(simulatorInfo.simulator.close());
		} else {
			simulatorInfo.simulator.setTimeout(timeoutInMinutes);
			simulatorInfo.simulator.updateTime();
			return Q.when(simulatorInfo.simulator.getInformation());
		}
	},
	
	/**
	 * Get list of simulator information
	 */
	getSimulatorList: function () {
		let simulatorList = [];
		_.each(this.simulatorInfoMap, (simulatorInfo, key) => {
			simulatorList.push({ clientId: key, simulatorInfo: simulatorInfo.simulator.getInformation() });
		});
		return simulatorList;
	},

	/**
	 * Get a simulator information of given clientId
	 */
	getSimulator: function (clientId) {
		clientId = clientId || DEFAULT_CLIENT_ID;
		let simulatorInfo = this.simulatorInfoMap[clientId];
		if (!simulatorInfo) {
			return Q.reject({ statusCode: 404, message: "simulator not found" });
		}
		return Q(simulatorInfo.simulator);
	},

	/**
	 * Create a websocket connection to monitor vehicle status
	 */
	watchStatus: function (server, path) {
		if (wsConnection.isCreated(SIMULATOR_MONITOR_WSS_ID)) {
			return; // already created
		}

		//
		// Create WebSocket server
		//
		const sendClosedMessageToClient = (clientId, message, json) => {
			if (json) {
				message = JSON.stringify(message);
			}
			try {
				_.each(wsConnection.getClients(SIMULATOR_MONITOR_WSS_ID), (client) => {
					const data = wsConnection.getAppData(client);
					if (client.callbackOnClose && data.clientId === clientId) {
						client.send(message);
					}
				});
			} catch (error) {
				console.error('socket error: ' + error);
			}
		};

		const flushQueue = () => {
			try {
				const clients = wsConnection.getClients(SIMULATOR_MONITOR_WSS_ID);
				let clientsById = {};
				_.each(Array.from(clients), (client) => {
					const data = wsConnection.getAppData(client);
					if (!clientsById[data.clientId]) {
						clientsById[data.clientId] = [client];
					} else {
						clientsById[data.clientId].push(client);
					}
				});

				_.each(clientsById, (clients, clientId) => {
					let myMessageQueue = this.messageQueue[clientId];
					if (!myMessageQueue || _.isEmpty(myMessageQueue)) {
						return;
					}
					this.messageQueue[clientId] = {};
					_.each(clients, (client) => {
						let data = wsConnection.getAppData(client);
						let vehicleMessage = data && myMessageQueue[data.vehicleId];
						if (!_.isEmpty(vehicleMessage)) {
							client.send(JSON.stringify({ data: vehicleMessage }));
						}
					});
				});
			} catch (error) {
				console.error('socket error: ' + error);
			}
		};

		const sendMessageToClient = (clientId, vehicleId, message, json) => {
			let myMessageQueue = this.messageQueue[clientId];
			if (!myMessageQueue) {
				return;
			}
			if (vehicleId) {
				if (!myMessageQueue[vehicleId])
					myMessageQueue[vehicleId] = [];
				myMessageQueue[vehicleId].push(message);
			}
		};

		const callbackOnClose = (clientId, timeout) => {
			sendClosedMessageToClient(clientId, { type: 'closed', reason: timeout ? 'timeout' : 'normal' }, true);
			if (this.simulatorInfoMap[clientId]) {
				delete this.simulatorInfoMap[clientId];
			}
		};

		const watchMethod = (appdata, enable) => {
			let clientId = appdata.clientId || DEFAULT_CLIENT_ID;
			let vehicleId = appdata.vehicleId;
			simulatorInfoMap = this.simulatorInfoMap;
			let simulatorInfo = simulatorInfoMap[clientId];
			if (simulatorInfo) {
				if (appdata.callbackOnClose) {
					simulatorInfo.simulator.setCallbackOnClose(enable ? callbackOnClose : undefined);
				} else {
					simulatorInfo.simulator.watchStatus(vehicleId, appdata.properties, enable ? (data) => {
						if (data.error) {
							console.error("error: " + JSON.stringify(data.error));
						}
						sendMessageToClient(clientId, vehicleId, data, true);
					} : undefined);
				}
			} else {
				console.log("simulator does not exist.");
			}
		};

		wsConnection.create(SIMULATOR_MONITOR_WSS_ID, server, path, (request) => {
			let data = {};
			let url = request.url;
			let qsIndex = url.indexOf('?');
			if (qsIndex >= 0) {
				_.each(url.substring(qsIndex + 1).split('&'), (qs) => {
					let params = qs.split('=');
					if (params.length == 2) {
						if (params[0] === 'clientId')
							data.clientId = params[1];
						else if (params[0] === 'vehicleId')
							data.vehicleId = params[1];
						else if (params[0] === 'properties')
							data.properties = params[1].split(',');
						else if (params[0] === 'close')
							data.callbackOnClose = params[1] === 'true';
					}
				});
				if (data.clientId && !this.messageQueue[data.clientId]) {
					this.messageQueue[data.clientId] = {};
				}
			}
			watchMethod(data, true);

			if (!this.intervalHandle) {
				this.intervalHandle = setInterval(flushQueue, 1000);
			}
			return data;
		}, (data) => {
			console.log("client is disconnected. id=" + data.clientId + ", vid=" + data.vehicleId);
			watchMethod(data, false);
		}, (message, data) => {
			try {
				let messageObj = JSON.parse(message);
				if (messageObj.type === 'heartbeat') {
					simulatorInfoMap = this.simulatorInfoMap;
					let simulatorInfo = simulatorInfoMap[messageObj.clientId];
					if (simulatorInfo) {
						simulatorInfo.simulator.updateTime(true);
						// console.log("recieved heartbeat message. clientId = " + messageObj.clientId);
					} else {
						sendClosedMessageToClient(clientId, { type: 'closed', reason: 'heartbeat' }, true);
					}
				}
			} catch (e) {
				console.error("websocket message parse error. message = " + message);
			}
	 	}, (error, data) => {
			console.log("error with client id=" + data.clientId + ", vid=" + data.vehicleId);
		});
	}
});