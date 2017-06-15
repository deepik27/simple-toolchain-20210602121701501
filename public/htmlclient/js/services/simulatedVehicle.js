/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
/*
 * Service to simulate geolocation
 */
angular.module('htmlClient')
.factory('simulatedVehicle', function($window, $q, $http, mobileClientService) {
    var service = {
    	tripRoute: [],
    	prevLoc: {latitude:48.134994,longitude:11.671026,speed:0},
    	destination: null,
    	state: 'stop',
    	options: {avoid_events: true, route_loop: true},
    	properties: {},
    	initialized: false,
    	
    	init: function(clientId, vehicleId) {
    		var deferred = $q.defer();
       		this.clientId = clientId;
    		this.vehicleId = vehicleId;
    		var self = this;
			$http(mobileClientService.makeRequestOption({
				method: "GET",
				url: '/user/simulator/vehicle/' + this.vehicleId + '?properties=vehicle,position,state,options,properties',
				headers: {
					"iota-simulator-uuid": this.clientId
				}
			})).success(function(result, status){
				var data = result.data || {};
				self.vehicle = data.vehicle;
				self.updateVehicleData(data);
				$q.when(self.getRouteData(), function() {
					self._updateInitialized(true);
					deferred.resolve(data);
				}, function(err) {
					deferred.reject(err);
				});
			}).error(function(error, status){
				console.error("Error[" + status + "]: " + error);
				deferred.reject(error);
			});
    		return deferred.promise;
       	},
       	
    	getClientId: function() {
    		return this.clientId;
    	},
    	
    	getVehicleId: function() {
    		return this.vehicleId;
    	},
    	getVehicle: function() {
    		return this.vehicle;
    	},
	    startDriving: function() {
	    	var self = this;
    		var deferred = $q.defer();
			$http(mobileClientService.makeRequestOption({
				method: "PUT",
				url: '/user/simulator/vehicle/' + this.vehicleId + '?command=start',
				headers: {
					"iota-simulator-uuid": this.clientId
				},
				data: {parameters: {interval: 1000, successWhenAlready: true}}
			})).success(function(result, status){
				var data = result.data && result.data[self.vehicleId];
				deferred.resolve(self._updateState(data && data.state));
			}).error(function(error, status){
				console.error("Error[" + status + "]: " + error);
				deferred.reject(error);
			});
    		return deferred.promise;
	    },

	    stopDriving: function() {
	    	var self = this;
    		var deferred = $q.defer();
			$http(mobileClientService.makeRequestOption({
				method: "PUT",
				url: '/user/simulator/vehicle/' + this.vehicleId + '?command=stop',
				headers: {
					"iota-simulator-uuid": this.clientId
				},
				data: {parameters: {successWhenAlready: true}}
			})).success(function(result, status){
				var data = result.data && result.data[self.vehicleId];
				deferred.resolve(self._updateState(data && data.state));
			}).error(function(error, status){
				deferred.reject(error);
			});
    		return deferred.promise;
	    },
        
	    isDriving: function() {
	    	return this.state === 'driving';
	    },

	    updateVehicleData: function(data) {
			this._updateOptions(data.options);
			this._updatePosition(data.position);
			this._updateProperties(data.properties);
			this._updateState(data.state);
	    },
	    
	    _updatePosition: function(position, error) {
	    	if (position && 
	    			(this.prevLoc.latitude !== position.latitude || this.prevLoc.longitude !== position.longitude ||
	    			this.prevLoc.heading !== position.heading || this.prevLoc.speed !== position.speed)) {
				this.prevLoc = position;
				if (this.vehicleMonitor) {
					this.vehicleMonitor('position', this.prevLoc, error);
				}
	    	}
	    	return this.prevLoc;
	    },
	    
	    _updateOptions: function(options, error) {
	    	if (options) {
		    	for (var key in options) {
		    		if (this.options[key] !== options[key]) {
		    			this.options = options;
						if (this.vehicleMonitor) {
							this.vehicleMonitor('options', this.options, error);
						}
		    			break;
		    		}
		    	}
	    	}
	    	return this.options;
	    },
	    
	    _updateProperties: function(props, error) {
	    	if (props) {
		    	for (var key in props) {
		    		if (this.properties[key] !== props[key]) {
		    			this.properties = props;
						if (this.vehicleMonitor) {
							this.vehicleMonitor('properties', this.properties, error);
						}
		    			break;
		    		}
		    	}
	    	}
	    	return this.properties;
	    },
	    _updateState: function(state, error) {
	    	if (state && this.state !== state) {
		    	this.state = state;
				if (this.vehicleMonitor) {
					this.vehicleMonitor('state', this.state, error);
				}
	    	}
	    	return this.state;
	    },
	    _updateRoute: function(route, error) {
	    	if (this.route !== route) {
		    	this.route = route || [];
				if (this.vehicleMonitor) {
					this.vehicleMonitor('route', this.route, error);
				}
	    	}
			if (this.route && this.route.length > 0) {
				var first = this.route[0];
				this._updatePosition({latitude: first.lat, longitude: first.lon, heading: first.heading, speed: first.speed});
			}
	    	return this.route;
	    },
	    _updateProbe: function(probe, error) {
	    	if (this.probe !== probe) {
	    		this.probe = probe || {};
				if (this.vehicleMonitor) {
					this.vehicleMonitor('probe', this.probe, error);
				}
	    	}
	    	if (probe && !error) {
	    		this._updatePosition({latitude: probe.latitude, longitude: probe.longitude, heading: probe.heading, speed: probe.speed});
	    	}
	    },
	    _updateInitialized: function(b, error) {
	    	if (this.initialized !== b) {
	    		this.initialized = b;
				if (this.vehicleMonitor) {
					this.vehicleMonitor('initialized', this.initialized, error);
				}
	    	}
	    },
	    setVehicleMonitor: function(vehicleMonitor) {
	    	this.vehicleMonitor = vehicleMonitor;
	    	if (vehicleMonitor) {
				vehicleMonitor('position', this.prevLoc);
				vehicleMonitor('options', this.options);
				vehicleMonitor('properties', this.properties);
				vehicleMonitor('state', this.state);
				vehicleMonitor('route', this.tripRoute);
				if (this.initialized) {
					vehicleMonitor('initialized', this.initialized);
				}
				
				// get probes via websocket
				this._watchChanges(['probe']);
	    	} else {
	    		this._clearWatch();
	    	}
	    },

	    _watchChanges: function(properties){
	    	if (properties && properties.length === 0) {
	    		return;
	    	}
	    	
			var wsProtocol = (location.protocol == "https:") ? "wss" : "ws";
			var wsPort = location.port;
			var wssUrl = wsProtocol + '://' + $window.location.hostname;
			if (wsPort) {
				wssUrl += ':' + wsPort;
			}
			wssUrl += '/user/simulator/watch?clientId=' + this.clientId + '&vehicleId=' + this.vehicleId;
			if (properties) {
				wssUrl += '&properties=' + properties.join(',');
			}
			
			var self = this;
	    	this.ws = new WebSocket(wssUrl);
	        this.ws.onopen = function(){  
	            console.log("Socket is opened");
	        };
	        this.ws.onclose = function(){
	        	if (self.ws) {
	        		// socket is disconnected unexpectedly. try to reconnect
	        		self.ws = null;
	        		setTimeout(function() {
	        			console.log("socket is disconnected unexpectedly. try to reconnect");
	        			self._watchChanges(properties);
	        		}, 100);
	        	}
	        };
	        this.ws.onmessage = function(message) {
	        	var messageData = message && message.data;
	        	if (!messageData) {
		            console.error("no data contents");  
	        		return;
	        	}
	        	var jsonData = null;
	        	try {
	        		jsonData = JSON.parse(messageData);
	        	} catch (e) {
	        		console.error("parse error: " + messageData);
	        		return;
	        	}
	        	
	        	var jsonDataArray = jsonData.data;
	        	jsonDataArray.forEach(function(jdata) {
		        	var error = jdata.error;
		        	if (jdata.type === 'probe') {
		        		self._updateProbe(jdata.data, error);
		        	} else if (jdata.error) {
		        		console.error("data error: " + error);
		        	}
	        	});
	        };
	    },
    	_clearWatch: function(watchId){
    		if (this.ws) {
    			console.log("closing socket");
    			var ws = this.ws;
    			this.ws = null;
    			ws.close();
    		}
    	},
 
    	setOption: function(key, value) {
    		this.options[key] = value;
    		var self = this;
 			var deferred = $q.defer();
			$http(mobileClientService.makeRequestOption({
				method: "PUT",
				url: '/user/simulator/vehicle/' + this.vehicleId + '?command=route',
				headers: {
					"iota-simulator-uuid": this.clientId
				},
				data: {parameters: {options: this.options}}
			})).success(function(result, status){
				deferred.resolve(self._updateRoute(result.data && result.data[self.vehicleId]));
			}).error(function(error, status){
				console.error("Error[" + status + "]: " + error);
				deferred.reject(error);
			});
    		return deferred.promise;
    	},
    	getOption: function(key) {
    		return this.options[key];
    	},
    	setCurrentPosition: function(loc, donotResetRoute){
    		if(this.isDriving()){
    			// under driving
    			return;
    		}
       		this.prevLoc = loc;

       		var self = this;
 			var deferred = $q.defer();
			$http(mobileClientService.makeRequestOption({
				method: "PUT",
				url: '/user/simulator/vehicle/' + this.vehicleId + '?command=position',
				headers: {
					"iota-simulator-uuid": this.clientId
				},
				data: {parameters: {latitude: loc.latitude, longitude: loc.longitude, heading: loc.heading, doNotResetRoute: donotResetRoute}}
			})).success(function(result, status){
				deferred.resolve(self._updateRoute(result.data && result.data[self.vehicleId]));
			}).error(function(error, status){
				console.error("Error[" + status + "]: " + error);
				deferred.reject(error);
			});
    		return deferred.promise;
    	},
    	getCurrentPosition: function(){
    		return this.prevLoc;
    	},
    	setDestination: function(loc){
    		if(this.isDriving()){
    			// under driving
    			return;
    		}
    		this.destination = loc;

    		var self = this;
 			var deferred = $q.defer();
			$http(mobileClientService.makeRequestOption({
				method: "PUT",
				url: '/user/simulator/vehicle/' + this.vehicleId + '?command=route',
				headers: {
					"iota-simulator-uuid": this.clientId
				},
				data: {parameters: {destination: {latitude: loc.latitude, longitude: loc.longitude, heading: loc.heading}}}
			})).success(function(result, status){
				deferred.resolve(self._updateRoute(result.data && result.data[self.vehicleId]));
			}).error(function(error, status){
				console.error("Error[" + status + "]: " + error);
				deferred.reject(error);
			});
    		return deferred.promise;
    	},
    	getDestination: function() {
    		return this.destination;
    	},
    	getRouteData: function() {
    		var self = this;
 			var deferred = $q.defer();
			$http(mobileClientService.makeRequestOption({
				method: "GET",
				url: '/user/simulator/vehicle/' + this.vehicleId + '/route',
				headers: {
					"iota-simulator-uuid": this.clientId
				}
			})).success(function(result, status){
				deferred.resolve(self._updateRoute(result.data));
			}).error(function(error, status){
				console.error("Error[" + status + "]: " + error);
				deferred.reject(error);
			});
				return deferred.promise;
			},
			setProperties: function(properties) {
				this.properties = properties;
				var deferred = $q.defer();
				$http(mobileClientService.makeRequestOption({
					method: "PUT",
					url: '/user/simulator/vehicle/' + this.vehicleId + '?command=properties',
					headers: {
						"iota-simulator-uuid": this.clientId
					},
					data: {parameters: properties}
				})).success(function(result, status){
					deferred.resolve(result);
				}).error(function(error, status){
					console.error("Error[" + status + "]: " + error);
					deferred.reject(error);
				});
				return deferred.promise;
			},
			unsetProperties: function(/*Array*/ propertyNames){
				var deferred = $q.defer();
				$http(mobileClientService.makeRequestOption({
					method: "PUT",
					url: '/user/simulator/vehicle/' + this.vehicleId + '?command=unsetproperties',
					headers: {
						"iota-simulator-uuid": this.clientId
					},
					data: {parameters: propertyNames}
				})).success(function(result, status){
					deferred.resolve(result);
				}).error(function(error, status){
					console.error("Error[" + status + "]: " + error);
					deferred.reject(error);
				});
				return deferred.promise;
			}
		};
		return service;
});