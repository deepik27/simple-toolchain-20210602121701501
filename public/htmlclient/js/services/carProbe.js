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

/*
 * Service to create and publish car probe data
 */
angular.module('htmlClient')
.factory('carProbeService', function($q, $timeout, $http, $location, mobileClientService, messageClientService, settingsService, assetService, virtualGeoLocation) {
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
				        	self.driveEvent.engineTemp += Math.round((Math.random()*5-1.5)*100)/100;
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
        getProbeData: function(force) {
	    	var deferred = $q.defer();
	    	if (!force && this.settings.simulation) {
	    		virtualGeoLocation.getCurrentPosition(function(location) {
	    			var probe = {
			        	deviceLocation: {
			        		lat: location.coords.latitude,
			        		lng: location.coords.longitude,
			        	},
			        	driveEvent: {
			        		speed: location.coords.speed,
			        		heading: location.coords.heading
			        	}
				    };
			        deferred.resolve(probe);
	    		});
	    	} else if (!force && !isNaN(this.deviceLocation.lat) && !isNaN(this.deviceLocation.lng)) {
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
    		var self = this;
    		if (this.getConnectionState() == this.connectionStateDef.CONNECTION_STATE_DISCONNECTED) {
		    	this.changeConnectionState(this.connectionStateDef.CONNECTION_STATE_CONNECTING);
		    	return $q.when(this.prepareAssets(), function() {
					self.connectDevice();
		    	});
    		} else {
		    	return $q.when(this.prepareAssets(), function() {
					return;
		    	});
    		}
    	},
	    
    	// disconnect from service
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

	    prepareAssets: function() {
			var vehicleId = assetService.getVehicleId();
			var driverId = assetService.getDriverId();

            if (this.vehicleId !== vehicleId || this.driverId !== driverId) {
                this.msgCount = 0;
                this.failureCount = 0;
    		}
    		this.vehicleId = vehicleId;
    		this.driverId = driverId;

	    	var promise = [];
			if(!this.vehicleId){
				promise.push($q.when(this.addVehicle(), function(vehicle){
					assetService.setVehicleId(vehicle.id);
					assetService.setAutoManagedAsset(true);
				}));
			}else{
				promise.push($q.when(this.getVehicle(this.vehicleId), function(vehicle){
					if(this.vehicleId !== vehicle.mo_id){
						assetService.setVehicleId(vehicle.mo_id);
					}
					assetService.setAutoManagedAsset(true);
				}, function(err){
					// try to add vehicle
					return $q.when(self.addVehicle(), function(vehicle){
						assetService.setVehicleId(vehicle.id);
						assetService.setAutoManagedAsset(true);
					});
				}));
			}
			//FIXME Get car probe requires driver_id as of 20160731
			if(!this.driverId){
				promise.push($q.when(this.addDriver(), function(driver){
					assetService.setDriverId(driver.id);
				}));
			}else{
				promise.push($q.when(this.getDriver(this.driverId), function(driver){
					if(this.driverId !== driver.driver_id){
						assetService.setDriverId(driver.driver_id);
					}
				}, function(err){
					// try to add vehicle
					return $q.when(self.addDriver(), function(driver){
						assetService.setDriverId(driver.id);
					});
				}));
			}
			
    		var self = this;
			return $q.all(promise).then(function(){
				self.vehicleId = assetService.getVehicleId();
				self.driverId = assetService.getDriverId();
			});
	    },
	    
	    activateAssets: function(activate) {
	    	var deferred = $q.defer();
			if (this.isAutoManagedAsset()) {
				var self = this;
				$q.when(self.activateVehicle(activate), function(vehicle){
					$q.when(self.activateDriver(activate), function(driver){
						// send car probe data now
						deferred.resolve();
					}, function(error){
						deferred.reject(error);
					});
				}, function(error){
					deferred.reject(error);
				});
			} else {
				// send car probe data now
				deferred.resolve();
			}
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
					mo_id: assetService.getVehicleId(),
					driver_id: assetService.getDriverId(),
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
	    	this.driveEvent.trip_id = mobileClientService.uuid();
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
			$http(mobileClientService.makeRequestOption({
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
			$http(mobileClientService.makeRequestOption({
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
			$http(mobileClientService.makeRequestOption({
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
			$http(mobileClientService.makeRequestOption({
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
			$http(mobileClientService.makeRequestOption({
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
			$http(mobileClientService.makeRequestOption({
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
			$http(mobileClientService.makeRequestOption({
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
			$http(mobileClientService.makeRequestOption({
				method: "DELETE",
				url: "/user/driver/" + driver_id
			})).success(function(data, status){
				deferred.resolve(data);
			}).error(function(error, status){
				deferred.reject({error: error, status: status});
			});
			return deferred.promise;
		},
		isAutoManagedAsset: function() {
			return assetService.isAutoManagedAsset();
		}

    };
    
    service.startup();
    return service;
})
;