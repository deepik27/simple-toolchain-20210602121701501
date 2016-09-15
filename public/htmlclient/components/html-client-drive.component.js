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

(function(scriptBaseUrl){
	angular.module('htmlClient').
	component('clientDrive', {
		templateUrl: scriptBaseUrl + 'html-client-drive.html',
		controller: function ClientTop($scope, $http ,$q, assetService, carProbeService, virtualGeoLocation, $window) {
			$window.onbeforeunload = function (e) {
				// inactivate when user closes simulator window
				assetService.activateAssets(false);
			};
			
			$scope.drivingButtonLabel = "Start Driving";
			var updateUIHandle = null;
			// start driving
			function startDriving() {
				var self = this;
				return $q.when(assetService.prepareAssets(), function(assets) {
			    	var promise = [];
			    	promise.push($q.when(assetService.activateAssets(true), function() {
			    		return;
					}));
			    	promise.push($q.when(carProbeService.connect(assets), function() {
			    		return;
					}));
					return $q.all(promise).then(function(){
						var tripId = carProbeService.makeTrip(function(probe) {
							if (self.requiredEvents > 0) {
								self.requiredEvents--;
							}
						});
						return tripId;
					});
				});
			}
			
			// stop driving
			function stopDriving() {
				carProbeService.clearTrip();
				return $q.when(assetService.activateAssets(false), function() {
					return null;
				});
			}
			
			function connectionStateListner(state) {
        		if (state === carProbeService.connectionStateDef.CONNECTION_STATE_DISCONNECTED) {
	            	$scope.isConnected = false;
	            	$scope.connecting = false;
        		} else if (state === carProbeService.connectionStateDef.CONNECTION_STATE_CONNECTING) {
	            	$scope.isConnected = false;
	            	$scope.connecting = true;
        		} else {
	            	$scope.isConnected = true;
	            	$scope.connecting = false;
        		}
        	}
			
			//////////////////////////////////////////////////////////////////
			// UI handlers
			//////////////////////////////////////////////////////////////////

			// Connect/Disconnect button
		    $scope.onConnect = function() {
		    	if (carProbeService.getConnectionState() === carProbeService.connectionStateDef.CONNECTION_STATE_DISCONNECTED) {
		            carProbeService.connect();
		    	} else if (carProbeService.getConnectionState() === carProbeService.connectionStateDef.CONNECTION_STATE_CONNECTED) {
		    		carProbeService.disconnect();
		    	}
		    };
		    
		    // Start/Stop driving button
		    $scope.onDriving = function() {
		    	if (carProbeService.hasTripId()) {
					$scope.drivingButtonLabel = "Stopping Driving";
					$scope.requestSending = true;
					stopDriving().then(function() {
						$scope.driveEvent.trip_id = null;
						$scope.drivingButtonLabel = "Start Driving";
						$scope.requestSending = false;
					}, function(err) {
						alert((err.data && err.data.message) || err.responseText || err.message || err);
						$scope.drivingButtonLabel = "Stop Driving";
						$scope.requestSending = false;
					});
				} else {
					// clean route dots
					routeLayer.getSource().clear();
					$scope.drivingButtonLabel = "Preparing Driving";
					$scope.requestSending = true;
					startDriving().then(function(tripId) {
						$scope.drivingButtonLabel = "Stop Driving";
						$scope.requestSending = false;
						$scope.driveEvent.trip_id = tripId;
					}, function(err) {
						alert((err.data && err.data.message) || err.responseText || err.message || err);
						$scope.drivingButtonLabel = "Start Driving";
						$scope.requestSending = false;
					});
				}
		    };
		    
		    var vehicleData = {};
		    $scope.updateVehicleDataName = function(){
		    	$scope.vehicleDataValue = vehicleData[$scope.vehicleDataName];
		    };
		    $scope.updateVehicleDataValue = function(){
		    	if($scope.vehicleDataName){
		    		vehicleData[$scope.vehicleDataName] = $scope.vehicleDataValue;
			    	carProbeService.setVehicleData(vehicleData);
			    }
		    };
		    $scope.updateVehicleData = function(){
		    	carProbeService.setVehicleData({
		    		fuel: $scope.fuel,
		    		engineTemp: $scope.engineTemp
		    	});
		    };
		    
	        // device ID
		    $scope.connectOnStartup = carProbeService.getSettings().connectOnStartup;
			$scope.simulation = carProbeService.settings.simulation;
		    
		    $scope.traceCurrentLocation = true;
		    
        	$scope.isConnected = false;
        	$scope.connecting = false;
	        $scope.deviceLocation = {};
	        $scope.driveEvent = {};

			// vehicle data control panel
			$scope.fuel = null;
			$scope.engineTemp = null;
			
			//
			// Compose Map component
			//
			var map = null;
			var carFeature = null;
			var destFeature = null;
			var carsLayer = null;
	    	var routeLayer = null;
	    	var tripLayer = null;
	    	var routeStyle = null;
	    	var matchedRouteStyle = null;
			var DEFAULT_ZOOM = 16;

			// How the app can determin if a map is panned by the app or by a user. Need to find a smarter way
			var lockPosition = false;
		    
		    // Show current location on a map
		    $scope.onCurrentLocation = function() {
        		carProbeService.getProbeData().then(function(data) {
        			lockPosition = true;
    				$scope.traceCurrentLocation = true;
    				showLocation(data.deviceLocation);
       		}, function(err) {});
		    };

		    // Show current location on a map
		    $scope.showControlPanel = function() {
   				$scope.isControlPanelDisplayed = !$scope.isControlPanelDisplayed; 
		    };

			// Show specified location on a map
			function showLocation(location) {
				if (!map) return;
				var view = map.getView();
				view.setRotation(0);
				view.setCenter(ol.proj.fromLonLat([location.lng||0, location.lat||0]));
				view.setZoom(DEFAULT_ZOOM);
			}

			// Update UI when car probe date is changed
			// add start/end icon
			function plotRoute(position, style, route){
				if(!routeLayer){
					return;
				}
				var feature = new ol.Feature({
					geometry: new ol.geom.Point(position),
					route : route
				});
				feature.setStyle(style);
				routeLayer.getSource().addFeature(feature);
			}
			
			function updateUI(force) {
	        	var data = {
			        	deviceLocation: {},
			        	driveEvent: {},
			        	matchedData: {}
		        	};
		        if (carProbeService.updateData(data, force)) {
		        	for (var key in data) {
		        		$scope[key] = data[key];
		        	}
		        	
	        		if (carFeature && data.deviceLocation) {
	        			var loc = [data.deviceLocation.lng||0, data.deviceLocation.lat||0];
	    				var newPosition = ol.proj.fromLonLat(loc);
		        		carFeature.getGeometry().setCoordinates(newPosition);
	        			plotRoute(newPosition, routeStyle);
	        		}
	        		if ($scope.traceCurrentLocation) {
	        			lockPosition = true;
		        		showLocation(data.deviceLocation);
	        		}
	        		if(data.matchedData && carProbeService.hasTripId()){
	        			var loc = [data.matchedData.matched_longitude||0, data.matchedData.matched_latitude||0];
	    				var matchedPosition = ol.proj.fromLonLat(loc);
	        			plotRoute(matchedPosition, matchedRouteStyle, data.matchedData);
	        		}
		        }
		        return false;
        	}

	    	// Start handling move event 
			function enableMoveListener() {
				map.on('pointerdrag', function() {
					// if map is moved by user, disable traceCurrentLocation flag so as not to show car location automatically
					if ($scope.traceCurrentLocation) {
						$scope.traceCurrentLocation = false;
		        		$scope.$apply();
					}
				});
				map.on("moveend", function(e){
					if ($scope.traceCurrentLocation && !lockPosition) {
						$scope.traceCurrentLocation = false;
		        		$scope.$apply();
					}
					lockPosition = false;
				});
				map.on("click", function(e){
					if(carProbeService.settings.simulation){
						var loc = ol.proj.toLonLat(e.coordinate);
						/* move-vehicle */
						virtualGeoLocation.setCurrentPosition({lat: loc[1], lon: loc[0]}).then(function(tripRoute){
							_plotTripRoute(tripRoute);
						});
						carFeature.getGeometry().setCoordinates(e.coordinate);
					}
				});
			}

			function _plotTripRoute(tripRoute){
				if(!tripLayer){
					return;
				}
				tripLayer.getSource().clear();
				var lines = [];
				for (i=0; i<(tripRoute.length-1); i++) {
					lines.push([ol.proj.fromLonLat([tripRoute[i].lon, tripRoute[i].lat]), 
								ol.proj.fromLonLat([tripRoute[i+1].lon, tripRoute[i+1].lat])]);
				}
				var lineStrings = new ol.geom.MultiLineString([]);
				lineStrings.setCoordinates(lines);
				var feature = new ol.Feature(lineStrings);
				tripLayer.getSource().addFeature( feature );
			}
			
	    	// start monitoring car probe date
	    	function startPositionMonitoring(interval) {
	    		stopPositionMonitoring();
	        	updateUIHandle = setInterval(function() {
		        	if (updateUI()) {
		        		$scope.$apply();
		        	}
	        	}, interval||1000);
	    	}

	    	// stop monitoring car probe date
	    	function stopPositionMonitoring() {
	        	if (updateUIHandle) {
	        		clearInterval(updateUIHandle);
	        		updateUIHandle = null;
	        	}
	    	}
			
	    	function setDestination(location){
	    		if(!destFeature){
					destFeature = new ol.Feature({geometry:new ol.geom.Point(location)});	
					var destStyle = new ol.style.Style({
						image: new ol.style.Circle({
							radius:8,
							fill : new ol.style.Fill({
								color: 'rgba(255, 0, 0, 0.7)'
							})
						})
					});
					destFeature.setStyle(destStyle);
					carsLayer.getSource().addFeature(destFeature);
				}
				
				destFeature.getGeometry().setCoordinates(location);
	    	}
			
		    // Initialize a map
			var initMap = function initMap(location){
				var centerPosition = ol.proj.fromLonLat([location.lng||0, location.lat||0]);
    			lockPosition = true;
				
				// Setup current car position
				carFeature = new ol.Feature({geometry: new ol.geom.Point(centerPosition)});	
				var carStyle = new ol.style.Style({
					image: new ol.style.Icon({
						anchor: [0.5, 0.5],
						anchorXUnits: 'fraction',
						anchorYUnits: 'fraction',
						src: 'images/car.png'
					})
				});
				carsLayer = new ol.layer.Vector({source: new ol.source.Vector({features: [carFeature]}), style: carStyle});	

				// create route layer
				routeStyle = new ol.style.Style({
					image: new ol.style.Circle({
						radius:3,
						stroke: new ol.style.Stroke({
							color: 'orange',
							width: 1
						}),
						fill : new ol.style.Fill({
							color: 'rgba(200, 0, 0, 0.7)'
						})
					})
				});
				
				matchedRouteStyle = new ol.style.Style({
					image: new ol.style.Circle({
						radius:3,
						stroke: new ol.style.Stroke({
							color: 'darkgreen',
							width: 1
						}),
						fill : new ol.style.Fill({
							color: 'rgba(0, 200, 0, 0.7)'
						})
					})
				});
				
				routeLayer = new ol.layer.Vector({
					source: new ol.source.Vector()
				});

				// trip layer
				var tripStyle = new ol.style.Style({
					stroke: new ol.style.Stroke({ color: 'rgba(120, 120, 120, 0.7)', width: 3 }),
				});
				tripLayer = new ol.layer.Vector({source: new ol.source.Vector(), style: tripStyle});	
				
				// event layer
				eventLayer = new ol.layer.Vector({
					source: new ol.source.Vector()
				});
				
				// create a map
				map =  new ol.Map({
					target: document.getElementById("locationMap"),
					layers: [
						new ol.layer.Tile({source: new ol.source.OSM({}), preload: 4}),  // map layer
						carsLayer,
						routeLayer,
						tripLayer
					],
					view: new ol.View({
						center: centerPosition,
						zoom: DEFAULT_ZOOM
					}),
				});
				
				enableMoveListener();

				window.onresize = function() {
					setTimeout( function() { 
	    				if ($scope.traceCurrentLocation) {
	    					lockPosition = true;
	    				}
						map.updateSize();
					}, 200);
				}
			};
	    	
			// initializer
			this.$onInit = function() {
	        	connectionStateListner(carProbeService.getConnectionState());
	        	carProbeService.setConnectionStateChangedListener(connectionStateListner);

        		carProbeService.getProbeData(true).then(function(data) {
        			// Show current location
					initMap(data.deviceLocation);
					if(carProbeService.settings.simulation){
						virtualGeoLocation.setCurrentPosition({lat: data.deviceLocation.lat, lon: data.deviceLocation.lng}).then(function(tripRoute){
							_plotTripRoute(tripRoute);
						});
					}
					
        		}, function(err) {
					initMap({lat: 0, lng: 0});
        		});
        		updateUI(true);
	        	startPositionMonitoring();
			};
			
			this.$onDestroy = function() {
	        	stopPositionMonitoring();
			};
		}
	});
})((function(){
	// tweak to use script-relative path
	var scripts = document.getElementsByTagName('script');
	var scriptUrl = scripts[scripts.length - 1].src;
	return scriptUrl.substring(0, scriptUrl.lastIndexOf('/') + 1);
})());
