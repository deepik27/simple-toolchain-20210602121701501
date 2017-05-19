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

var DEFAULT_CLIENT_ID = 'default';
var DEFAULT_NUM_VEHICLES = (process.env.DEFAULT_NUM_VEHICLES && parseInt(process.env.DEFAULT_NUM_VEHICLES)) || 5;

/*
 * Manage simulator engines per client
 */
_.extend(simulatorManager, {
	wsServer: null,
	simulatorInfoMap: {},

	/**
	 * Create a simulator engine for given client. Default client is created if client is not specified.
	 * Created simulator engine enables specified number of vehicles within area specified with longitude, latitude, distance(m).
	 */
	create: function(clientId, numVehilces, longitude, latitude, distance, noErrorOnExist) {
		
		if (isNaN(longitude) || isNaN(latitude)) {
			return Q.reject({statusCode: 400, message: 'Invalid longitude or latitude parameter'});
		}
		
		// check if the simulator already exists or not
		numVehicles = numVehilces || DEFAULT_NUM_VEHICLES;
		if (numVehicles < 1) numVehicles = 5;
		simulatorInfoMap = this.simulatorInfoMap;
		clientId = clientId || DEFAULT_CLIENT_ID;
		var simulatorInfo = simulatorInfoMap[clientId];
		if (simulatorInfo && simulatorInfo.simulator && simulatorInfo.simulator.isValid()) {
			if (noErrorOnExist) {
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
		var timeoutInHours = 2;
		simulator = new simulatorEngine(clientId, timeoutInHours);
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
	 * Discard a simulator. All vehicles are stopped if they are running.
	 */
	release: function(clientId) {
		clientId = clientId || DEFAULT_CLIENT_ID;

		simulatorInfoMap = this.simulatorInfoMap;
		var simulatorInfo = simulatorInfoMap[clientId];
		if (!simulatorInfo) {
			return Q.reject({statusCode: 404, message: "simulator does not exist."});
		}
		delete simulatorInfoMap[clientId];
		
		var deferred = Q.defer();
		Q.when(simulatorInfo.simulator.close(), function(result) {
			deferred.resolve(result);
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},

	/**
	 * Get simulator list
	 */
	getSimulatorList: function() {
		var simulatorList = [];
		_.each(this.simulatorInfoMap, function(simulatorInfo, key) {
			simulatorList.push({clientId: key, simulatorInfo: simulatorInfo.simulator.getInformation()});
		});
		return Q(simulatorList);
	},

	/**
	 * Get a simulator information
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
		var callbackOnClose = function(clientId, timeout) {
			_.each(self.wsServer.clients, function(client) {
				if (client.callbackOnClose) {
					client.send(JSON.stringify({clientId: clientId, timeout: timeout}));
				}
			});
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
						try {
							var message = JSON.stringify(data);
							_.each(self.wsServer.clients, function(client) {
								if (client.clientId === clientId && client.vehicleId === vehicleId) {
									client.send(message);
								}
							});
						} catch(error) {
							console.error('socket error: ' + error);
						}
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
				debug('client is disconnected');
				watchMethod(client, false);
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
			}
			watchMethod(client, true);
		});
	}
});