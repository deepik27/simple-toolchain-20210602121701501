/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */

var simulatorManager = module.exports = {};

var Q = require('q');
var _ = require('underscore');
var appEnv = require("cfenv").getAppEnv();
var WebSocketServer = require('ws').Server;
var simulatorEngine = require('./simulatorEngine.js');
	
var debug = require('debug')('simulatedVehicleManager');
debug.log = console.log.bind(console);

var DEFAULT_CLIENT_ID = 'default_simulator';
var DEFAULT_NUM_VEHICLES = (process.env.DEFAULT_SIMULATOR_VEHICLES && parseInt(process.env.DEFAULT_SIMULATOR_VEHICLES)) || 5;
var DEFAULT_TIMEOUT = (process.env.DEFAULT_SIMULATOR_TIMEOUT && parseInt(process.env.DEFAULT_SIMULATOR_TIMEOUT)) || 10;

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
	create: function(clientId, numVehilces, longitude, latitude, distance, timeoutInMinutes, noErrorOnExist) {
		
		if (isNaN(longitude) || isNaN(latitude)) {
			return Q.reject({statusCode: 400, message: 'Invalid longitude or latitude parameter'});
		}
		
		// check if the simulator already exists or not
		timeoutInMinutes = timeoutInMinutes !== undefined ? timeoutInMinutes : DEFAULT_TIMEOUT;
		numVehicles = numVehilces || DEFAULT_NUM_VEHICLES;
		if (numVehicles < 1) numVehicles = 5;
		simulatorInfoMap = this.simulatorInfoMap;
		clientId = clientId || DEFAULT_CLIENT_ID;
		var simulatorInfo = simulatorInfoMap[clientId];
		if (simulatorInfo && simulatorInfo.simulator && simulatorInfo.simulator.isValid()) {
			if (noErrorOnExist) {
				simulatorInfo.simulator.setTimeout(timeoutInMinutes);
				simulatorInfo.simulator.updateBaseLocation(longitude, latitude, distance);
				return Q(simulatorInfo.simulator.getInformation());
			}
			return Q.reject({statusCode: 400, message: "simulator already exist."});
		}

		var excludes = [];
		var invalidSimulatorKeys = [];
		_.each(simulatorInfoMap, function(value, key) {
			if (value.simulator.isValid()) {
				excludes = _.union(excludes, _.pluck(value.simulator.getVehicleList(-1, 0, ['vehicleId']), 'vehicleId'));
			}
			else {
				// probably automatically closed
				invalidSimulatorKeys.push(key); 
			}
		});
		_.each(invalidSimulatorKeys, function(key) {
			delete simulatorInfoMap[key];
		});

		// create a simulator if not exist
		var deferred = Q.defer();
		simulator = new simulatorEngine(clientId, timeoutInMinutes);
		simulatorInfoMap[clientId] = {clientId: clientId, simulator: simulator};
		Q.when(simulator.open(numVehicles, excludes, longitude, latitude, distance), function(result) {
			deferred.resolve(result);
		})["catch"](function(err){
			delete simulatorInfoMap[clientId];
			deferred.reject(err);
		}).done();		
		return deferred.promise;
	},

	/**
	 * Terminate a simulator and release all resources. All vehicles are stopped if they are running.
	 */
	release: function(clientId) {
		clientId = clientId || DEFAULT_CLIENT_ID;

		simulatorInfoMap = this.simulatorInfoMap;
		var simulatorInfo = simulatorInfoMap[clientId];
		if (!simulatorInfo) {
			return Q.reject({statusCode: 404, message: "simulator does not exist."});
		}
		delete simulatorInfoMap[clientId];
		delete this.messageQueue[clientId];
		if (_.isEmpty(this.messageQueue) && this.intervalHandle) {
			clearInterval(this.intervalHandle);
			delete this.intervalHandle;
		}
		
		var deferred = Q.defer();
		Q.when(simulatorInfo.simulator.close(), function(result) {
			deferred.resolve(result);
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},

	/**
	 * Get list of simulator information
	 */
	getSimulatorList: function() {
		var simulatorList = [];
		_.each(this.simulatorInfoMap, function(simulatorInfo, key) {
			simulatorList.push({clientId: key, simulatorInfo: simulatorInfo.simulator.getInformation()});
		});
		return simulatorList;
	},

	/**
	 * Get a simulator information of given clientId
	 */
	getSimulator: function(clientId) {
		clientId = clientId || DEFAULT_CLIENT_ID;
		var simulatorInfo = this.simulatorInfoMap[clientId];
		if (!simulatorInfo) {
			return Q.reject({statusCode: 404, message: "simulator not found"});
		}
		return Q(simulatorInfo.simulator);
	},
	
	/**
	 * Create a websocket connection to monitor vehicle status
	 */
	watch: function(server, path) {
		if (this.wsServer !== null){
			return; // already created
		}

		//
		// Create WebSocket server
		//
		this.wsServer = new WebSocketServer({
			server: server,
			path: path,
			verifyClient : function (info, callback) { //only allow internal clients from the server origin
				var isLocal = appEnv.url.toLowerCase().indexOf('://localhost') !== -1;
				var allow = isLocal || (info.origin.toLowerCase() === appEnv.url.toLowerCase());
				if(!allow){
					console.error("rejected web socket connection form external origin " + info.origin + " only connection form internal origin " + appEnv.url + " are accepted");
				}
				if(!callback){
					return allow;
				}
				var statusCode = (allow) ? 200 : 403;
				callback (allow, statusCode);
			}
		});
		
		var self = this;
		var sendClosedMessageToClient = function(clientId, message, json) {
			if (json) {
				message = JSON.stringify(message);
			}
			try {
				_.each(self.wsServer.clients, function(client) {
					if (client.callbackOnClose && client.clientId === clientId) {
						client.send(message);
					}
				});
			} catch(error) {
				console.error('socket error: ' + error);
			}
		};

		var flushQueue = function() {
			try {
				var clientsById = _.groupBy(self.wsServer.clients, "clientId");
				_.each(clientsById, function(clients, clientId) {
					var myMessageQueue = self.messageQueue[clientId];
					if (!myMessageQueue || _.isEmpty(myMessageQueue)) {
						return;
					}
					self.messageQueue[clientId] = {};
					_.each(clients, function(client) {
						var vehicleMessage = myMessageQueue[client.vehicleId];
						if (!_.isEmpty(vehicleMessage)) {
							client.send(JSON.stringify({data: vehicleMessage}));
						}
					});
				});
			} catch(error) {
				console.error('socket error: ' + error);
			}
		};
		
		var sendMessageToClient = function(clientId, vehicleId, message, json) {
			var myMessageQueue = self.messageQueue[clientId];
			if (!myMessageQueue) {
				return;
			}
			if (vehicleId) {
				if (!myMessageQueue[vehicleId])
					myMessageQueue[vehicleId] = [];
				myMessageQueue[vehicleId].push(message);
			}
		};

		var callbackOnClose = function(clientId, timeout) {
			sendClosedMessageToClient(clientId, {type: 'closed', reason: timeout ? 'timeout' : 'normal'}, true);
			if (self.simulatorInfoMap[clientId]) {
				delete self.simulatorInfoMap[clientId];
			}
		};
		
		var watchMethod = function(client, enable) {
			var clientId = client.clientId || DEFAULT_CLIENT_ID;
			var vehicleId = client.vehicleId;
			simulatorInfoMap = self.simulatorInfoMap;
			var simulatorInfo = simulatorInfoMap[clientId];
			if (simulatorInfo) {
				if (client.callbackOnClose) {
					simulatorInfo.simulator.setCallbackOnClose(enable ? callbackOnClose : undefined);
				} else {
					simulatorInfo.simulator.watch(vehicleId, client.properties, enable ? function(data) { 
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
		this.wsServer.on('connection', function(client){
			client.on('close', function () {
				console.log("client is disconnected. id=" + client.clientId + ", vid=" + client.vehicleId);
				watchMethod(client, false);
		    });
			client.on('message', function (message) {
				try {
					var messageObj = JSON.parse(message);
					if (messageObj.type === 'heartbeat') {
						simulatorInfoMap = self.simulatorInfoMap;
						var simulatorInfo = simulatorInfoMap[messageObj.clientId];
						if (simulatorInfo) {
							simulatorInfo.simulator.updateTime(true);
//							console.log("recieved heartbeat message. clientId = " + messageObj.clientId);
						} else {
							sendClosedMessageToClient(clientId, {type: 'closed', reason: 'heartbeat'}, true);
						}
					}
				} catch(e) {
					console.error("websocket message parse error. message = " + message);
				}
		    });
			
			debug('got wss connectoin at: ' + client.upgradeReq.url);
			var url = client.upgradeReq.url;
			var qsIndex = url.indexOf('?');
			if(qsIndex >= 0) {
				_.each(url.substring(qsIndex + 1).split('&'), function(qs) {
					var params = qs.split('=');
					if (params.length == 2) {
						if(params[0] === 'clientId')
							client.clientId = params[1];
						else if (params[0] === 'vehicleId')
							client.vehicleId = params[1];
						else if (params[0] === 'properties')
							client.properties = params[1].split(',');
						else if (params[0] === 'close')
							client.callbackOnClose = params[1] === 'true';
					}
				});
				if (client.clientId && !self.messageQueue[client.clientId]) {
					self.messageQueue[client.clientId] = {};
				}
			}
			watchMethod(client, true);

			if (!self.intervalHandle) {
				self.intervalHandle = setInterval(_.bind(flushQueue, self), 1000);
			}
		});
	}
});