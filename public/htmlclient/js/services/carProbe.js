/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 *
 * Data Privacy Disclaimer
 * 
 * This Program has been developed for demonstration purposes only to illustrate the technical
 * capabilities and potential business uses of the IBM IoT for Automotive
 * 
 * The components included in this Program may involve the processing of personal information
 * (for example location tracking and behavior analytics). When implemented in practice such
 * processing may be subject to specific legal and regulatory requirements imposed by country
 * specific data protection and privacy laws. Any such requirements are not addressed in
 * this Program.
 * 
 * Licensee is responsible for the ensuring Licensee's use of this Program and any deployed
 * solution meets applicable legal and regulatory requirements. This may require the implementation
 * of additional features and functions not included in the Program.
 * 
 * Apple License issue
 * 
 * This Program is intended solely for use with an Apple iOS product and intended to be used
 * in conjunction with officially licensed Apple development tools and further customized
 * and distributed under the terms and conditions of Licensee's licensed Apple iOS Developer
 * Program or Licensee's licensed Apple iOS Enterprise Program.
 * 
 * Licensee agrees to use the Program to customize and build the application for Licensee's own
 * purpose and distribute in accordance with the terms of Licensee's Apple developer program
 * 
 * Risk Mitigation / Product Liability Issues
 * 
 * The Program and any resulting application is not intended for design, construction, control,
 * or maintenance of automotive control systems where failure of such sample code or resulting
 * application could give rise to a material threat of death or serious personal injury.
 * 
 * IBM shall have no responsibility regarding the Program's or resulting application's compliance
 * with laws and regulations applicable to Licensee's business and content. Licensee is responsible
 * for use of the Program and any resulting application.
 * 
 * As with any development process, Licensee is responsible for developing, sufficiently testing
 * and remediating Licensee's products and applications and Licensee is solely responsible for any
 * foreseen or unforeseen consequences or failures of Licensee's products or applications.
 * 
 * REDISTRIBUTABLES
 * 
 * If the Program includes components that are Redistributable, they will be identified 
 * in the REDIST file that accompanies the Program. In addition to the license rights granted
 * in the Agreement, Licensee may distribute the Redistributables subject to the following terms:
 * 
 * 1) Redistribution must be in source code form only and must conform to all directions,
 *    instruction and specifications in the Program's accompanying REDIST or documentation;
 * 2) If the Program's accompanying documentation expressly allows Licensee to modify
 *    the Redistributables, such modification must conform to all directions, instruction and
 *    specifications in that documentation and these modifications, if any, must be treated
 *    as Redistributables;
 * 3) Redistributables may be distributed only as part of Licensee's application that was developed
 *    using the Program ("Licensee's Application") and only to support Licensee's customers
 *    in connection with their use of Licensee's Application. Licensee's application must constitute
 *    significant value add such that the Redistributables are not a substantial motivation
 *    for the acquisition by end users of Licensee's software product;
 * 4) If the Redistributables include a Java Runtime Environment, Licensee must also include other
 *    non-Java Redistributables with Licensee's Application, unless the Application is designed to
 *    run only on general computer devices (e.g., laptops, desktops and servers) and not on handheld
 *    or other pervasive devices (i.e., devices that contain a microprocessor but do not have
 *    computing as their primary purpose);
 * 5) Licensee may not remove any copyright or notice files contained in the Redistributables;
 * 6) Licensee must hold IBM, its suppliers or distributors harmless from and against any claim
 *    arising out of the use or distribution of Licensee's Application;
 * 7) Licensee may not use the same path name as the original Redistributable files/modules;
 * 8) Licensee may not use IBM's, its suppliers or distributors names or trademarks in connection
 *    with the marketing of Licensee's Application without IBM's or that supplier's
 *    or distributor's prior written consent;
 * 9) IBM, its suppliers and distributors provide the Redistributables and related documentation
 *    without obligation of support and "AS IS", WITH NO WARRANTY OF ANY KIND, EITHER EXPRESS
 *    OR IMPLIED, INCLUDING THE WARRANTY OF TITLE, NON-INFRINGEMENT OR NON-INTERFERENCE AND THE
 *    IMPLIED WARRANTIES AND CONDITIONS OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.;
 * 10) Licensee is responsible for all technical assistance for Licensee's Application and any
 *     modifications to the Redistributables; and
 * 11) Licensee's license agreement with the end user of Licensee's Application must notify the end
 *     user that the Redistributables or their modifications may not be i) used for any purpose
 *     other than to enable Licensee's Application, ii) copied (except for backup purposes),
 *     iii) further distributed or transferred without Licensee's Application or 
 *     iv) reverse assembled, reverse compiled, or otherwise translated except as specifically
 *     permitted by law and without the possibility of a contractual waiver. Furthermore, Licensee's
 *     license agreement must be at least as protective of IBM as the terms of this Agreement.
 * 
 * Feedback License
 * 
 * In the event Licensee provides feedback to IBM regarding the Program, Licensee agrees to assign
 * to IBM all right, title, and interest (including ownership of copyright) in any data, suggestions,
 * or written materials that 1) are related to the Program and 2) that Licensee provides to IBM.
 */

/*
 * Service to create and publish car probe data
 */
angular.module('htmlClient')
.factory('carProbeService', function($q, $timeout, $http, $location, mobileClientService, messageClientService, settingsService, virtualGeoLocation) {
	var service = {
    	watchGeoHandle: null,
    	dirty: false,
    	deviceLocation: null,
    	driveEvent: null,
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
    	messageEventCallback: null,
    	
    	geolocation: null,
    	
    	// start monitoring probe data
	    startup: function() {
	        this.deviceLocation = {};
	        this.driveEvent = {};
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
			        		if(isNaN(self.driveEvent.engineTemp) || self.driveEvent.engineTemp > 130) self.driveEvent.engineTemp = 80;
			        		self.driveEvent.engineTemp = Math.round((Number(self.driveEvent.engineTemp)+(Math.random()*0.5-0.15))*100)/100;
				        }
			        }
	        	}, function() {
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
    	connect: function(assets) {
    		if (this.getConnectionState() !== this.connectionStateDef.CONNECTION_STATE_DISCONNECTED) {
    			return;
    		}

			if (assets) {
	    		this.vehicleId = assets.vehicleId;
	    		this.driverId = assets.driverId;
			}
   			this.connectDevice();
    	},
	    
    	// disconnect from service
	    disconnect: function() {
	    	this.messageEventCallback = null;
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
	    	messageClientService.connect(this.vehicleId).then(function() {
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
					mo_id: this.vehicleId,
					driver_id: this.driverId,
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
				var self = this;
				messageClientService.publish(data).then(function(matchedData) {
					this.matchedData = matchedData;
	        		this.messageEventCallback && this.messageEventCallback(this.matchedData);
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

	    makeTrip: function(messageEventCallback) {
	    	if(this.settings.simulation){
	    		this._startWatchLocation();
	    	}
	    	this.messageEventCallback = messageEventCallback;
	    	this.driveEvent.trip_id = mobileClientService.uuid();
	    	this.setDataPublishInterval(this.settings.drivingMsgInterval);
	    	return this.driveEvent.trip_id;
	    },
	    
	    clearTrip: function() {
	    	if(this.settings.simulation){
	    		this._stopWatchLocation();
	    	}
	    	this.messageEventCallback = null;
	    	this.driveEvent.trip_id = null;
            this.setDataPublishInterval(this.settings.idleMsgInterval);
            return null;
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
		}

    };
    
    service.startup();
    return service;
})
;