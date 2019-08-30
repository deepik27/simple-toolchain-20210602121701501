/**
 * Copyright 2017,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
const simulatorManager = module.exports = {};

const Q = require('q');
const _ = require('underscore');
const appEnv = require("cfenv").getAppEnv();
const WebSocketServer = require('ws').Server;
const simulatorEngine = require('./simulatorEngine.js');

const debug = require('debug')('simulatedVehicleManager');
debug.log = console.log.bind(console);

const DEFAULT_CLIENT_ID = 'default_simulator';
const DEFAULT_NUM_VEHICLES = (process.env.DEFAULT_SIMULATOR_VEHICLES && parseInt(process.env.DEFAULT_SIMULATOR_VEHICLES)) || 5;
const DEFAULT_TIMEOUT = (process.env.DEFAULT_SIMULATOR_TIMEOUT && parseInt(process.env.DEFAULT_SIMULATOR_TIMEOUT)) || 10;

/*
 * Manage simulator engines per client
 */
_.extend(simulatorManager, {
	wsServer: null,
	simulatorInfoMap: {},
	messageQueue: {},

	/**
	 * Create a simulator engine for given client. Default client is created if the clientId is not specified.
	 * Created simulator engine enables specified number of vehicles within area of (longitude, latitude, distance(m)).
	 */
	create: function (clientId, numVehilces, longitude, latitude, distance, timeoutInMinutes, noErrorOnExist) {

		if (isNaN(longitude) || isNaN(latitude)) {
			return Q.reject({ statusCode: 400, message: 'Invalid longitude or latitude parameter' });
		}

		// check if the simulator already exists or not
		timeoutInMinutes = timeoutInMinutes !== undefined ? timeoutInMinutes : DEFAULT_TIMEOUT;
		numVehicles = numVehilces || DEFAULT_NUM_VEHICLES;
		if (numVehicles < 1) numVehicles = 5;
		simulatorInfoMap = this.simulatorInfoMap;
		clientId = clientId || DEFAULT_CLIENT_ID;
		let simulatorInfo = simulatorInfoMap[clientId];
		if (simulatorInfo && simulatorInfo.simulator && simulatorInfo.simulator.isValid()) {
			if (noErrorOnExist) {
				simulatorInfo.simulator.setTimeout(timeoutInMinutes);
				simulatorInfo.simulator.updateBaseLocation(longitude, latitude, distance);
				return Q(simulatorInfo.simulator.getInformation());
			}
			return Q.reject({ statusCode: 400, message: "simulator already exist." });
		}

		let excludes = [];
		let invalidSimulatorKeys = [];
		_.each(simulatorInfoMap, (value, key) => {
			if (value.simulator.isValid()) {
				excludes = _.union(excludes, _.pluck(value.simulator.getVehicleList(-1, 0, ['vehicleId']), 'vehicleId'));
			}
			else {
				// probably automatically closed
				invalidSimulatorKeys.push(key);
			}
		});
		_.each(invalidSimulatorKeys, (key) => {
			delete simulatorInfoMap[key];
		});

		// create a simulator if not exist
		let deferred = Q.defer();
		simulator = new simulatorEngine(clientId, timeoutInMinutes);
		simulatorInfoMap[clientId] = { clientId: clientId, simulator: simulator };
		Q.when(simulator.open(numVehicles, excludes, longitude, latitude, distance), (result) => {
			deferred.resolve(result);
		}).catch((err) => {
			delete simulatorInfoMap[clientId];
			deferred.reject(err);
		});
		return deferred.promise;
	},

	/**
	 * Terminate a simulator and release all resources. All vehicles are stopped if they are running.
	 */
	release: function (clientId) {
		clientId = clientId || DEFAULT_CLIENT_ID;

		simulatorInfoMap = this.simulatorInfoMap;
		let simulatorInfo = simulatorInfoMap[clientId];
		if (!simulatorInfo) {
			return Q.reject({ statusCode: 404, message: "simulator does not exist." });
		}
		delete simulatorInfoMap[clientId];
		delete this.messageQueue[clientId];
		if (_.isEmpty(this.messageQueue) && this.intervalHandle) {
			clearInterval(this.intervalHandle);
			delete this.intervalHandle;
		}

		return Q.when(simulatorInfo.simulator.close());
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
	watch: function (server, path) {
		if (this.wsServer !== null) {
			return; // already created
		}

		//
		// Create WebSocket server
		//
		this.wsServer = new WebSocketServer({
			server: server,
			path: path,
			verifyClient: (info, callback) => { //only allow internal clients from the server origin
				let isLocal = appEnv.url.toLowerCase().indexOf('://localhost') !== -1;
				let isFromValidOrigin = ((typeof info.origin !== 'undefined') && (info.origin.toLowerCase() === appEnv.url.toLowerCase())) ? true : false;
				let allow = isLocal || isFromValidOrigin;
				if (!allow) {
					if (typeof info.origin !== 'undefined') {
						console.error("rejected web socket connection from external origin " + info.origin + " only connection from internal origin " + appEnv.url + " are accepted");
					} else {
						console.error("rejected web socket connection from unknown origin. Only connection from internal origin " + appEnv.url + " are accepted");
					}
				}
				if (!callback) {
					return allow;
				}
				let statusCode = (allow) ? 200 : 403;
				callback(allow, statusCode);
			}
		});

		const sendClosedMessageToClient = (clientId, message, json) => {
			if (json) {
				message = JSON.stringify(message);
			}
			try {
				_.each(this.wsServer.clients, (client) => {
					if (client.callbackOnClose && client.clientId === clientId) {
						client.send(message);
					}
				});
			} catch (error) {
				console.error('socket error: ' + error);
			}
		};

		const flushQueue = () => {
			try {
				let clientsById = _.groupBy(this.wsServer.clients, "clientId");
				_.each(clientsById, (clients, clientId) => {
					let myMessageQueue = this.messageQueue[clientId];
					if (!myMessageQueue || _.isEmpty(myMessageQueue)) {
						return;
					}
					this.messageQueue[clientId] = {};
					_.each(clients, (client) => {
						let vehicleMessage = myMessageQueue[client.vehicleId];
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

		const watchMethod = (client, enable) => {
			let clientId = client.clientId || DEFAULT_CLIENT_ID;
			let vehicleId = client.vehicleId;
			simulatorInfoMap = this.simulatorInfoMap;
			let simulatorInfo = simulatorInfoMap[clientId];
			if (simulatorInfo) {
				if (client.callbackOnClose) {
					simulatorInfo.simulator.setCallbackOnClose(enable ? callbackOnClose : undefined);
				} else {
					simulatorInfo.simulator.watch(vehicleId, client.properties, enable ? (data) => {
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

		//
		// Assign clientId and vehicleId to the client for each connection
		//
		this.wsServer.on('connection', (client) => {
			client.on('close', () => {
				console.log("client is disconnected. id=" + client.clientId + ", vid=" + client.vehicleId);
				watchMethod(client, false);
			});
			client.on('error', () => {
				console.log("error with client id=" + client.clientId + ", vid=" + client.vehicleId);
			});
			client.on('message', (message) => {
				try {
					let messageObj = JSON.parse(message);
					if (messageObj.type === 'heartbeat') {
						simulatorInfoMap = this.simulatorInfoMap;
						let simulatorInfo = simulatorInfoMap[messageObj.clientId];
						if (simulatorInfo) {
							simulatorInfo.simulator.updateTime(true);
							//							console.log("recieved heartbeat message. clientId = " + messageObj.clientId);
						} else {
							sendClosedMessageToClient(clientId, { type: 'closed', reason: 'heartbeat' }, true);
						}
					}
				} catch (e) {
					console.error("websocket message parse error. message = " + message);
				}
			});

			debug('got wss connectoin at: ' + client.upgradeReq.url);
			let url = client.upgradeReq.url;
			let qsIndex = url.indexOf('?');
			if (qsIndex >= 0) {
				_.each(url.substring(qsIndex + 1).split('&'), (qs) => {
					let params = qs.split('=');
					if (params.length == 2) {
						if (params[0] === 'clientId')
							client.clientId = params[1];
						else if (params[0] === 'vehicleId')
							client.vehicleId = params[1];
						else if (params[0] === 'properties')
							client.properties = params[1].split(',');
						else if (params[0] === 'close')
							client.callbackOnClose = params[1] === 'true';
					}
				});
				if (client.clientId && !this.messageQueue[client.clientId]) {
					this.messageQueue[client.clientId] = {};
				}
			}
			watchMethod(client, true);

			if (!this.intervalHandle) {
				this.intervalHandle = setInterval(_.bind(flushQueue, this), 1000);
			}
		});
	}
});