/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
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
angular.module('htmlClient', ['ui.router'])
	.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
		$stateProvider
			.state('home', {
				url: '/home',
				template: '<client-drive></client-drive>',
			})
			.state('profile', {
				url: '/profile',
				template: '<client-profile></client-profile>',
			})
			.state('trips', {
				url: '/trips',
				template: '<client-trip></client-trip>',  // need to show trip list before showing particular trip
			})
			.state('settings', {
				url: '/settings',
				template: '<client-settings></client-settings>',
			});
	      $urlRouterProvider.otherwise('/home');
	}])
	.factory('settingsService', function($q, $timeout) {
		return {
			settingsCache: {},
			loadSettings: function(componentName, defaultValues) {
				if (!componentName)
					return null;
				
				if (this.settingsCache[componentName]) {
					return this.settingsCache[componentName];
				}
				
		        var settings = $.cookie("iot_auto_settings." + componentName);
		        if (settings) {
		        	try {
		            	settings = JSON.parse(settings);
		        	} catch(e) {
						console.error(e);
		        	}
		        }
	            settings = _.extend({}, defaultValues, settings||{});
		        this.settingsCache[componentName] = settings;
		        return settings;
			},
	    
		    saveSettings: function(componentName, settings, expires) {
				if (!componentName)
					return;
		        this.settingsCache[componentName] = settings;
		        if (!expires) expires = 365 * 20;
		        $.cookie("iot_auto_settings." + componentName, settings ? JSON.stringify(settings) : null, {expires: expires});
		    }
		};
	})
	.factory('mobileUtilityService', function($q, $timeout, settingsService) {
	    return {
			settings: null,
			getMobileDeviceId: function() {
				var settings = this.getSettings();
				return settings.iotaStarterUuid;
			},
			getVehicleId: function() {
				var settings = this.getSettings();
				return settings.iotaStarterVehicleId;
			},
			setVehicleId: function(vehicleId){
				var settings = this.getSettings();
				settings.iotaStarterVehicleId = vehicleId;
				this.updateSettings(settings);
			},
			getDriverId: function(){
				var settings = this.getSettings();
				return settings.iotaStarterDriverId;
			},
			setDriverId: function(driverId){
				var settings = this.getSettings();
				settings.iotaStarterDriverId = driverId;
				this.updateSettings(settings);
			},
			
			// http request template
			makeRequest: function(request) {
				if (!request.headers)
					request.headers = {};
				request.headers["iota-starter-uuid"] = this.getMobileDeviceId();
				if (!request.dataType)
					request.dataType = "json";
				return request;
			},

			uuid: function() {
				return chance.guid();
			},
			
			getSettings: function() {
				if (this.settings)
					return this.settings;
				var settings = settingsService.loadSettings("mobileUtilityService", {});
				if (!settings.iotaStarterUuid) {
					settings.iotaStarterUuid = (window && window.name) || this.uuid();
					this.updateSettings(settings);
				} else {
					this.settings = settings;
				}
				return settings;
			},
			
			updateSettings: function(settings) {
				this.settings = settings;
				settingsService.saveSettings("mobileUtilityService", settings);
			}
		};
	})
	/**
	 * Provide shortcut method to make HTTP request as an mobile client
	 * e.g.: `moHttp.get('/path')`, `moHttp({method: 'GET', url: '/path', ...})`
	 */
	.factory('moHttp', function ($http, mobileUtilityService, carProbeService){
		var moHttp = function moHttp(config, withVehicleId){
			var config_ = mobileUtilityService.makeRequest(config);
			if(withVehicleId){
				if(config_.url.indexOf('?') !== -1){
					config_.url = config_.url + '&mo_id=' + carProbeService.vehicleId;
				}else{
					config_.url = config_.url + '?mo_id=' + carProbeService.vehicleId;
				}
			}
			return $http(config_);
		};
		moHttp.get = function(url, config){
			config = config || {};
			config.method = 'GET';
			config.url = url;
			return moHttp(config);
		};
		moHttp.getWithVehicleId = function(url, config){
			config = config || {};
			config.method = 'GET';
			config.url = url;
			return moHttp(config, true);
		};
		return moHttp;
	})
	/*
	 * Service that encapsulates message client. This service uses MQTT 
	 */
	.factory('messageClientService', function($q, $timeout, $http, mobileUtilityService) {
		return {
			isValid: function() {
				return true;
			},
			create: function(credentials) {
 			},
 			destroy: function() {
 			},
 			connect: function() {
		    	var deferred = $q.defer();
    			deferred.resolve();
				return deferred.promise;
 			},
 			disconnect: function() {
		    	var deferred = $q.defer();
    			deferred.resolve();
				return deferred.promise;
 			},
 			publish: function(data) {
 				// Send data 
 				var deferred = $q.defer();
 				var request = mobileUtilityService.makeRequest({
					method : 'POST',
					url : '/user/probeData',
					data: data
				});
				$http(request).success(function(data, status) {
					deferred.resolve(data);
					console.log("sent data");
				}).error(function(error, status) {
					deferred.reject(error);
					console.log("failed to send data");
				});
		        return deferred.promise;
 			}
		};
	})
	/*
	 * Service to create and publish car probe data
	 */
	.factory('carProbeService', function($q, $timeout, $http, $location, mobileUtilityService, messageClientService, settingsService, virtualGeoLocation) {
	    var service = {
	    	watchGeoHandle: null,
	    	dirty: false,
	    	deviceLocation: null,
	    	driveEvent: null,
	    	failureCount: 0,
	    	deviceId: null,	// set by setting UI (IoTP)
	    	vehicleId: null,// get from service (IoT4A)
	    	driverId: null,	// get from service (IoT4A) 
	    	
	    	vehicleData: {}, // for simulation

	    	connectionStateDef: {
	        	CONNECTION_STATE_DISCONNECTED: 0,
	        	CONNECTION_STATE_CONNECTING: 1,
	        	CONNECTION_STATE_CONNECTED: 2,
	    	},
	    	connectionState: 0,
	    	onConnectionStateChanged: null,

	    	settings: settingsService.loadSettings("carProbeService", {
				deviceId: null,
				connectOnStartup: true,
				simulation: true,
				idleMsgInterval: 3000,
				drivingMsgInterval: 1000
			}),
	    	dataPublishHandle: null,
	    	publishInterval: 0,
	    	msgCount: 0,
	    	
	    	geolocation: null,
	    	
	    	// start monitoring probe data
		    startup: function() {
		        this.deviceLocation = {};
		        this.driveEvent = {};
		        this.msgCount = 0;
		        this.failureCount = 0;
		        this.dirty = false;
		        this.geolocation = this.settings.simulation ? virtualGeoLocation : navigator.geolocation;
	
		        this.changeConnectionState(this.connectionStateDef.CONNECTION_STATE_DISCONNECTED);

		        if(!this.settings.simulation){
		        	// in simulation case, we should start watching geo location at start driving
		        	this._startWatchLocation();
		        }
			   
		        if (this.settings.connectOnStartup) {
		        	var self = this;
		        	$timeout(function() {
		        		console.log("connecting at startup automatically");
		        		self.connect();
		        	}, 500);
		        }
	        },
	        
	        _stopWatchLocation: function(){
		        if (this.geolocation) {
		        	if (this.watchGeoHandle) {
		        		this.geolocation.clearWatch(this.watchGeoHandle);
		        		this.watchGeoHandle = null;
		        	}
		        }
	        },
	        
	        _startWatchLocation: function(){
		        // Start watching geo location
		        if (this.geolocation) {
		        	this._stopWatchLocation();
		        	var self = this;
		        	this.watchGeoHandle = this.geolocation.watchPosition(function(position) {
				        if (!isNaN(position.coords.latitude)) {
				        	self.deviceLocation.lat = Math.round(position.coords.latitude * 10000000) / 10000000;
			        		self.dirty = true;
				        }
				        if (!isNaN(position.coords.longitude)) {
				        	self.deviceLocation.lng = Math.round(position.coords.longitude * 10000000) / 10000000;
				        	self.dirty = true;
				        }
				        if (!isNaN(position.coords.altitude)) {
				        	self.deviceLocation.altitude = Math.round(position.coords.altitude * 10000000) / 10000000;
				        	self.dirty = true;
				        }
				        if (!isNaN(position.coords.speed)) {
				        	speed = position.coords.speed;
				        	speed = speed * 60 * 60 / 1000; // m/s -> km/h
				        	self.driveEvent.speed = Math.round(speed * 100) / 100 || 0;
				        	self.dirty = true;
				        }	
				        if (!isNaN(position.coords.heading)) {
				        	self.driveEvent.heading = Math.round(position.coords.heading * 100) / 100 || 0;
				        	self.dirty = true;
				        }
				        if (self.settings.simulation){
				        	if(self.vehicleData.fuel){
				        		self.driveEvent.fuel = self.vehicleData.fuel;
				        	}else{
					        	if(isNaN(self.driveEvent.fuel)){
					        		self.driveEvent.fuel = 50;
					        	}else{
					        		self.driveEvent.fuel = Math.round((self.driveEvent.fuel - 0.01) * 100) / 100;
					        		if(self.driveEvent.fuel <= 0) self.driveEvent.fuel = 50;
					        	}
					        }
				        	if(self.vehicleData.engineTemp){
				        		self.driveEvent.engineTemp = self.vehicleData.engineTemp;
				        	}else{
				        		if(isNaN(self.driveEvent.engineTemp) || self.driveEvent.engineTemp > 320) self.driveEvent.engineTemp = 250;
					        	self.driveEvent.engineTemp += Math.round((Math.random()*10-3)*100)/100;
					        }
				        }
		        	}, function() {
		        		self.failureCount++;
		        	}, {
		    			enableHighAccuracy: true,
		    			timeout: 5000,
		    			maximumAge: 100
		    		});
		        }
	        },
	        
	        /*
	         * Get car probe data. return cache if there is data already taken. Otherwise, get current data
	         */
	        getProbeData: function() {
		    	var deferred = $q.defer();
		    	if (!isNaN(this.deviceLocation.lat) && !isNaN(this.deviceLocation.lng)) {
	        		var probe = {deviceLocation: this.deviceLocation, driveEvent: this.driveEvent};
			        deferred.resolve(probe);
		    	} else if (this.geolocation) {
	        		var probe = {deviceLocation: this.deviceLocation, driveEvent: this.driveEvent};
		        	this.geolocation.getCurrentPosition(function(position) {
				        if (!isNaN(position.coords.latitude)) {
				        	probe.deviceLocation.lat = Math.round(position.coords.latitude * 10000000) / 10000000;
				        }
				        if (!isNaN(position.coords.longitude)) {
				        	probe.deviceLocation.lng = Math.round(position.coords.longitude * 10000000) / 10000000;
				        }
				        if (!isNaN(position.coords.altitude)) {
				        	probe.deviceLocation.altitude = Math.round(position.coords.altitude * 10000000) / 10000000;
				        }
				        if (!isNaN(position.coords.speed)) {
				        	speed = position.coords.speed;
				        	speed = speed * 60 * 60 / 1000; // m/s -> km/h
				        	probe.driveEvent.speed = Math.round(speed * 100) / 100 || 0;
				        }	
				        if (!isNaN(position.coords.heading)) {
				        	probe.driveEvent.heading = Math.round(position.coords.heading * 100) / 100 || 0;
				        }
				        deferred.resolve(probe);
		        	}, function(err) {
				        deferred.reject();
		        	}, {
		    			enableHighAccuracy: true,
		    			timeout: 5000,
		    			maximumAge: 100
		    		}) ;
	        	}
				return deferred.promise;
	        },
	        
	        // connect to service
	    	connect: function() {
//		    	var deferred = $q.defer();
//	            if (!this.settings.deviceId) {
//	            	this.settings.deviceId = prompt("Enter a unique ID of at least 8 characters containing only letters and numbers:");
//		            if (!this.settings.deviceId) {
//		            	deferred.reject("No deviceId is specified.");
//		            	return;
//		            }
//	            }

				var vehicleId = mobileUtilityService.getVehicleId()
				var driverId = mobileUtilityService.getDriverId()

	            if (this.vehicleId != vehicleId || this.driverId != driverId) {
	                this.msgCount = 0;
	                this.failureCount = 0;
	        		this.vehicleId = vehicleId;
	        		this.driverId = driverId;
		            this.updateSettings(this.settings);
	    		}
	
	    		var self = this;
		    	this.changeConnectionState(this.connectionStateDef.CONNECTION_STATE_CONNECTING);
//				$http(mobileUtilityService.makeRequest({
//					method : 'GET',
//					url : '/user/device/credentials/' + this.deviceId,
//					headers: {
//						'Content-Type': 'application/JSON;charset=utf-8'
//					}
//				})).success(function(data, status) {
//					messageClientService.create(data);
//					deferred.resolve(self.connectionStateDef.CONNECTION_STATE_CONNECTING);
//	
//	    			console.log("Attempting connect");
//	                self.connectDevice();
//				}).error(function(error, status) {
//					deferred.reject({error: error, status: status});
//				});
				var promise = [];
				if(!this.vehicleId){
					promise.push($q.when(this.addVehicle(), function(vehicle){
						mobileUtilityService.setVehicleId(vehicle.id);
						self.connectDevice();
					}));
				}else{
					promise.push($q.when(this.getVehicle(this.vehicleId), function(vehicle){
						if(this.vehicleId !== vehicle.mo_id){
							mobileUtilityService.setVehicleId(vehicle.mo_id);
						}
						self.connectDevice();
					}, function(err){
						// try to add vehicle
						return $q.when(self.addVehicle(), function(vehicle){
							mobileUtilityService.setVehicleId(vehicle.id);
							self.connectDevice();
						});
					}));
				}

				//FIXME Get car probe requires driver_id as of 20160731
				if(!this.driverId){
					promise.push($q.when(this.addDriver(), function(driver){
						mobileUtilityService.setDriverId(driver.id);
					}));
				}else{
					promise.push($q.when(this.getDriver(this.driverId), function(driver){
						if(this.driverId !== driver.driver_id){
							mobileUtilityService.setDriverId(driver.driver_id);
						}
					}));
				}
				return $q.all(promise).then(function(){
					self.vehicleId = mobileUtilityService.getVehicleId();
					self.driverId = mobileUtilityService.getDriverId();
					self.driverId = mobileUtilityService.getDriverId();
				});
	    	},
		    
	    	// disconnect from servic
		    disconnect: function() {
		    	var deferred = $q.defer();
	    		if (this.driveEvent.trip_id) {
	            	deferred.reject("Stop driving before disconnecting.");
	            	return;
	    		}

	    		if (this.dataPublishHandle) {
		        	clearInterval(this.dataPublishHandle);
		        	this.dataPublishHandle = null;
		        	this.publishInterval = 0;
		        }
	    		
	    		var self = this;
		        messageClientService.disconnect().then(function() {
			    	self.changeConnectionState(self.connectionStateDef.CONNECTION_STATE_DISCONNECTED);
			    	deferred.resolve(self.connectionStateDef.CONNECTION_STATE_DISCONNECTED);
		        }, function(err) {
			    	deferred.reject(err);
		        });
				return deferred.promise;
		    },
	    	
		    connectDevice: function(){
		    	if (!messageClientService.isValid()) 
		    		return;
	
		    	this.changeConnectionState(this.connectionStateDef.CONNECTION_STATE_CONNECTING);
		    	console.log("Connecting device to IoT Foundation...");
		    	var self = this;
		    	messageClientService.connect().then(function() {
    		    	// The device connected successfully
    		    	console.log("Connected Successfully!");
    		    	self.changeConnectionState(self.connectionStateDef.CONNECTION_STATE_CONNECTED);
    		    	self.setDataPublishInterval(self.driveEvent.trip_id ?  self.settings.drivingMsgInterval : self.settings.idleMsgInterval);
		    	}, function(err) {
			    	// The device failed to connect. Let's try again in one second.
			    	console.log("Could not connect to IoT Foundation! Trying again in one second.");
			    	$timeout(self.connectDevice, 1000);
		    	});
		    },
		    
	    	changeConnectionState: function(newState) {
		    	if (this.connectionState !== newState) {
			    	this.connectionState = newState;
		    		this.onConnectionStateChanged && this.onConnectionStateChanged(newState);
		    	}
	    	},
	    	
	    	getConnectionState: function() {
	    		return this.connectionState;
	    	},
	    	
		    setConnectionStateChangedListener: function(onConnectionStateChanged) {
		    	this.onConnectionStateChanged = onConnectionStateChanged;
		    },
	        
	        publish: function() {
				// We only attempt to publish if we're actually connected, saving CPU and battery
				if (this.connectionState !== this.connectionStateDef.CONNECTION_STATE_CONNECTED)
					return;
				// Publish only during driving in this app.
				if (!this.driveEvent.trip_id){
					return;
				}
	
				try {
					var data = {
						ts: Date.now(),
						lat: this.deviceLocation.lat,
						lng: this.deviceLocation.lng,
						altitude: this.deviceLocation.altitude,
						mo_id: mobileUtilityService.getVehicleId(),
						driver_id: mobileUtilityService.getDriverId(),
						props: {}
					};
			
					// Send speed and heading data while driving
					if (this.driveEvent.trip_id != null) {
						data.trip_id = this.driveEvent.trip_id;
						data.speed = this.driveEvent.speed||0;
						if (this.driveEvent.heading != null)
							data.heading = this.driveEvent.heading;
						if (this.driveEvent.fuel != null)
							data.props.fuel = this.driveEvent.fuel;
						if (this.driveEvent.engineTemp != null)
							data.props.engineTemp = this.driveEvent.engineTemp;
					} 
					messageClientService.publish(data).then(function(matchedData) {
						this.matchedData = matchedData;
		        		this.msgCount++;
		            	this.dirty = true;
					}.bind(this));
				} catch (err) {
			        this.changeConnectionState(this.connectionStateDef.CONNECTION_STATE_DISCONNECTED);
			    	
			        var self = this;
		        	// reconnect
		        	$timeout(function() {
		        		self.connectDevice();
		        	}, 1000); 
				}
		    },
		    
		    setDataPublishInterval: function(interval) {
		    	if (this.publishInterval === interval)
		    		return;
	
		    	this.publishInterval = interval || this.settings.idleMsgInterval;
		    	if (this.dataPublishHandle) {
		        	clearInterval(this.dataPublishHandle);
		        	this.dataPublishHandle = null;
		        }
		        var self = this;
		        this.dataPublishHandle = setInterval(function() {
		        	self.publish();
		        }, this.publishInterval);
		    },
	
		    createTripId: function() {
		    	if(this.settings.simulation){
		    		this._startWatchLocation();
		    	}
		    	this.driveEvent.trip_id = mobileUtilityService.uuid();
		    	this.setDataPublishInterval(this.settings.drivingMsgInterval);
		    	return this.driveEvent.trip_id;
		    },
		    
		    clearTripId: function() {
		    	if(this.settings.simulation){
		    		this._stopWatchLocation();
		    	}
		    	this.driveEvent.trip_id = null;
	            this.setDataPublishInterval(this.settings.idleMsgInterval);
		    },
		    
		    hasTripId: function() {
		    	return this.driveEvent.trip_id;
		    },
		    
		    updateData: function(data, force) {
		    	if (!force && !this.dirty) {
		    		return false;
		    	}
		    	this.dirty = false;
		    	for (var key in data) {
			    	data[key] = this[key];
		    	}
		    	return true;
		    },
			
			getSettings: function() {
				return this.settings;
			},
			
			updateSettings: function(settings) {
				this.settings = settings;
				settingsService.saveSettings("carProbeService", settings, 30);
	            this.setDataPublishInterval(this.driveEvent.trip_id ?  this.settings.drivingMsgInterval : this.settings.idleMsgInterval);
	            if(this.settings.simulation){
	            	if(this.geolocation != virtualGeoLocation){
	            		this._stopWatchLocation();
	            		this.geolocation = virtualGeoLocation;
	            		// in simulation case, start watching location when start driving
					}
	            }else{
	            	if(this.geolocation != navigator.geolocation){
	            		this._stopWatchLocation();
	            		this.geolocation = navigator.geolocation;
	            		this._startWatchLocation();
					}
	            }
			},
			
			setVehicleData: function(vehicleData){
				this.vehicleData = vehicleData;
			},

			getVehicle: function(mo_id){
				var deferred = $q.defer();
				$http(mobileUtilityService.makeRequest({
					method : 'GET',
					url : '/user/vehicle/' + mo_id
				})).success(function(data, status) {
					deferred.resolve(data);
				}).error(function(error, status) {
					deferred.reject({error: error, status: status});
				});
				return deferred.promise;
			},
			addVehicle: function(){
				var deferred = $q.defer();
				$http(mobileUtilityService.makeRequest({
					method: "POST",
					url: "/user/vehicle",
					headers: {
						'Content-Type': 'application/JSON;charset=utf-8'
					}
				})).success(function(data, status){
					deferred.resolve(data);
				}).error(function(error, status){
					deferred.reject({error: error, status: status});
				});
				return deferred.promise;
			},
			activateVehicle: function(toActive){
				var deferred = $q.defer();
				$http(mobileUtilityService.makeRequest({
					method: "PUT",
					url: "/user/vehicle/" + this.vehicleId,
					headers: {
						"Content-Type": "application/JSON;charset=utf-8"
					},
					data: {mo_id: this.vehicleId, status: toActive ? "Active" : "Inactive"}
				})).success(function(data, status){
					deferred.resolve(data);
				}).error(function(error, status){
					deferred.reject({error: error, status: status});
				});
				return deferred.promise;
			},
			deleteVehicle: function(mo_id){
				var deferred = $q.defer();
				$http(mobileUtilityService.makeRequest({
					method: "DELETE",
					url: "/user/vehicle/" + mo_id
				})).success(function(data, status){
					deferred.resolve(data);
				}).error(function(error, status){
					deferred.reject({error: error, status: status});
				});
				return deferred.promise;
			},

			getDriver: function(driver_id){
				var deferred = $q.defer();
				$http(mobileUtilityService.makeRequest({
					method : 'GET',
					url : '/user/driver/' + driver_id
				})).success(function(data, status) {
					deferred.resolve(data);
				}).error(function(error, status) {
					deferred.reject({error: error, status: status});
				});
				return deferred.promise;
			},
			addDriver: function(){
				var deferred = $q.defer();
				$http(mobileUtilityService.makeRequest({
					method: "POST",
					url: "/user/driver",
					headers: {
						'Content-Type': 'application/JSON;charset=utf-8'
					}
				})).success(function(data, status){
					deferred.resolve(data);
				}).error(function(error, status){
					deferred.reject({error: error, status: status});
				});
				return deferred.promise;
			},
			activateDriver: function(toActive){
				var deferred = $q.defer();
				$http(mobileUtilityService.makeRequest({
					method: "PUT",
					url: "/user/driver/" + this.driverId,
					headers: {
						"Content-Type": "application/JSON;charset=utf-8"
					},
					data: {driver_id: this.driverId, status: toActive ? "Active" : "Inactive"}
				})).success(function(data, status){
					deferred.resolve(data);
				}).error(function(error, status){
					deferred.reject({error: error, status: status});
				});
				return deferred.promise;
			},
			deleteDriver: function(driver_id){
				var deferred = $q.defer();
				$http(mobileUtilityService.makeRequest({
					method: "DELETE",
					url: "/user/driver/" + driver_id
				})).success(function(data, status){
					deferred.resolve(data);
				}).error(function(error, status){
					deferred.reject({error: error, status: status});
				});
				return deferred.promise;
			}

	    };
	    
	    service.startup();
	    return service;
	})
	/*
	 * Service to simulate geolocation
	 */
	.factory('virtualGeoLocation', function($q, $interval, $http, mobileUtilityService) {
	    var service = {
	    	tripRouteIndex: 0,
	    	tripRoute: null,
	    	prevLoc: {lat:48.134994,lon:11.671026,speed:0,init:true},
	    	
	    	watchPosition: function(callback){
	    		this._resetRoute();
	    		var self = this;
	    		return $interval(function(){
	    			self.getCurrentPosition(callback);
	    		}, 1000);
	    	},
	    	clearWatch: function(watchId){
    			$interval.cancel(watchId);
    			this.tripRoute = null;
	    	},
	    	setCurrentPosition: function(loc){
	    		if(this.tripRoute){
	    			// under driving
	    			return;
	    		}
	    		this.prevLoc = loc;
	    		if(isNaN(this.prevLoc.speed)){
	    			this.prevLoc.speed = 0;
	    		}
	    	},
	    	getCurrentPosition: function(callback){
	    		var p = this._getCurrentPosition();
	    		if(p && !p.init){
	    			callback({
	    				coords: {
	    					latitude: p.lat,
	    					longitude: p.lon,
	    					speed: p.speed*1000/3600,
	    					heading: p.heading
	    				}
	    			});
	    		}else{
		    		var self = this;
		    		if(navigator.geolocation){
			    		navigator.geolocation.getCurrentPosition(function(position){
			    			var c = position.coords;
			    			self.setCurrentPosition({lat:c.latitude, lon:c.longitude, speed: c.speed});
			    			callback(position);
			    		});
			    	}else{
		    			callback({coords:{latitude:this.prevLoc.lat, longitude:this.prevLoc.lon, speed:this.prevLoc.speed}});
			    	}
	    		}
	    	},
	    	_resetRoute:function(){
				var self=this;
				// select random location in about 10km from the current location
				var ddist = (Math.random()/2 + 0.5) * 0.15 / 2;
				var dtheta = 2 * Math.PI * Math.random();
				var slat = this.prevLoc.lat;
				var slng = this.prevLoc.lon;
				var dlat = +slat + ddist * Math.sin(dtheta);
				var dlng = +slng + ddist * Math.cos(dtheta);

				$http(mobileUtilityService.makeRequest({
					method: "GET",
					url: "/user/routesearch?orig_latitude=" + slat + "&orig_longitude=" + slng + "&target_latitude=" + dlat + "&target_longitude=" + dlng
				})).success(function(data, status){
					var routeArray = [];
					data.link_shapes.forEach(function(shapes){
						shapes.shape.forEach(function(shape){
							if(shape)
								routeArray.push(shape);
						});
					});
					if(routeArray.length >= 2){
						self.tripRouteIndex = 0;
						self.tripRoute = routeArray;
						self.prevLoc = routeArray[0];
					}
				}).error(function(error, status){
					console.error("Cannot get route for simulation");
				});
	    	},
	    	_getCurrentPosition(){
    			if(!this.tripRoute || this.tripRoute.length < 2){
    				return this.prevLoc;
    			}
    			var prevLoc = this.prevLoc;
				var loc = this.tripRoute[this.tripRouteIndex];
				var speed = this._getDistance(loc, prevLoc)*0.001*3600;
				while((speed - prevLoc.speed) < -20 && this.tripRouteIndex < this.tripRoute.length-1){ 
					// too harsh brake, then skip the pointpoint
					this.tripRouteIndex++;
					loc = this.tripRoute[this.tripRouteIndex];
					speed = this._getDistance(loc, prevLoc)*0.001*3600;
				}
				while(speed>120 || (speed - prevLoc.speed) > 20){
					// too harsh acceleration, then insert intermediate point
					var loc2 = {lat: (+loc.lat+prevLoc.lat)/2, lon: (+loc.lon+prevLoc.lon)/2};
					speed = this._getDistance(loc2, prevLoc)*0.001*3600;
					this.tripRoute.splice(this.tripRouteIndex, 0, loc2);
					loc = loc2;
				}
				loc.speed = speed
				// calculate heading
				var rad = 90 - Math.atan2(Math.cos(prevLoc.lat/90)*Math.tan(loc.lat/90)-Math.sin(prevLoc.lat/90)*Math.cos((loc.lon-prevLoc.lon)/180),
						Math.sin((loc.lon-prevLoc.lon)/180)) / Math.PI * 180;
				loc.heading = (rad + 360)%360;
				// keep the previous info
				this.prevLoc = loc;

    			if(this.tripRouteIndex < this.tripRoute.length-1){
	    			this.tripRouteIndex++;
    			}
    			return loc;
	    	},
	    	/*
			 * Calculate distance in meters between two points on the globe
			 * - p0, p1: points in {latitude: [lat in degree], longitude: [lng in degree]}
			 */
			_getDistance: function(p0, p1) {
				// Convert to Rad
				function to_rad(v) {
					return v * Math.PI / 180;
				}
				var latrad0 = to_rad(p0.lat);
				var lngrad0 = to_rad(p0.lon);
				var latrad1 = to_rad(p1.lat);
				var lngrad1 = to_rad(p1.lon);
				var norm_dist = Math.acos(Math.sin(latrad0) * Math.sin(latrad1) + Math.cos(latrad0) * Math.cos(latrad1) * Math.cos(lngrad1 - lngrad0));
				
				// Earths radius in meters via WGS 84 model.
				var earth = 6378137;
				return earth * norm_dist;
			}
	    };
	    return service;
	})
;