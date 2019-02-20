/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
(function (scriptBaseUrl) {
	angular.module('htmlClient').
		component('clientDrive', {
			templateUrl: scriptBaseUrl + 'html-client-drive.html',
			controller: function ClientTop($scope, $http, $q, $window, $timeout, eventService, geofenceService, poiService, simulatedVehicle) {
				$window.onbeforeunload = function (e) {
					// stop driving when user closes simulator window
					simulatedVehicle.setVehicleMonitor();
				};

				////////////////////////////////////////////////////////////////////////////////////////
				// inter frame communication to recieve start/stop all and return status
				////////////////////////////////////////////////////////////////////////////////////////
				function postStatusMessage(target, requestMessage, requestId, isError) {
					target = target || $scope.messageTarget;
					if (!target) {
						return;
					}
					let vehicleId = simulatedVehicle.getVehicleId();
					let driving = simulatedVehicle.isDriving();
					let busy = $scope.requestSending;

					let messageObj = { message: "status", mo_id: vehicleId, driving: driving, busy: busy, requestMessage: requestMessage, requestId: requestId, isError: isError };
					target.postMessage(JSON.stringify(messageObj), "*");
				}

				$($window).on('message', function (e) {
					if ($window.location.origin !== e.originalEvent.origin, 0) {
						return;
					}
					let message = JSON.parse(e.originalEvent.data);
					if (message.message === "simulator-start" || message.message === "simulator-stop") {
						$q.when($scope.onDriving(true, message.message === "simulator-start"), function () {
							postStatusMessage(e.originalEvent.source, message.message, message.requestId);
						}, function (error) {
							postStatusMessage(e.originalEvent.source, message.message, message.requestId, true);
						});
					} else if (message.message === "simulator-set-message-target") {
						$scope.messageTarget = e.originalEvent.source;
						postStatusMessage(e.originalEvent.source, message.message, message.requestId);
					} else if (message.message === "simulator-terminated-all") {
						// terminated
						$scope.requestSending = true;
						$scope.$apply();
					}
				});

				////////////////////////////////////////////////////////////////////////////////////////
				// Simulated Vehicle Monitor
				////////////////////////////////////////////////////////////////////////////////////////
				$scope.drivingEvent = {};
				$scope.isDriving = simulatedVehicle.isDriving();

				function showTripDetails(route) {
					if (!route.mode) {
						$scope.routeDetails = " Information is not available in this mode.";
						return;
					}
					let timeText = "";
					let traveltime = Math.ceil(route.traveltime);
					if (traveltime > 3600) {
						timeText = Math.ceil(traveltime / 3600 * 100) / 100 + " hours";
					} else if (traveltime > 60) {
						timeText = Math.ceil(traveltime / 60 * 100) /100  + " minutes";
					} else {
						timeText = traveltime + " seconds";
					}
					let distanceText = "";
					let distance = Math.ceil(route.distance);
					if (distance > 1000) {
						distanceText = distance / 1000 + " km";
					} else {
						distanceText = distance + " m";
					}
					$scope.routeDetails = " (travel time: " + timeText + ", distance: " + distanceText + ")";
				}

				function updateDrvingEvent(probe) {
					var event = { props: {} };
					try {
						if (probe) {
							event.latitude = probe.matched_latitude || probe.latitude;
							event.longitude = probe.matched_longitude || probe.longitude;
							event.heading = probe.matched_heading || probe.heading;
							event.speed = probe.speed;
							if (probe.props) {
								event.props = probe.props;
							}
						} else {
							var loc = simulatedVehicle.getCurrentPosition();
							event.latitude = loc.latitude;
							event.longitude = loc.longitude;
							event.heading = loc.heading || 0;
							event.speed = 0;
							if (simulatedVehicle.properties) {
								event.props = simulatedVehicle.properties;
							}
						}
						$scope.drivingEvent = event;
						if (probe)
							$scope.$apply();
						//		        	$scope.isDriving = simulatedVehicle.isDriving();
					} catch (e) {
						console.error(e);
					}
				}

				const callbackMethods = {
					initialized: function updateMethod_initialized(b, error) {
						if (error) {
							console.log("initialization failed");
							return;
						}
						let vehicle = simulatedVehicle.getVehicle();
						let tank = vehicle.properties && vehicle.properties.fueltank;
						if (tank) {
							$scope.rules[1].label = "Fuel (Troubled if smaller than " + tank / 2 + ", Critical if smaller than " + tank / 10 + ")";
						}
						postStatusMessage();
					},
					route: function updateMethod_route(tripRoute, error) {
						if (!tripRoute || tripRoute.length == 0)
							return;

						$scope.routeSearching = false;

						tripRouteCache = tripRoute;
						$scope.availableRouteModes = [];
						tripLayer.getSource().clear();
						if (tripRoute.every((route) => { return $scope.currentRouteMode !== route.mode; })) {
							$scope.currentRouteMode = tripRoute[0].mode;
						}
						tripRoute.forEach(function(route) {
							_plotTripRoute(route.route, ($scope.currentRouteMode && route.mode === $scope.currentRouteMode) ? selectedTripStyle : tripStyle);
							if (route.mode && $scope.routemodes[route.mode]) {
								$scope.availableRouteModes.push({label: $scope.routemodes[route.mode], value: route.mode});
								if ($scope.currentRouteMode === route.mode) {
									showTripDetails(route);
								}
							} else {
								showTripDetails(route);
							}
						});
						$scope.routeFixed = $scope.availableRouteModes.length < 2;
					},
					state: function udpateMethod_state(state, error) {
						$scope.isDriving = state === 'driving';
						postStatusMessage();
					},
					position: function updateMethod_position(position, error) {
						if ($scope.traceCurrentLocation) {
							lockPosition = true;
							showLocation(position);
						}
						let loc = [position.longitude || 0, position.latitude || 0];
						let newPosition = ol.proj.fromLonLat(loc);
						carFeature.getGeometry().setCoordinates(newPosition);
					},
					probe: function updateMethod_probe(probe, error) {
						if (probe) {
							let loc = [probe.longitude || 0, probe.latitude || 0];
							let newPosition = ol.proj.fromLonLat(loc);
							plotRoute(newPosition, error ? routeStyle : matchedRouteStyle);
							if (!error) {
								updateDrvingEvent(probe);
								updateVehicle(probe, probe.notification);
							}
						}
					}
				};

				function vehicleMonitor(type, data, error) {
					const func = callbackMethods[type];
					if (func) {
						func(data, error);
					}
				}

				//////////////////////////////////////////////////////////////////
				// Start/Stop Driving Handler (In-Frame) 
				//////////////////////////////////////////////////////////////////
				$scope.drivingButtonLabel = simulatedVehicle.isDriving() ? "Stop Driving" : "Start Driving";
				// start driving
				function startDriving() {
					// show only driving route
					$scope.routeFixed = true;
					tripLayer.getSource().clear();
					tripRouteCache && tripRouteCache.forEach(function(route) {
						if (route.mode == $scope.currentRouteMode) {
							_plotTripRoute(route.route, drivingTripStyle);
						}
					});
					return $q.when(simulatedVehicle.startDriving($scope.currentRouteMode), function () {
						console.log("vehicle is started.");
					});
				}

				// stop driving
				function stopDriving() {
					return $q.when(simulatedVehicle.stopDriving(), function () {
						// clear messages
						updateDrvingEvent();
						updateVehicle();
					});
				}

				// Start/Stop driving button
				$scope.onDriving = function (force, drive) {
					var deferred = $q.defer();
					if ($scope.requestSending) {
						deferred.reject("function is busy");
					} else if (simulatedVehicle.isDriving() && (!force || !drive)) {
						$scope.drivingButtonLabel = "Stopping...";
						$scope.requestSending = true;
						!force && postStatusMessage();
						stopDriving().then(function () {
							$scope.drivingButtonLabel = "Start Driving";
							$scope.requestSending = false;
							deferred.resolve(true);
							!force && postStatusMessage();
						}, function (err) {
							alert((err.data && err.data.message) || err.responseText || err.message || err);
							$scope.drivingButtonLabel = "Stop Driving";
							$scope.requestSending = false;
							deferred.reject(err);
							!force && postStatusMessage();
						});
					} else if (!simulatedVehicle.isDriving() && (!force || drive)) {
						// clean route dots
						routeLayer.getSource().clear();
						$scope.drivingButtonLabel = "Starting...";
						$scope.requestSending = true;
						!force && postStatusMessage();
						startDriving().then(function (tripId) {
							$scope.drivingButtonLabel = "Stop Driving";
							$scope.requestSending = false;
							deferred.resolve(true);
							!force && postStatusMessage();
						}, function (err) {
							alert((err.data && err.data.message) || err.responseText || err.message || err);
							$scope.drivingButtonLabel = "Start Driving";
							$scope.requestSending = false;
							deferred.reject(err);
							!force && postStatusMessage();
						});
					} else {
						deferred.resolve(false);
					}
					return deferred.promise;
				};

				//////////////////////////////////////////////////////////////////
				// Vehicle Data Simulator
				//////////////////////////////////////////////////////////////////
				// rules
				// should be synced with rules defined in /driverinsights/fleetalert.js
				const _upateVehicleProperties = function() {
					if ($scope.vehicleDataName) {
						let value = $scope.vehicleDataValue;
						if (value) {
							let property = {};
							vehicleData[$scope.vehicleDataName] = property[$scope.vehicleDataName] = $scope.vehicleDataName === "engineTemp" ? String((value - 32) * 5 / 9) : value;
							simulatedVehicle.setProperties(property);
						} else {
							delete vehicleData[$scope.vehicleDataName];
							simulatedVehicle.unsetProperties([$scope.vehicleDataName]);
						}
					}
				};
				const _updateVehicleAcceleration = function() {
					console.log("accel changed");
					if ($scope.vehicleDataName) {
						let value = $scope.vehicleDataValue;
						if (value) {
							let property = {};
							vehicleData[$scope.vehicleDataName] = value;
							property[$scope.vehicleDataName] = value;
							simulatedVehicle.setAcceleration(value);
						} else {
							delete vehicleData[$scope.vehicleDataName];
							simulatedVehicle.setAcceleration(0);
						}
					}
				};
				$scope.rules = [
					{ propName: "engineTemp", label: "Engine Temperature (Critical if larger than 248)", method: _upateVehicleProperties},
					{ propName: "fuel", label: "Fuel", method: _upateVehicleProperties},
					{ propName: "accel", label: "Acceleration [m/s^2] (1 m/s^2 = 2.2 mph/s) (Alert if larger than 4 m/s^2)", method: _updateVehicleAcceleration}
				];

				// vehicle data control panel
				$scope.fuel = null;
				$scope.engineTemp = null;

				var vehicleData = {};
				$scope.updateVehicleDataName = function () {
					let value = vehicleData[$scope.vehicleDataName];
					if (value) {
						$scope.vehicleDataValue = $scope.vehicleDataName === "engineTemp" ? String(value * 9 / 5 + 32) : value;
					} else {
						$scope.vehicleDataValue = "";
					}
				};
				$scope.updateVehicleDataValue = function () {
					for (let i = 0; i < $scope.rules.length; i++) {
						if ($scope.rules[i].propName === $scope.vehicleDataName) {
							if ( _.isFunction($scope.rules[i].method)) {
								$scope.rules[i].method();
							}
						}
					}
				};

				//////////////////////////////////////////////////////////////////
				// Route Planner
				//////////////////////////////////////////////////////////////////
				$scope.routemodes = {time: "Shortest time", distance: "Shortest distance", pattern: "Trajectory pattern", unknown: "Unknown"};
				$scope.availableRouteModes = [];
				$scope.routeFixed = false;
				$scope.currentRouteMode = "time";
				$scope.routeDetails = "";
				$scope.directions = [{ label: "North", value: 0 }, { label: "North East", value: 45 }, { label: "East", value: 90 }, { label: "South East", value: 135 }, { label: "South", value: 180 }, { label: "South West", value: 225 }, { label: "West", value: 270 }, { label: "North West", value: 315 }];
				$scope.routeSearching = true;
				$scope.srcDirection = 0;
				$scope.dstDirection = 0;
				$scope.mouseStartPositionMode = true;
				$scope.mouseDestinationMode = false;
				$scope.opt_avoid_events = simulatedVehicle.getOption("avoid_events");
				$scope.opt_route_loop = simulatedVehicle.getOption("route_loop");
				$scope.assignedPOIs = [];

				$scope.onChangeMouseMode = function(mode) {
					if ($scope.mouseStartPositionMode && $scope.mouseDestinationMode) {
						if (mode == "start")
							$scope.mouseDestinationMode = false;
						else
							$scope.mouseStartPositionMode = false;
					}
				};

				function _requestNewRoute(method, callback) {
					$scope.requestSending = true;
					$scope.routeSearching = true;
					postStatusMessage();
					method().then(function(result) {
						if (_.isFunction(callback)) {
							callback(data);
						}
						$scope.requestSending = false;
						$scope.routeSearching = false;
						postStatusMessage();
				}, function(error) {
						$scope.requestSending = false;
						$scope.routeSearching = false;
						postStatusMessage();
					});
				}

				function _setWaypoints(pois) {
					let waypoints = pois.map(function(poi) { return {latitude: poi.latitude, longitude: poi.longitude, poi_id: poi.id};});
					_requestNewRoute(() => simulatedVehicle.setWaypoints(waypoints));
				}

				// Direction of start location and destination handler
				$scope.onChangeSrcDirection = function () {
					let loc = simulatedVehicle.getCurrentPosition();
					if (loc) {
						_requestNewRoute(() => simulatedVehicle.setCurrentPosition({ latitude: loc.latitude, longitude: loc.longitude, heading: $scope.srcDirection }));
					}
				};
				$scope.onChangeDstDirection = function () {
					let loc = simulatedVehicle.getDestination();
					if (loc) {
						_requestNewRoute(() => simulatedVehicle.setDestination({ latitude: loc.latitude, longitude: loc.longitude, heading: $scope.dstDirection }));
					}
				};

				// Route options handler
				$scope.onAvoidEventChange = function () {
					_requestNewRoute(() => simulatedVehicle.setOption("avoid_events", $scope.opt_avoid_events));
				};
				$scope.onRouteLoop = function () {
					_requestNewRoute(() => simulatedVehicle.setOption("route_loop", $scope.opt_route_loop));
				};
				$scope.onChangeRouteMode = function () {
					tripLayer.getSource().clear();
					tripRouteCache && tripRouteCache.forEach(function(route) {
						if ($scope.currentRouteMode && route.mode === $scope.currentRouteMode) {
							_plotTripRoute(route.route, selectedTripStyle);
							showTripDetails(route);
						} else {
							_plotTripRoute(route.route, tripStyle);
						}
					});
					if (!$scope.currentRouteMode) {
						showTripDetails(route);
					}
				}

				// POI table handler
				$scope.onLoadPOI = function() {
					$scope.assignedPOIs = [];
					poiHelper.searchArea = null;
					poiLayer.getSource().clear();
					poiHelper.poiMap = {};
					poiHelper.updatePOIs();
				};
				$scope.onMoveUpPOI = function() {
					if (!$scope.assignedPOIs || $scope.assignedPOIs.length == 0 || 
						!$scope.selectedPOIID || $scope.assignedPOIs[0].id == $scope.selectedPOIID) {
						return;
					}
					let pois = [];
					$scope.assignedPOIs.forEach(function(poi) {
						if ($scope.selectedPOIID === poi.id) {
							let lastPoi = pois.pop();
							pois.push(poi);
							pois.push(lastPoi);
						} else {
							pois.push(poi);
						}
					});
					$scope.assignedPOIs = pois;
					_setWaypoints(pois);
				};
				$scope.onMoveDownPOI = function() {
					if (!$scope.assignedPOIs || $scope.assignedPOIs.length == 0 || 
						!$scope.selectedPOIID || $scope.assignedPOIs[$scope.assignedPOIs.length-1].id == $scope.selectedPOIID) {
						return;
					}
					let pois = [];
					let targetPOI = null;
					$scope.assignedPOIs.forEach(function(poi) {
						if ($scope.selectedPOIID === poi.id) {
							targetPOI = poi;
						} else if (targetPOI) {
							pois.push(poi);
							pois.push(targetPOI);
							targetPOI = null;
						} else {
							pois.push(poi);
						}
					});
					$scope.assignedPOIs = pois;
					_setWaypoints(pois);
				};
				$scope.onPOISelected = function(index) {
					if ($scope.selectedPOIID) {
						let poi = null;
						for (let i = 0; i < $scope.assignedPOIs.length; i++) {
							if ($scope.assignedPOIs[i].id === $scope.selectedPOIID) {
								poi = $scope.assignedPOIs[i];
								break;
							}
						}
						poiHelper.updateSelection(poi);

						var size = map.getSize();
						var ext = map.getView().calculateExtent(size);
						var extent = ol.proj.transformExtent(ext, 'EPSG:3857', 'EPSG:4326');
						if (extent[0] <= poi.longitude && poi.longitude < extent[2] &&
								extent[1] <= poi.latitude && poi.latitude < extent[3]) {
							return;
						}
						map.getView().setCenter(ol.proj.transform([poi.longitude, poi.latitude], 'EPSG:4326', 'EPSG:3857'));
					}
				};

				//////////////////////////////////////////////////////////////////
				// Route Map
				//////////////////////////////////////////////////////////////////
				$scope.traceCurrentLocation = true;

				//
				// Compose Map component
				//
				var map = null;
				var carFeature = null;
				var destFeature = null;
				var carsLayer = null;
				var eventLayer = null;
				var poiLayer = null;
				var geofenceLayer = null;
				var routeLayer = null;
				var tripLayer = null;
				var routeStyle = null;
				var matchedRouteStyle = null;
				var DEFAULT_ZOOM = 16;

				var mapHelper = null;
				var eventHelper = null;
				var geofenceHelper = null;

				var tripRouteCache = null;

				// How the app can determin if a map is panned by the app or by a user. Need to find a smarter way
				var lockPosition = false;

				// Show current location on a map
				$scope.onCurrentLocation = function () {
					lockPosition = true;
					$scope.traceCurrentLocation = true;
					showLocation(simulatedVehicle.getCurrentPosition());
				};
 
				// Event handlers
				function onMouseDown(e) {
					console.log("mouse down");
					let feature = e.map.forEachFeatureAtPixel(e.pixel,
							function(feature, layer) {
								return feature;
							});

					if (feature && feature.get("type") == "poi") {
						let poi = feature.get("item");;
						for (let i = 0; i < $scope.assignedPOIs.length; i++) {
							let p = $scope.assignedPOIs[i];
							if (p.id === poi.id) {
								$scope.selectedPOIID = p.id;
								poiHelper.updateSelection(p);
								break;
							}
						}
					}
					return !!feature;
				};

				// Show specified location on a map
				function showLocation(location) {
					if (!map) return;
					var view = map.getView();
					view.setRotation(0);
					view.setCenter(ol.proj.fromLonLat([location.longitude || 0, location.latitude || 0]));
					view.setZoom(DEFAULT_ZOOM);
				}

				// Update UI when car probe date is changed
				// add start/end icon
				function plotRoute(position, style, route) {
					if (!routeLayer) {
						return;
					}
					var feature = new ol.Feature({
						geometry: new ol.geom.Point(position),
						route: route
					});
					feature.setStyle(style);
					routeLayer.getSource().addFeature(feature);
				}

				function updateVehicle(probe, notification) {
					// affected events
					var affectedEvents = (notification && notification.affected_events) || [];
					affectedEvents.forEach(function (event) {
						console.log("affected event = " + event.event_id);
					});
					eventHelper.updateAffectedEvents(affectedEvents);

					// notifed messages
					var notifiedMessages = (notification && notification.notified_messages) || [];
					notifiedMessages.forEach(function (message) {
						//					console.log("notified message = " + message.message);
					});
				}

				function setDestination(location) {
					if (!destFeature) {
						destFeature = new ol.Feature({ geometry: new ol.geom.Point(location) });
						var destStyle = new ol.style.Style({
							image: new ol.style.Circle({
								radius: 8,
								fill: new ol.style.Fill({
									color: 'rgba(255, 0, 0, 0.7)'
								})
							})
						});
						destFeature.setStyle(destStyle);
						carsLayer.getSource().addFeature(destFeature);
					}

					destFeature.getGeometry().setCoordinates(location);
				}

				// Start handling move event 
				function enableMoveListener() {
					map.on('pointerdrag', function () {
						// if map is moved by user, disable traceCurrentLocation flag so as not to show car location automatically
						if ($scope.traceCurrentLocation) {
							$scope.traceCurrentLocation = false;
							$scope.$apply();
						}
					});
					map.on("moveend", function (e) {
						if ($scope.traceCurrentLocation && !lockPosition) {
							$scope.traceCurrentLocation = false;
							$scope.$apply();
						}
						lockPosition = false;
					});
					map.on("click", function (e) {
						if (!simulatedVehicle.isDriving()) {
							var loc = ol.proj.toLonLat(e.coordinate);
							if ($scope.mouseStartPositionMode) {
								_requestNewRoute(() => simulatedVehicle.setCurrentPosition({ latitude: loc[1], longitude: loc[0], heading: $scope.srcDirection }));
								carFeature.getGeometry().setCoordinates(e.coordinate);
							} else if ($scope.mouseDestinationMode) {
								_requestNewRoute(() => simulatedVehicle.setDestination({ latitude: loc[1], longitude: loc[0], heading: $scope.dstDirection }));
								setDestination(e.coordinate);
							}
						}
					});
				}

				function _plotTripRoute(tripRoute, style) {
					if (!tripLayer) {
						return;
					}
					if (!tripRoute || tripRoute.length < 2) {
						return;
					}
					var lines = [];
					for (i = 0; i < (tripRoute.length - 1); i++) {
						lines.push([ol.proj.fromLonLat([tripRoute[i].lon, tripRoute[i].lat]),
						ol.proj.fromLonLat([tripRoute[i + 1].lon, tripRoute[i + 1].lat])]);
					}
					var lineStrings = new ol.geom.MultiLineString([]);
					lineStrings.setCoordinates(lines);
					var feature = new ol.Feature(lineStrings);
					if (style)
						feature.setStyle(style);
					tripLayer.getSource().addFeature(feature);
				}

				// Initialize a map
				var initMap = function initMap(location) {
					var centerPosition = ol.proj.fromLonLat([location.longitude || 0, location.latitude || 0]);
					lockPosition = true;

					function interaction() {
						ol.interaction.Pointer.call(this, {
							handleDownEvent: onMouseDown
						});
					};
					ol.inherits(interaction, ol.interaction.Pointer);

					
					// Setup current car position
					carFeature = new ol.Feature({ geometry: new ol.geom.Point(centerPosition) });
					var carStyle = new ol.style.Style({
						image: new ol.style.Icon({
							anchor: [0.5, 0.5],
							anchorXUnits: 'fraction',
							anchorYUnits: 'fraction',
							src: 'images/car.png'
						})
					});
					carsLayer = new ol.layer.Vector({ source: new ol.source.Vector({ features: [carFeature] }), style: carStyle });

					// create route layer
					routeStyle = new ol.style.Style({
						image: new ol.style.Circle({
							radius: 3,
							stroke: new ol.style.Stroke({
								color: 'orange',
								width: 1
							}),
							fill: new ol.style.Fill({
								color: 'rgba(200, 0, 0, 0.7)'
							})
						})
					});

					matchedRouteStyle = new ol.style.Style({
						image: new ol.style.Circle({
							radius: 3,
							stroke: new ol.style.Stroke({
								color: 'darkgreen',
								width: 1
							}),
							fill: new ol.style.Fill({
								color: 'rgba(0, 200, 0, 0.7)'
							})
						})
					});

					routeLayer = new ol.layer.Vector({
						source: new ol.source.Vector()
					});

					// trip layer
					tripStyle = new ol.style.Style({
						stroke: new ol.style.Stroke({ color: 'rgba(120, 120, 120, 0.7)', width: 3 }),
					});
					selectedTripStyle = new ol.style.Style({
						stroke: new ol.style.Stroke({ color: 'rgba(255, 0, 0, 0.7)', width: 4 }),
					});
					drivingTripStyle = new ol.style.Style({
						stroke: new ol.style.Stroke({ color: 'rgba(120, 120, 120, 0.7)', width: 2, lineDash: [12, 15] }),
					});
					tripLayer = new ol.layer.Vector({ source: new ol.source.Vector(), style: tripStyle });

					// event layer
					eventLayer = new ol.layer.Vector({
						source: new ol.source.Vector()
					});

					// POI layer
					poiLayer = new ol.layer.Vector({
						source: new ol.source.Vector()
					});

					// geofence layer
					geofenceLayer = new ol.layer.Vector({
						source: new ol.source.Vector()
					});

					// create a map
					let mouseInteration = new interaction();
					map = new ol.Map({
						interactions: ol.interaction.defaults(undefined).extend([mouseInteration]),
						controls: ol.control.defaults({
							attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
								collapsible: false
							})
						}),
						target: document.getElementById("locationMap"),
						layers: [
							new ol.layer.Tile({ source: new ol.source.OSM({}), preload: 4 }),  // map layer
							geofenceLayer,
							eventLayer,
							poiLayer,
							carsLayer,
							routeLayer,
							tripLayer
						],
						view: new ol.View({
							center: centerPosition,
							zoom: DEFAULT_ZOOM
						}),
					});

					eventHelper = new EventHelper(map, eventLayer, $q, eventService);
					geofenceHelper = new GeofenceHelper(map, geofenceLayer, $q, geofenceService);
					poiHelper = new POIHelper(map, poiLayer, $q, poiService, {mo_id: simulatedVehicle.getMoId()});

					enableMoveListener();

					window.onresize = function () {
						$timeout(function () {
							if ($scope.traceCurrentLocation) {
								lockPosition = true;
							}
							map.updateSize();
						}, 200);
					};

					//
					// Setup popover
					//
					mapHelper = new MapHelper(map);
					mapHelper.addPopOver({
						elm: document.getElementById('infopopup'),
						pin: false,
						//						updateInterval: 1000,
					},
						function showPopOver(elem, feature, pinned, closeCallback) {
							if (!feature) return;
							var content = getPopOverContent(feature);
							if (content) {
								var title = '<div>' + (content.title ? _.escape(content.title) : '') + '</div>' +
									(pinned ? '<div><span class="btn btn-default close">&times;</span></div>' : '');
								var pop = $(elem).popover({
									//placement: 'top',
									html: true,
									title: title,
									content: content.content
								});
								if (pinned) {
									pop.on('shown.bs.popover', function () {
										var c = $(elem).parent().find('.popover .close');
										c.on('click', function () {
											closeCallback && closeCallback();
										});
									});
								}
								$(elem).popover('show');
							}
						},
						function destroyPopOver(elem, feature, pinned) {
							if (!feature) return;
							$(elem).popover('destroy');
						},
						function updatePopOver(elem, feature, pinned) {
							if (!feature) return;
							var content = getPopOverContent(feature);
							if (content) {
								var popover = $(elem).data('bs.popover');
								if (popover.options.content != content.content) {
									popover.options.content = content.content;
									$(elem).popover('show');
								}
							}
						});

					// popover - generate popover content from ol.Feature
					var getPopOverContent = function getPopOverContent(feature) {
						var content = feature.get('popoverContent');
						if (content)
							return { content: '<span style="white-space: nowrap;">' + _.escape(content) + '</span>' };

						var item = feature.get('item');
						if (item) {
							if (item.event_id)
								return eventHelper.createEventDescriptionHTML(item);
							else if (item.id && item.properties)
								return poiHelper.createPOIDescriptionHTML(item);
							//						else if (item.geometry)
							//							return geofenceHelper.createGeofenceDescriptionHTML(item);
						} else {
							var route = feature.get('route');
							if (route) {
								var result = { content: '', title: 'Route' };

								var lat = route.matched_latitude || route.latitude;
								var lon = route.matched_longitude || route.longitude;
								var heading = route.matched_heading || route.heading;
								var speed = route.speed;
								// location and heading
								var index = Math.floor(((heading / 360 + 1 / 32) % 1) * 16);
								var dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
								var dir = dirs[index];
								result.content = '<table><tbody>' +
									'<tr><th style="white-space: nowrap;text-align:right;"><span style="margin-right:10px;">LOCATION:</span></th><td style="white-space: nowrap">' + Math.round(lat * 10000000) / 10000000 + ',' + Math.round(lon * 10000000) / 10000000 + '</td></tr>' +
									'<tr><th style="white-space: nowrap;text-align:right;"><span style="margin-right:10px;">HEADING:</span></th><td>' + Math.round(heading * 10000000) / 10000000 + ' [' + dir + ']' + '</td></td>' +
									'<tr><th style="white-space: nowrap;text-align:right;"><span style="margin-right:10px;">SPEED:</span></th><td>' + Math.round(speed / 0.01609344) / 100 + 'MPH</td></tr>' +
									'<tbody><table>'
								return result;
							} else if (feature === carFeature) {
							} else if (feature === destFeature) {
								var destination = simulatedVehicle.getDestination();
								if (destination) {
									var result = { content: '', title: 'Destination' };
									result.content = '<table><tbody>' +
										'<tr><th style="white-space: nowrap;text-align:right;"><span style="margin-right:10px;">LOCATION:</span></th><td style="white-space: nowrap">' + Math.round(destination.lat * 10000000) / 10000000 + ',' + Math.round(destination.lon * 10000000) / 10000000 + '</td></tr>' +
										'<tbody><table>'
									return result;
								}
							}
						}
						return null;
					};

					poiHelper.addPOIChangedListener(function(pois) {
						$scope.assignedPOIs = pois.sort((p1, p2) => { 
							return p1.id.localeCompare(p2.id); 
						});
						_setWaypoints(pois);

						if (pois && pois.length > 0) {
							if (!$scope.selectedPOIID) {
								$scope.selectedPOIID = pois[0].id;
							} else {
								for (let i = 0; i < pois.length; i++) {
									if ($scope.selectedPOIID == pois[i].id) {
										$scope.selectedPOIID = pois[i].id;
										return;
									}
								}
								$scope.selectedPOIID = pois[0].id;
							}
						} else {
							$scope.selectedPOIID = null;
						}
					});
				};

				// initializer
				this.$onInit = function () {
					initMap(simulatedVehicle.getCurrentPosition());
					$scope.routeSearching = true;
					simulatedVehicle.setVehicleMonitor(vehicleMonitor);
					updateDrvingEvent();
				};
			}
		});

})((function () {
	// tweak to use script-relative path
	var scripts = document.getElementsByTagName('script');
	var scriptUrl = scripts[scripts.length - 1].src;
	return scriptUrl.substring(0, scriptUrl.lastIndexOf('/') + 1);
})());
