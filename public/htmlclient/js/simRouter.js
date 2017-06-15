/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var $stateProviderRef = null;
 
angular.module('fleetManagementSimulator', ['ui.router', 'ngAnimate'])
	.config(['$locationProvider', '$stateProvider', function($locationProvider, $stateProvider) {
		$locationProvider.html5Mode(true); 
		$stateProviderRef = $stateProvider;
	}])
 
	/* === GENERAL CONTROLLERS === */
	.controller('mainCtrl', ['$scope', '$state', '$http', '$q', '$sce', '$location', '$window', '$document', '$timeout', '$interval', function($scope, $state, $http, $q, $sce, $location, $window, $document, $timeout, $interval) {
		$scope.pageLoaded = false;

		//////////////////////////////////////////////////////////
		// Utility method to load simulator uuid
		//////////////////////////////////////////////////////////
		var key = "vehicle-simulator-client";
        var mobileClientUuid = getCookie(key);
        if (!mobileClientUuid) {
    		mobileClientUuid = chance.guid();
	        setCookie(key, mobileClientUuid);
        }
		
        function getCookie(name) {
            var cookies = $window.document.cookie;
        	var cookieName = name + '=';
            var index = cookies.indexOf(cookieName);
            if (index < 0) {
            	return null;
            }
            var start = index + cookieName.length;
            var end = cookies.indexOf(';', start);
            if (end < 0) {
            	end = cookies.length;
            }
            return decodeURIComponent(cookies.substring(start, end));
        }
        
        function setCookie(name, value) {
        	var cookieValue = name + '=' + encodeURIComponent(value) + '; ';
            $window.document.cookie = cookieValue;
        }

		//////////////////////////////////////////////////////////
		// Utility methods to send heartbeat messages
		//////////////////////////////////////////////////////////
    	function startHeatbeat() {
    		stopHeartbeat();
    		this.heartbeat = $interval(function() {
    			if ($scope.wsConnection) {
    				try {
	    				if ($scope.wsConnection.readyState < 2) {
	        				$scope.wsConnection.send(JSON.stringify({clientId: mobileClientUuid, type: 'heartbeat'}));
	    				} else {
	        				console.error("The websocket is closed or closing. clientId=" + mobileClientUuid);
	    				}
    				} catch (e) {
        				console.error("Cannot connect to the simulator. clientId=" + mobileClientUuid + "error=" + e);
    				}
    			}
    		}.bind(this), 60000);
    	}
    	
    	function stopHeartbeat() {
    		if (this.heartbeat) {
    			$interval.cancel(this.heartbeat);
    			delete this.heartbeat;
    		}
    	}
        
		//////////////////////////////////////////////////////////
		// Utility methods to send probe messages
		//////////////////////////////////////////////////////////
    	function openWebsocket() {
			$http({
				method: "GET",
				url: "/user/simulator/watch"
			}).success(function(data, status) {
				startHeatbeat();

				// receive close message
				var wsProtocol = (location.protocol == "https:") ? "wss" : "ws";
				var wsPort = location.port;
				var wssUrl = wsProtocol + '://' + $window.location.hostname;
				if (wsPort) {
					wssUrl += ':' + wsPort;
				}
				wssUrl += '/user/simulator/watch?clientId=' + mobileClientUuid + '&close=true';
		    	$scope.wsConnection = new WebSocket(wssUrl);
		    	$scope.wsConnection.onmessage = function(message) {
		        	var messageData = message && message.data;
		        	if (!messageData) {
			            console.error("no data contents");  
		        		return;
		        	}
		        	var jsonData = null;
		        	try {
		        		var terminated = false;
		        		jsonData = JSON.parse(messageData);
		        		if (jsonData.type === 'closed') {
		        			stopHeartbeat();
			        		if (jsonData.reason !== 'normal') {
			        			alert("The simulator was terminated automaticaly due to timeout. Reopen the simulator to run vehicles again.");
			    				$scope.busy = true;
			    				_postMessageToVehicles("simulator-terminated-all");
			        		}
		        		}
		        	} catch (e) {
		        		console.error("parse error: " + messageData);
		        		return;
		        	}
		        };
			});
    	}

    	function closeWebsocket() {
			if ($scope.wsConnection) {
				$scope.wsConnection.close();
				delete $scope.wsConnection;
			}
    	}
    	
		//////////////////////////////////////////////////////////
		// Utility methods to load simulated vehicles
		//////////////////////////////////////////////////////////
        function getLocation(loc) {
        	var deferred = $q.defer();
        	if (loc) {
        		deferred.resolve(loc.split(','));
        	} else if (navigator.geolocation){
	    		navigator.geolocation.getCurrentPosition(function(position){
	    			var c = position.coords;
	        		deferred.resolve([c.latitude, c.longitude]);
	    		});
	    	} else {
        		deferred.resolve([0, 0]);
        	}
	    	return deferred.promise;
        }

        function loadSimulatedVehicles(numVehicles, locs) {
			$http({
				method: "GET",
				url: "/user/simulator/vehicleList?properties=vehicle,driverId",
				headers: {
					"Content-Type": "application/JSON;charset=utf-8",
					"iota-simulator-uuid": mobileClientUuid
				}
			}).success(function(data, status){
				$http({
					method: "GET",
					url: "/user/simulator/watch"
				}).success(function(data, status) {
					openWebsocket();
					startHeatbeat();
				});
				
				var vehicles = [];
				var promises = [];
				$scope.vehiclesToBeInitialzed = [];
				(data.data || []).forEach(function(info, i){
					var vehicle = info.vehicle;
					var driverId = info.driverId;
					$scope.vehicleStatus[vehicle.mo_id] = {busy: true, driving: info.state === 'driving'};
					$scope.vehiclesToBeInitialzed.push(vehicle.mo_id);
					vehicles.push(vehicle);
	
					var url = "../htmlclient/#/home" 
						+ "?vehicleId=" + vehicle.mo_id 
						+ "&driverId=" + driverId; 
					if (vehicle.siteid) {
						url += "&siteId=" + vehicle.siteid;
					}
					if(vehicle.vendor){
						url += "&vendor=" + vehicle.vendor;
					}
					if(vehicle.serial_number){
						url += "&serial_number=" + vehicle.serial_number;
					}
					if (mobileClientUuid) {
						url += "&clientId=" + mobileClientUuid;
					}
					if(locs){
						url += "&loc=" + locs[0] + ',' + locs[1];
					}
					vehicle.url = $sce.trustAsResourceUrl(url);
					vehicle.display = i === 0;
					if (vehicle.properties) {
						var props = {};
						for (var key in vehicle.properties) {
							props[key.toLowerCase()] = vehicle.properties[key];
						}
						vehicle.properties = props;
					}
				});
				
				$scope.vehicles = vehicles;
					
				// dynamic state
				if(vehicles.length > 0){
					for (i=0; i < vehicles.length; i++) {
						$stateProviderRef.state(vehicles[i].mo_id, {
							url: "/fleet.html#" + vehicles[i].mo_id,
							views: {
								'vehicle': {
									templateUrl: '/htmlclient/vehicle.html',
									persist: true
								}
							}
						});
					}
		
					$scope.pageLoaded = true;
					$scope.selectedIndex = 0;
					$state.go(vehicles[0].mo_id);
				}
			}).error(function(error, status){
				console.error("Cannot get simulated vehicles");
			});
        }

		//////////////////////////////////////////////////////////
		// Utility methods to send/get inter-frame messeges
		//////////////////////////////////////////////////////////
		function _updateVehicleStatus(id, key, value) {
			if (!$scope.vehicleStatus[id]) {
				return;
			}
			var busy = false;
			$scope.vehicleStatus[id][key] = value;
			for (var k in $scope.vehicleStatus) {
				if ($scope.vehicleStatus[k].busy) {
					busy = true;
					break;
				}
			}
			$scope.busy = busy;
		}
		
		function _postMessageToVehicle(message, vehicle) {
			var id = vehicle.mo_id;
			var vehicle_node = document.getElementById(id);
			if (vehicle_node && vehicle_node.contentWindow) {
				if (!$scope.requestIds[message]) {
					$scope.requestIds[message] = [id];
				} else if ($scope.requestIds[message].indexOf(id) < 0) {
					$scope.requestIds[message].push(id);
				}
				_updateVehicleStatus(id, "busy", true);
				var messageObj = {message: message, requestId: id};
				var messageStr = JSON.stringify(messageObj);
				vehicle_node.contentWindow.postMessage(messageStr, "*");
			}
		}
		
		function _postMessageToVehicles(message) {
			$scope.vehicles.forEach(function(vehicle) {
				_postMessageToVehicle(message, vehicle);
			});
		}
		
		function _checkStarted() {
			if ($scope.vehiclesToBeInitialzed.length == 0) {
				$scope.busy = $scope.requestIds.length > 0;
				return;
			}
			$scope.busy = true;
			$scope.vehiclesToBeInitialzed.forEach(function(id) {
				var vehicle_node = document.getElementById(id);
				if (vehicle_node && vehicle_node.contentWindow) {
					var messageObj = {message: "simulator-set-message-target", requestId: id};
					var messageStr = JSON.stringify(messageObj);
					vehicle_node.contentWindow.postMessage(messageStr, "*");
				}
			});
			setTimeout(_checkStarted, 1000);
		}

		$scope.busy = true;
		$scope.vehicleStatus = {};
		$scope.requestIds = {};
		$scope.vehiclesToBeInitialzed = [];
		
		$window.onFrameLoaded = function(id) {
			if (this.initialMessageTimeout) {
				clearTimeout(this.initialMessageTimeout);
				this.initialMessageTimeout = null;
			}
			var self = this;
			this.initialMessageTimeout = setTimeout(function(){
				self.initialMessageTimeout = null;
				_checkStarted();
			}, 1000);
		};
		
		$window.addEventListener('message', function(e) {
        	if ($window.location.origin !== e.origin, 0) {
        		return;
        	}
        	var message = JSON.parse(e.data);
        	if (message.requestId) {
        		if (message.requestMessage === "simulator-set-message-target") {
        			var index = $scope.vehiclesToBeInitialzed.indexOf(message.requestId);
        			if (index >= 0) {
        				$scope.vehiclesToBeInitialzed.splice(index, 1);
        				$scope.busy = $scope.requestIds.length > 0;
        			}
        		} else {
            		var requestIds = $scope.requestIds[message.requestMessage];
            		var index = requestIds.indexOf(message.requestId);
            		if (index >= 0) {
            			requestIds.splice(index, 1);
            		}
            		if (requestIds.length === 0) {
            			if (message.requestMessage === "simulator-start-all") {
                			$scope.requestingStarting = false;
                    		$scope.$apply();
            			} else if (message.requestMessage === "simulator-stop-all") {
                			$scope.requestingStopping = false;
                    		$scope.$apply();
            			}
            		}
            	}
       		}
        	if (message.message === "status") {
				_updateVehicleStatus(message.mo_id, "busy", message.busy);
				_updateVehicleStatus(message.mo_id, "driving", message.driving);
	    		$scope.$apply();
        	}
        });
		
		//////////////////////////////////////////////////////////
		// UI handlers
		//////////////////////////////////////////////////////////
		$scope.selectItem = function(index) {
			var vehicles = $scope.vehicles;	    	 
			vehicles.forEach(function(vehicle, i){
				vehicle.display = i == index;		
			});
			$scope.selectedIndex = index;
		};
	
		$scope.onStartAll = function() {
			if (!$scope.busy) {
				$scope.requestingStarting = true;
				_postMessageToVehicles("simulator-start-all");
			}
		};
		
		$scope.onStopAll = function() {
			if (!$scope.busy) {
				$scope.requestingStopping = true;
				_postMessageToVehicles("simulator-stop-all");
			}
		};

		//////////////////////////////////////////////////////////
		// Start simulator
		//////////////////////////////////////////////////////////
		$q.when(getLocation($location.search().loc), function(locs) {
			$http({
				method: "POST",
				url: "/user/simulator",
				headers: {
					"Content-Type": "application/JSON;charset=utf-8",
					"iota-simulator-uuid": mobileClientUuid
				},
				data: {latitude: locs[0], longitude: locs[1], distance: 100, noErrorOnExist: true}
			}).success(function(data, status) {
				var numVehicles = data.numVehicles;
				if (data.latitude !== undefined && data.longitude !== undefined) {
					locs[0] = data.latitude;
					locs[1] = data.longitude;
				}
				loadSimulatedVehicles(numVehicles, locs);
			}).error(function(error, status){
				console.error("Cannot initialize simulator");
			});
		});
		
		//////////////////////////////////////////////////////////
		// Release the simulator when the browser page is closed
		//////////////////////////////////////////////////////////
		$window.onbeforeunload = function (e) {
			stopHeartbeat();
			closeWebsocket();

			// release the simulator
			$http({
				method: "DELETE",
				url: "/user/simulator",
				headers: {
					"Content-Type": "application/JSON;charset=utf-8",
					"iota-simulator-uuid": mobileClientUuid
				}
			});
			$timeout(function(){}, 3000);
			return "Top simultors?";
		};
    }]);
