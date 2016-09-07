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
		controller: function ClientTop($scope, $http ,$q, assetService, carProbeService, virtualGeoLocation) {
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
						var tripId = carProbeService.makeTrip();
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
					stopDriving().then(function() {
						$scope.driveEvent.trip_id = null;
					}, function(err) {
						alert((err.data && err.data.message) || err.responseText || err.message || err);
					});
				} else {
					startDriving().then(function(tripId) {
						$scope.driveEvent.trip_id = tripId;
					}, function(err) {
						alert((err.data && err.data.message) || err.responseText || err.message || err);
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
			var carsLayer = null;
	    	var routeLayer = null;
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
			function plotRoute(position, style){
				if(!routeLayer){
					return;
				}
				var feature = new ol.Feature({
					geometry: new ol.geom.Point(position),
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
	        			plotRoute(matchedPosition, matchedRouteStyle);
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
						virtualGeoLocation.setCurrentPosition({lat: loc[1], lon: loc[0]});
						carFeature.getGeometry().setCoordinates(e.coordinate);
					}
				});
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
				})
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
				})
				routeLayer = new ol.layer.Vector({
					source: new ol.source.Vector()
				});

				// create a map
				map =  new ol.Map({
					target: document.getElementById("locationMap"),
					layers: [
						new ol.layer.Tile({source: new ol.source.OSM({}), preload: 4}),  // map layer
						new ol.layer.Vector({source: new ol.source.Vector({features: [carFeature]}), style: carStyle}),  // car layer
						routeLayer
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
