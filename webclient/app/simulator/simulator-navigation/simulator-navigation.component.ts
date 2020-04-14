/**
 * Copyright 2020 IBM Corp. All Rights Reserved.
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
import { Component, OnInit, SimpleChange } from '@angular/core';

import * as _ from 'underscore';
import { interval } from 'rxjs';
import { map } from 'rxjs/operators';

import { LocationService, MapArea } from '../../shared/location.service';

import { MapHelper } from '../../shared/map-helper';
import { MapEventHelper } from '../../shared/map-event-helper';
import { EventService } from '../../shared/iota-event.service';
import { MapGeofenceHelper } from '../../shared/map-geofence-helper';
import { GeofenceService } from '../../shared/iota-geofence.service';
import { MapPOIHelper } from '../../shared/map-poi-helper';
import { POIService } from '../../shared/iota-poi.service';
import { SimulatorVehicleService, SimulatorVehicle } from '../../simulator/simulator-vehicle.service';

import { Map, View, Feature, Coordinate, Overlay } from 'ol';
import { Tile } from 'ol/layer';
import { Style, Fill, Icon, Circle, Stroke, RegularShape } from 'ol/style';
import { Point, MultiLineString } from 'ol/geom';
import { OSM } from 'ol/source';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import * as olProj from 'ol/proj';
import * as olControl from 'ol/control';

declare var $; // jQuery from <script> tag in the index.html
// as bootstrap type definitoin doesn't extend jQuery $'s type definition

/**
 * The default zoom value when the map `region` is set by `center`
 */
var DEFAULT_ZOOM = 15;

// internal settings
var INV_MAX_FPS = 1000 / 10;


@Component({
	selector: 'simulator-navigation',
	templateUrl: 'simulator-navigation.component.html',
	styleUrls: ['simulator-navigation.component.css'],
})
export class SimulatorNavigationComponent implements OnInit {
	areas: MapArea[];
	selectedArea: MapArea;

	// Mapping
	map: Map;
	mapEventsLayer: VectorLayer;
	mapGeofenceLayer: VectorLayer;
	mapPOILayer: VectorLayer;
	eventsLayer: VectorLayer;
	carsLayer: VectorLayer;
	routeLayer: VectorLayer;
	tripLayer: VectorLayer;
	tripStyle: Style;
	selectedTripStyle: Style;
	drivingTripStyle: Style;
	routeStyle: Style;
	matchedRouteStyle: Style;
	carFeature: Feature;
	destFeature: Feature;
	mapHelper: MapHelper;
	mapItemHelpers = {};
	aggregationMode: boolean = false;
	mouseStartPositionMode: boolean = false;
	mouseDestinationMode: boolean = false;

	simulatorVehicle: SimulatorVehicle;

	directions = [{ label: "North", value: 0 }, { label: "North East", value: 45 }, { label: "East", value: 90 }, { label: "South East", value: 135 }, { label: "South", value: 180 }, { label: "South West", value: 225 }, { label: "West", value: 270 }, { label: "North West", value: 315 }];
	srcDirection = this.directions[0];
	dstDirection = this.directions[0];

	mapElementId = 'simulatorMap';
	popoverElemetId = 'carmonitorpop';

	rules: Rule[] = [];
	vehicleDataName: string;
	vehicleDataValue: string;

	routemodeTypes;
	availableRouteModes: RouteMode[] = [];
	currentRouteMode: string = null;

	opt_avoid_events: boolean = false;
	opt_route_loop: boolean = false;

	isDriving: boolean = false;
	routeFixed: boolean = false;
	traceCurrentLocation: boolean = true;
	lockPosition: boolean = true;

	requestSending: boolean = false;
	routeSearching: boolean = false;

	drivingVehicleData: DrivingVehicleData = new DrivingVehicleData({}); 
	routeDetails: string = "";

	assignedPOIs = [];
	selectedPOI = null;

	constructor(
		private locationService: LocationService,
		private eventService: EventService,
		private geofenceService: GeofenceService,
		private poiService: POIService,
		private simulatorVehicleService: SimulatorVehicleService
	) {
		this.routemodeTypes = { time: "Shortest time", distance: "Shortest distance", pattern: "Trajectory pattern", unknown: "Unknown" };
		for (let mode in this.routemodeTypes) {
			this.availableRouteModes.push(new RouteMode(this.routemodeTypes[mode], mode));
		}
		this.currentRouteMode = this.availableRouteModes[0].value;

		this.rules = [
			new Rule({ propName: "engineTemp", label: "Engine Temperature (Critical if larger than 248)", method: this.upateVehicleProperties.bind(this) }),
			new Rule({ propName: "fuel", label: "Fuel", method: this.upateVehicleProperties.bind(this) }),
			new Rule({ propName: "accel", label: "Acceleration [m/s^2] (1 m/s^2 = 2.2 mph/s) (Alert if larger than 4 m/s^2)", method: this.updateVehicleAcceleration.bind(this) })
		];

	}

	ngOnInit() {
		this.areas = this.locationService.getAreas().map(x => x);

		// move location
		this.selectedArea = this.areas[this.areas.length - 1];
		if (this.locationService.getMapRegion()) {
			if (this.locationService.getCurrentAreaRawSync()) {
				this.areas.push(this.locationService.getCurrentAreaRawSync());
			}
//			this.areas.push(this.locationService.getMapRegion());
			this.selectedArea = this.areas[this.areas.length - 1];
		} else {
			this.locationService.getCurrentArea().then(area => {
				if (this.locationService.getCurrentAreaRawSync()) {
					this.areas.push(this.locationService.getCurrentAreaRawSync());
				}
				this.selectedArea = area;
			}).catch(ex => {
				this.selectedArea = this.areas[0];
			});
		}

		this.initMap(this.selectedArea);
		this.selectedArea && this.mapHelper.moveMap(this.selectedArea);

		// Subscribe events from simulated vehicles
		this.simulatorVehicleService.getEmitter().subscribe((data) => {
			if (data.type == "selection" && data.state == "updateSelection") {
				this.changeVehicle();
			} else if (data.type == "vehicle" && this.simulatorVehicle && data.mo_id == this.simulatorVehicle.getMoId()) {
				switch (data.state) {
					case "route":
						this.updateRoute(); break;
					case "position":
						this.updateVehiclePosition(data.data); break;
					case "state":
						this.updateVehicleState(data.data); break;
					case "probe":
						this.updateTrajectory(data.data, data.error); break;
				}
			}
		});
		this.changeVehicle();
	}

	ngOnChanges(changes: { [propertyName: string]: SimpleChange }) {
		if ('region' in changes) {
			let region = changes['region'].currentValue;
			console.log("MoveMap", region);
			this.mapHelper && this.mapHelper.moveMap(region);
		}
	}

	// Initializing Map
	initMap(region) {

		let vehicleLocation: Coordinate = [0, 0];
		if (this.simulatorVehicle && this.simulatorVehicle.position) {
			vehicleLocation[0] = this.simulatorVehicle.position.longitude;
			vehicleLocation[1] = this.simulatorVehicle.position.latitude;
		} else if (this.selectedArea && this.selectedArea.extent) {
			const extent = this.selectedArea.extent;
			vehicleLocation[0] = extent[0] + (extent[2] - extent[0]) / 2;
			vehicleLocation[1] = extent[1] + (extent[3] - extent[1]) / 2;
		}
		this.carFeature = new Feature({
			geometry: new Point(vehicleLocation, undefined),
			carStatus: "normal",
		});
		this.lockPosition = true;

		// create layers
		this.eventsLayer = new VectorLayer({
			source: new VectorSource(),
			style: function (feature) {
				return getDrivingVehicleDataStyle(feature.get('drivingVehicleData'));
			},
			renderOrder: undefined
		});
		// car layer with rendering style
		this.carsLayer = new VectorLayer({
			source: new VectorSource({ features: [this.carFeature] }),
			style: function (feature) {
				return getCarStyle(feature.get('carStatus'));
			},
			renderOrder: undefined
		});
		this.mapEventsLayer = new VectorLayer({
			source: new VectorSource(),
			renderOrder: undefined
		});
		this.mapGeofenceLayer = new VectorLayer({
			source: new VectorSource(),
			renderOrder: undefined
		});
		this.mapPOILayer = new VectorLayer({
			source: new VectorSource(),
			renderOrder: undefined
		});
		this.routeLayer = new VectorLayer({
			source: new VectorSource(),
			renderOrder: undefined
		});

		this.tripStyle = new Style({
			stroke: new Stroke({ color: 'rgba(120, 120, 120, 0.7)', width: 3 }),
		});
		this.selectedTripStyle = new Style({
			stroke: new Stroke({ color: 'rgba(255, 0, 0, 0.7)', width: 5 }),
		});
		this.drivingTripStyle = new Style({
			stroke: new Stroke({ color: 'rgba(120, 120, 120, 0.7)', width: 2, lineDash: [12, 15] }),
		});
		// create route layer
		this.routeStyle = new Style({
			image: new Circle({
				radius: 3, 
				stroke: new Stroke({color: 'orange', width: 1}), 
				fill: new Fill({color: 'rgba(200, 0, 0, 0.7)'})
			})});
		this.matchedRouteStyle = new Style({
			image: new Circle({
				radius: 3, 
				stroke: new Stroke({color: 'darkgreen', width: 1}), 
				fill: new Fill({color: 'rgba(0, 200, 0, 0.7)'})
			})});
		
		this.tripLayer = new VectorLayer({ source: new VectorSource(), style: this.tripStyle });

		// create a map
		var mapTargetElement = document.getElementById(this.mapElementId);

		this.map = new Map({
			controls: olControl.defaults({
				attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
					collapsible: false
				})
			}),
			target: mapTargetElement,
			layers: [
				new Tile({
					source: new OSM(),
					preload: 4,
				}),
				this.eventsLayer,
				this.mapGeofenceLayer,
				this.mapEventsLayer,
				this.mapPOILayer,
				this.carsLayer,
				this.routeLayer,
				this.tripLayer
			],
			view: new View({
				center: olProj.fromLonLat((region && region.center) || [0, 0], undefined),
				zoom: ((region && region.zoom) || DEFAULT_ZOOM)
			}),
		});
		// add helpers
		this.mapHelper = new MapHelper(this.map, (coordinate, feature, layer) => {
			let item = feature.get("item");
			if (item) {
				let helper = this.mapItemHelpers[item.getItemType()];
				if (helper && helper.hitTest) {
					return helper.hitTest(item, feature, olProj.toLonLat(coordinate, undefined));
				}
			}
			return true;
		});
		this.mapItemHelpers["event"] = new MapEventHelper(this.map, this.mapEventsLayer, this.eventService);
		this.mapItemHelpers["geofence"] = new MapGeofenceHelper(this.map, this.mapGeofenceLayer, this.geofenceService, { itemLabel: "Boundary" });
		this.mapItemHelpers["poi"] = new MapPOIHelper(this.map, this.mapPOILayer, this.poiService);
		this.mapItemHelpers["poi"].getEmitter().subscribe((data: any) => {
			if (data.type == "items") {
				this.assignedPOIs = data.items && data.items.sort((p1, p2) => {
					return p1.id.localeCompare(p2.id);
				});
				this.selectedPOI = this.mapItemHelpers["poi"].selectedPOI;

				this.setWaypoints(this.assignedPOIs);
			}
		});

		this.enableMoveListener();

		//
		// Setup popover
		//
		// setup alert popover
		// - 1. create alerts Observable
		const getSeverityVal = (alert: any): number => {
			return (alert.severity === 'Critical' || alert.severity === 'High') ? 3 :
				(alert.severity === 'Medium' || alert.severity === 'Low') ? 2 :
					(alert.severity === 'Info') ? 1 : 0;
		}
		const getSeverityColor = (sev: number) => ['green', 'blue', 'orange', 'red'][sev];

		const alertsProvider = interval(2000).pipe(map(() => {
			// get all the alerts here
			if (!this.simulatorVehicle || !this.simulatorVehicle.alerts || this.simulatorVehicle.alerts.length == 0) {
				return [];	
			}
			let alerts:any = this.simulatorVehicle.alerts;
			const getColor = () => {
				var col = Math.max(...alerts.map(getSeverityVal));
				return getSeverityColor(col);
			};
			const getContent = () => {
				// Alert frame
				let content = document.createElement('table');
				content.classList.add('table', 'table-hover', 'table-striped');
				// Alert head
				let thead = document.createElement('thead');
				let tr = document.createElement('tr');
				thead.appendChild(tr);		
				let th = document.createElement('th');
				th.appendChild(document.createTextNode('Message'));
				tr.appendChild(th);
				th = document.createElement('th');
				th.appendChild(document.createTextNode('Severity'));
				tr.appendChild(th);
				// Alert contents
				let tbody = document.createElement('tbody');
				alerts.forEach(alert => {
					let tr = document.createElement('tr');
					let td = document.createElement('td');
					td.appendChild(document.createTextNode(_.escape(alert.description)));
					tr.appendChild(td);
					td = document.createElement('td');
					td.classList.add(_.escape(getSeverityColor(getSeverityVal(alert))));
					td.appendChild(document.createTextNode(_.escape(alert.description)));
					tr.appendChild(td);
					tbody.appendChild(tr);
				});
				content.appendChild(thead);
				content.appendChild(tbody);
				return content;
			};
			const getLastUpdated = () => {
				return Math.max(...alerts.map((alert: any) => {
					return alert.ts || Date.parse(alert.timestamp);
				}));
			}
			return [{
				mo_id: this.simulatorVehicle.mo_id,
				lastUpdated: getLastUpdated(),
				contentHTML: getContent(),
				colorClass: getColor(),
			}];
		}));

		// setup alert popover
		// - 2. setup popover
		this.mapHelper.addModelBasedPopover(alertsProvider, {
			getKey: (model => model.mo_id),
			getLastUpdated: (model => model.lastUpdated),
			getFeature: ((model, map) => this.carFeature),
			createOverlay: ((model, map) => {
				// prepare DIV element for popup
				let elem = document.createElement('div');
				elem.classList.add('mapAlertPopover', 'opening');
				elem.style.fontSize = "90%";
				model.colorClass && elem.classList.add(model.colorClass);
				// prepare the content
				let alertPopoverContent = model.contentHTML;

				// create alert message box
				let title = document.createElement('div');
				title.classList.add('title');
				let child = document.createElement('div');
				child.style.textAlign = "right";
				let a = document.createElement("a");
				a.classList.add('close');
				a.innerText = _.escape('x');
				child.appendChild(a);
				title.appendChild(child);

				let content = document.createElement('div');
				content.appendChild(alertPopoverContent);
				content.classList.add('content');

				while (elem.firstChild) {
					elem.removeChild(elem.lastChild);
				}
				elem.appendChild(title);
				elem.appendChild(content);

				mapTargetElement.appendChild(elem);

				let r = new Overlay({
					element: elem,
					offset: [-10, -3],
					positioning: 'bottom-right',
					stopEvent: true
				});
				return r;
			}),
			showPopover: function showInfoPopover(elem, feature, pinned, model, closeFunc) {
				// schedule opening animation
				_.delay(() => elem.classList.remove('opening'), 100);
				let c = $(elem).find('.close')
				c && c.on('click', function () {
					elem.classList.add('closing');
					setTimeout(() => closeFunc(), 500); // schedule element removel
				});
			},
			updatePopover: function updateInfoPopover(elem, feature, pin, model, closeFunc) {
				// update color
				if (model.colorClass) {
					elem.classList.remove('green', 'blue', 'orange', 'red');
					elem.classList.add(model.colorClass);
				}
				// update content
				let c = $(elem).find('.content');
				c && c.get().forEach((e: Element) => {
						while (e.firstChild) {
							e.removeChild(e.lastChild);
						}
						e.appendChild(model.contentHTML);
				})
			},
			destroyPopover: function destroyInfoPopover(elem, feature, pin, model, closeFunc) {
				elem.classList.add('closing');
				setTimeout(() => closeFunc(), 500); // schedule element removel
				return true;
			}
		});

		// setup animation
		// - workaround styles
		this.mapHelper.preloadStyles(this.map, CAR_STYLES);
		// - define feature synchronizer
		const syncCarFeatures = (surpussEvent = true) => {
			if (!this.simulatorVehicle || !this.simulatorVehicle.position) {
				return;
			}
			const loc = this.simulatorVehicle.position;
			const curPoint = (loc.longitude && loc.latitude) ? new Point(olProj.fromLonLat([loc.longitude, loc.latitude], undefined)) : null;
			if (curPoint && curPoint.getCoordinates() != (<Point>this.carFeature.getGeometry()).getCoordinates()) {
				this.carFeature.setGeometry(curPoint);
			}
			const curStatus = this.simulatorVehicle.alertLevel || 'normal';
			if (curStatus && curStatus !== this.carFeature.get('carStatus')) {
				this.carFeature.set('carStatus', curStatus, surpussEvent);
				this.carFeature.setStyle(getCarStyle(curStatus)); //WORKAROUND: not sure why layer style not work
			}
		}
		// // - register rendering handlers
		this.mapHelper.preComposeHandlers.push((event, frameTime) => {
			try {
				syncCarFeatures();
			} catch (e) {
				console.error('DEBUG-MAP: got exception while syncing car features', e);
			}
		});
		this.mapHelper.postComposeHandlers.push((event, frameTime) => {
			return INV_MAX_FPS; // give delay for next frame if not other events captured
		});

		// start animation
		this.mapHelper.startAnimation();
	}

	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// Event Handers
	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// Mouse Events on Map
	enableMoveListener() {
		this.map.on('pointerdrag', () => {
			// if map is moved by user, disable traceCurrentLocation flag so as not to show car location automatically
			if (this.traceCurrentLocation) {
				this.traceCurrentLocation = false;
			}
		});
		this.map.on("moveend", (e) => {
			if (this.traceCurrentLocation && !this.lockPosition) {
				this.traceCurrentLocation = false;
			}
			this.lockPosition = false;
		});
		this.map.on("click", (e) => {
			if (!this.simulatorVehicle.isDriving()) {
				var loc = olProj.toLonLat(e.coordinate);
				if (this.mouseStartPositionMode) {
					this._requestNewRoute(() => this.simulatorVehicle.setCurrentPosition({ latitude: loc[1], longitude: loc[0], heading: this.srcDirection.value }, false));
					(<Point>this.carFeature.getGeometry()).setCoordinates(e.coordinate);
				} else if (this.mouseDestinationMode) {
					this._requestNewRoute(() => this.simulatorVehicle.setDestination({ latitude: loc[1], longitude: loc[0], heading: this.dstDirection.value }));
					this.setDestination(e.coordinate);
				}
			}
		});
	}

	// Map Area Changed
	onChangeArea() {
		this.selectedArea && this.mapHelper.moveMap(this.selectedArea);
	}

	// Move map location to show vehicle
	onCurrentLocation() {
		this.lockPosition = true;
		this.traceCurrentLocation = true;
		this.showLocation(this.simulatorVehicle.position);
	};

	// Map Zoom Changed
	onZoomToFit() {
		this.lockPosition = false;
		this.traceCurrentLocation = false;

		let tripRouteExtent = this.tripLayer.getSource().getExtent();
		if (tripRouteExtent) {
			let extent = olProj.transformExtent(tripRouteExtent, 'EPSG:3857', 'EPSG:4326');
			this.mapHelper.moveMap({ extent: extent });
		}
	};

	// Vehicle Data Category Changed
	onUpdateVehicleDataName() {
		let data = this.simulatorVehicle.vehicleData[this.vehicleDataName];
		if (data && data.fixedValue) {
			this.vehicleDataValue = this.vehicleDataName === "engineTemp" ? String(data.fixedValue * 9 / 5 + 32) : data.fixedValue;
		} else {
			this.vehicleDataValue = "";
		}
	};

	// Vehicle Data Value Changed
	onUpdateVehicleDataValue = function () {
		for (let i = 0; i < this.rules.length; i++) {
			if (this.rules[i].propName === this.vehicleDataName) {
				if (_.isFunction(this.rules[i].method)) {
					this.rules[i].method();
				}
				if (this.simulatorVehicle && this.simulatorVehicle.vehicleData) {
					const data = this.simulatorVehicle.vehicleData[this.vehicleDataName];
					if (data) {
						data.fixedValue = this.vehicleDataValue;
					}
				}
			}
		}
	};

	// Current or Destination Location Mode Changed
	onChangeMouseMode(mode) {
		if (this.mouseStartPositionMode && this.mouseDestinationMode) {
			if (mode == "start")
				this.mouseDestinationMode = false;
			else
				this.mouseStartPositionMode = false;
		}
	}

	// Direction of src location changed
	onChangeSrcDirection() {
		if (this.simulatorVehicle.isDriving() || !this.mouseStartPositionMode) {
			return;
		}
		let position = this.simulatorVehicle.getCurrentPosition();
		if (!position) {
			return;
		}
		this._requestNewRoute(() => this.simulatorVehicle.setCurrentPosition({ latitude: position.latitude, longitude: position.longitude, heading: this.srcDirection.value }, false));
	}

	// Direction of destination location changed
	onChangeDstDirection() {
		if (this.simulatorVehicle.isDriving() || this.mouseStartPositionMode) {
			return;
		}
		let position = this.simulatorVehicle.getDestination();
		if (!position) {
			return;
		}
		this._requestNewRoute(() => this.simulatorVehicle.setDestination({ latitude: position.latitude, longitude: position.longitude, heading: this.dstDirection.value }));
	}

	// Avoud Event Selected 
	onAvoidEventChange() {
		this._requestNewRoute(() => this.simulatorVehicle.setRouteOption("avoid_events", this.opt_avoid_events));
	};

	// Loop Route Option Selected
	onRouteLoop() {
		this._requestNewRoute(() => this.simulatorVehicle.setRouteOption("route_loop", this.opt_route_loop));
	};

	// POI table handler
	onLoadPOI() {
		this.assignedPOIs = [];
		this.mapPOILayer.getSource().clear();
		this.mapItemHelpers["poi"].updateView();
	}

	onMoveUpPOI() {
		if (!this.assignedPOIs || this.assignedPOIs.length == 0 ||
			!this.selectedPOI || this.assignedPOIs[0] == this.selectedPOI) {
			return;
		}
		let pois = [];
		this.assignedPOIs.forEach((poi) => {
			if (this.selectedPOI === poi) {
				let lastPoi = pois.pop();
				pois.push(poi);
				pois.push(lastPoi);
			} else {
				pois.push(poi);
			}
		});
		this.assignedPOIs = pois;
		this.setWaypoints(pois);
	}

	onMoveDownPOI() {
		if (!this.assignedPOIs || this.assignedPOIs.length == 0 ||
			!this.selectedPOI || this.assignedPOIs[this.assignedPOIs.length - 1] == this.selectedPOI) {
			return;
		}
		let pois = [];
		let targetPOI = null;
		this.assignedPOIs.forEach(function (poi) {
			if (this.selectedPOI === poi.id) {
				targetPOI = poi;
			} else if (targetPOI) {
				pois.push(poi);
				pois.push(targetPOI);
				targetPOI = null;
			} else {
				pois.push(poi);
			}
		});
		this.assignedPOIs = pois;
		this.setWaypoints(pois);
	}

	onPOISelected() {
		if (this.selectedPOI) {
			const poi = this.selectedPOI;
			this.mapItemHelpers["poi"].updateSelection(poi);

			let size = this.map.getSize();
			let ext = this.map.getView().calculateExtent(size);
			let extent = olProj.transformExtent(ext, 'EPSG:3857', 'EPSG:4326');
			if (extent[0] <= poi.longitude && poi.longitude < extent[2] &&
				extent[1] <= poi.latitude && poi.latitude < extent[3]) {
				return;
			}
			this.map.getView().setCenter(olProj.transform([poi.longitude, poi.latitude], 'EPSG:4326', 'EPSG:3857'));
		}
	}

	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// Utility Methods
	///////////////////////////////////////////////////////////////////////////////////////////////////////

	// change selected vehicle
	changeVehicle() {
		if (this.simulatorVehicle == this.simulatorVehicleService.getSelectedSimulatorVehicle()) {
			return;
		}
		this.simulatorVehicle = this.simulatorVehicleService.getSelectedSimulatorVehicle();
		if (!this.simulatorVehicle) {
			return;
		}

		// clear alert messages
		const mapTargetElement = document.getElementById(this.mapElementId);
		const c = $(mapTargetElement).find('.mapAlertPopover');
		c && c.get().forEach((e: Element) => {
				while (e.firstChild) {
					e.removeChild(e.lastChild);
				}
		})
		
		// Update vehicle location
		let vehicleLocation: Coordinate = [0, 0];
		if (this.simulatorVehicle.position) {
			vehicleLocation[0] = this.simulatorVehicle.position.longitude;
			vehicleLocation[1] = this.simulatorVehicle.position.latitude;
		} else if (this.selectedArea && this.selectedArea.extent) {
			const extent = this.selectedArea.extent;
			vehicleLocation[0] = extent[0] + (extent[2] - extent[0]) / 2;
			vehicleLocation[1] = extent[1] + (extent[3] - extent[1]) / 2;
		} else if (this.selectedArea && this.selectedArea.center) {
			vehicleLocation = <Coordinate>this.selectedArea.center;
		}
		this.updateVehiclePosition({ longitude: vehicleLocation[0], latitude: vehicleLocation[1] });

		// Reset event notification
		this.updateNotification(null);

		// Update POIs for the vehicle
		this.mapItemHelpers["poi"].setQueryProperties({ mo_id: this.simulatorVehicle.mo_id });
		this.mapItemHelpers["poi"].updateView();

		// Update Fuel Tank
		const tank = this.simulatorVehicle.properties && this.simulatorVehicle.properties.fueltank;
		if (tank) {
			this.rules[1].label = "Fuel (Troubled if smaller than " + tank / 5 + ", Critical if smaller than " + tank / 10 + ")";
		}
		if (this.vehicleDataName && this.simulatorVehicle.vehicleData && this.simulatorVehicle.vehicleData[this.vehicleDataName]) {
			this.vehicleDataValue = this.simulatorVehicle.vehicleData[this.vehicleDataName].fixedValue;
		} else {
			this.vehicleDataValue = "";
		}

		// Update route
		this.updateRoute();
	}

	setDestination(location) {
		if (!this.destFeature) {
			this.destFeature = new Feature({ geometry: new Point(location) });
			let destStyle = new Style({
				image: new Circle({
					radius: 8,
					fill: new Fill({
						color: 'rgba(255, 0, 0, 0.7)'
					})
				})
			});
			this.destFeature.setStyle(destStyle);
			this.carsLayer.getSource().addFeature(this.destFeature);
		}
		(<Point>this.destFeature.getGeometry()).setCoordinates(location);
	}

	// Show searched routes
	updateRoute() {
		this.updateRouteOption();
		if (this.simulatorVehicle && this.simulatorVehicle.trajectoryData.length > 0) {
			this.clearRoute();
			this.showDrivingRoute();
			this.showTrajectory();
		} else {
			this.clearTrajectory();
			this.showRouteCandidates();
		}
		this.routeFixed = this.availableRouteModes.length < 2;
	}

	// Update route option
	updateRouteOption() {
		let routemodeArray;
		if (this.simulatorVehicle && this.simulatorVehicle.routeData) {
			routemodeArray = _.pluck(this.simulatorVehicle.routeData, "mode");
		} else {
			routemodeArray = _.keys(this.routemodeTypes);
			this.routeFixed = true;
		}
		const current = this.currentRouteMode;
		this.availableRouteModes = [];
		for (let mode in this.routemodeTypes) {
			if (_.contains(routemodeArray, mode)) {
				const routeMode = new RouteMode(this.routemodeTypes[mode], mode);
				this.availableRouteModes.push(routeMode);
				if (current == mode) {
					this.currentRouteMode = routeMode.value;
				}
			}
		}
	}

	// Move vehicle position
	updateVehiclePosition(position) {
		if (this.traceCurrentLocation) {
			this.lockPosition = true;
			this.showLocation(position);
		}
		// let loc: Coordinate = [position.longitude || 0, position.latitude || 0];
		// let newPosition: Coordinate = olProj.fromLonLat(loc);
		// (<Point>this.carFeature.getGeometry()).setCoordinates(newPosition);
	}

	// Update vehicle state
	updateVehicleState(state:string) {
		switch (state) {
			case "driving":
				this.routeFixed = true;
				this.showDrivingRoute();
				break;
		}
	}

	// Update current driving vehicle data displayed on the map
	updateDrivingVehicleData(probe) {
		let event:any = { props: {} };
		if (probe) {
			event.latitude = probe.matched_latitude || probe.latitude;
			event.longitude = probe.matched_longitude || probe.longitude;
			event.heading = probe.matched_heading || probe.heading;
			event.speed = probe.speed;
			if (probe.props) {
				event.props = probe.props;
			}
		} else {
			var loc = this.simulatorVehicle.getCurrentPosition();
			event.latitude = loc.latitude;
			event.longitude = loc.longitude;
			event.heading = loc.heading || 0;
			event.speed = 0;
			if (this.simulatorVehicle.properties) {
				event.props = this.simulatorVehicle.properties;
			}
		}
		this.drivingVehicleData = new DrivingVehicleData(event);
	}

	// Update vehicle trajectory
	updateTrajectory(probe:any, error:any) {
		if (!probe) {
			return;
		}
		let loc: Coordinate = [probe.longitude || 0, probe.latitude || 0];
		let newPosition = olProj.fromLonLat(loc);
		this.putBreadcrumb(newPosition, error ? this.routeStyle : this.matchedRouteStyle);
		this.updateDrivingVehicleData(probe);
		this.updateNotification(probe.notification);
	}

	// Put a feature to show current vehicle location
	putBreadcrumb(position, style) {
		if (!this.routeLayer) {
			return;
		}
		var feature = new Feature({
			geometry: new Point(position),
		});
		feature.setStyle(style);
		this.routeLayer.getSource().addFeature(feature);
	}

	// Update notifications for current vehicle
	updateNotification(notification) {
		// affected events
		const affectedEvents = (notification && notification.affected_events) || [];
		affectedEvents.forEach((event) => {
			console.log("affected event = " + event.event_id);
		});
		this.mapItemHelpers["event"].updateAffectedEvents(affectedEvents);

		// notifed messages
		const notifiedMessages = (notification && notification.notified_messages) || [];
		notifiedMessages.forEach((message) => {
			console.log("notified message = " + message.message);
		});
	}

	// Show specified location on a map
	showLocation(location) {
		if (!this.map) return;
		var view = this.map.getView();
		view.setRotation(0);
		view.setCenter(olProj.fromLonLat([location.longitude || 0, location.latitude || 0]));
		view.setZoom(DEFAULT_ZOOM);
	}

	// Show all sarched routes
	showRouteCandidates() {
		this.clearRoute();
		if (!this.simulatorVehicle || !this.simulatorVehicle.routeData) {
			return;
		}

		if (this.simulatorVehicle.routeData.every((route) => { return this.currentRouteMode !== route.mode; })) {

			this.currentRouteMode = this.simulatorVehicle.routeData[0].mode;
		}
		this.simulatorVehicle.setRouteMode(this.currentRouteMode);

		let selectedRoute = null;
		const routes = this.simulatorVehicle.routeData;
		routes.forEach((route) => {
			if (this.currentRouteMode && route.mode === this.currentRouteMode) {
				selectedRoute = route;
			} else {
				this.drawTripRoute(route.route, this.tripStyle);
			}
			if (selectedRoute) {
				this.drawTripRoute(selectedRoute.route, this.selectedTripStyle);
				this.showTripDetails(selectedRoute);
			}
		});
	}

	// Clear all searched route
	clearRoute() {
		this.tripLayer.getSource().clear();
	}
	
	// Show trajectory
	showTrajectory() {
		this.clearTrajectory();
		this.simulatorVehicle.trajectoryData && this.simulatorVehicle.trajectoryData.forEach((trajectory) => {
			let loc: Coordinate = [trajectory.longitude || 0, trajectory.latitude || 0];
			let newPosition = olProj.fromLonLat(loc);
			this.putBreadcrumb(newPosition, trajectory.matched ? this.matchedRouteStyle : this.routeStyle);
		});
	}

	// Clear trajectory
	clearTrajectory() {
		this.routeLayer.getSource().clear();
	}

	// Show current driving route
	showDrivingRoute() {
		this.clearRoute();
		const routes = this.simulatorVehicle.routeData;
		routes && routes.forEach((route) => {
			if (route.mode == this.currentRouteMode) {
				this.drawTripRoute(route.route, this.drivingTripStyle);
				this.showTripDetails(route);
			}
		});
	}

	showTripDetails(route) {
		if (!route || !route.mode) {
			this.routeDetails = " Information is not available in this mode.";
			return;
		}
		let timeText = "";
		let traveltime = Math.ceil(route.traveltime);
		if (traveltime > 3600) {
			timeText = Math.ceil(traveltime / 3600 * 100) / 100 + " hours";
		} else if (traveltime > 60) {
			timeText = Math.ceil(traveltime / 60 * 100) / 100 + " minutes";
		} else {
			timeText = traveltime + " seconds";
		}
		let distanceText = "";
		let distance = route.distance / 1000 * 0.6213711922;
		distanceText = Math.ceil(distance * 100) / 100 + " miles";
		this.routeDetails = " (travel time: " + timeText + ", distance: " + distanceText + ")";
	}

	// Draw connection lines to show route
	drawTripRoute(tripRoute, style) {
		if (!this.tripLayer) {
			return;
		}
		if (!tripRoute || tripRoute.length < 2) {
			return;
		}
		let lines = [];
		for (let i = 0; i < (tripRoute.length - 1); i++) {
			lines.push([olProj.fromLonLat([tripRoute[i].lon, tripRoute[i].lat]),
			olProj.fromLonLat([tripRoute[i + 1].lon, tripRoute[i + 1].lat])]);
		}
		let lineStrings = new MultiLineString([]);
		lineStrings.setCoordinates(lines);
		let feature = new Feature(lineStrings);
		if (style)
			feature.setStyle(style);
		this.tripLayer.getSource().addFeature(feature);
	}

	// Send vehicle properties
	upateVehicleProperties() {
		if (this.vehicleDataName) {
			let value =this.vehicleDataValue;
			if (value) {
				let property = {};
				property[this.vehicleDataName] = this.vehicleDataName === "engineTemp" ? ((<any>value - 32) * 5 / 9) : value;
				this.simulatorVehicle.vehicleData[this.vehicleDataName].fixedValue = property[this.vehicleDataName];
				this.simulatorVehicle.setProperties(property);
			} else {
				delete this.simulatorVehicle.vehicleData[this.vehicleDataName].fixedValue;
				this.simulatorVehicle.unsetProperties([this.vehicleDataName]);
			}
		}
	};

	// Send vehicle acceleration
	updateVehicleAcceleration() {
		console.log("accel changed");
		if (this.vehicleDataName) {
			let value = this.vehicleDataValue;
			if (value) {
				let property = {};
				property[this.vehicleDataName] = value;
				this.simulatorVehicle.vehicleData[this.vehicleDataName].fixedValue = property[this.vehicleDataName];
				this.simulatorVehicle.setAcceleration(value);
			} else {
				delete this.simulatorVehicle.vehicleData[this.vehicleDataName].fixedValue;
				this.simulatorVehicle.setAcceleration(0);
			}
		}
	}

	// Set waypoints
	setWaypoints(pois) {
		let waypoints = pois.map(function (poi) { return { latitude: poi.latitude, longitude: poi.longitude, poi_id: poi.id }; });
		this._requestNewRoute(() => this.simulatorVehicle.setWaypoints(waypoints));
	}

	_requestNewRoute(method) {
		this.requestSending = true;
		this.routeSearching = true;
		method().then((data: any) => {
			this.requestSending = false;
			this.routeSearching = false;
		}, (error: any) => {
			this.requestSending = false;
			this.routeSearching = false;
			console.error(error && error.message);
		});
	}
}

/***************************************************************
 * Style Utility Functions
 */

/**
 * Get car style for the given status
 * @return Style
 */
var getCarStyle = function (status) {
	return CAR_STYLE_MAP[status] || CAR_STYLE_MAP['unknown'];
};

var CAR_STYLES = [];
var CAR_STYLE_MAP = {};
var GROUP_IMAGE_MAP = {};
(function () {
	var data = [['normal', 'img/car-blue.png'],
	['available', 'img/car-green.png'],
	['troubled', 'img/car-orange.png'],
	['critical', 'img/car-red.png'],
	['unknown', 'img/car-gray.png']];
	data.forEach(function (item) {
		var status = item[0], icon = item[1];
		var style = new Style({
			image: new Icon({
				anchor: [16, 16],
				anchorXUnits: 'pixels',
				anchorYUnits: 'pixels',
				opacity: 1,
				scale: 0.8,
				src: icon,
				//imgSize: [32, 32],
			})
		});
		CAR_STYLES.push(style);
		CAR_STYLE_MAP[status] = style;
	});

	var groupStatus = [{ status: "normal", fillColor: "rgba(149,207,96,0.9)", borderColor: "rgba(149,207,96,0.5)" },
	{ status: "troubled", fillColor: "rgba(231,187,57,0.9)", borderColor: "rgba(231,187,57,0.5)" },
	{ status: "critical", fillColor: "rgba(241,141,73,0.9)", borderColor: "rgba(241,141,73,0.5)" }];
	var group = [{ id: 'small', radius: 15, border: 8 },
	{ id: 'medium', radius: 30, border: 12 },
	{ id: 'large', radius: 40, border: 14 },
	{ id: 'x-large', radius: 60, border: 18 }];
	groupStatus.forEach(function (status) {
		var statusImages = {};
		group.forEach(function (item) {
			var circle = new Circle({
				radius: item.radius,
				stroke: new Stroke({
					color: status.borderColor,
					width: item.border
				}),
				fill: new Fill({
					color: status.fillColor
				})
			});
			statusImages[item.id] = circle;
		});
		GROUP_IMAGE_MAP[status.status] = statusImages;
	});
})();

/**
 * Get driver events' style on the map
 */
var getDrivingVehicleDataStyle = (() => {
	var _cache: Style;

	return (event) => {
		if (_cache)
			return _cache;

		_cache = new Style({
			image: new (<any>RegularShape)({ // unwrap class as the class defition is poor
				points: 3,
				radius: 9,
				rotation: 0,
				snapToPixel: false,
				fill: new Fill({ color: 'yellow' }),
				stroke: new Stroke({
					color: 'black', width: 1
				}),
			}),
		});
		return _cache
	};
})();

export class RouteMode {
	label: string;
	value: string;

	constructor(label: string, value: string) {
		this.label = label;
		this.value = value;
	}
}

export class Rule {
	propName: string;
	label: string;
	method: string;

	constructor(props) {
		for (let key in props) {
			this[key] = props[key];
		}
	}
}

class DrivingVehicleData {
	longitude: Number = 0;
	latitude: Number = 0;
	speed: Number = 0;
	heading: Number = 0;
	props: any = {};

	constructor(props) {
		for (let key in props) {
			this[key] = props[key];
		}
	}
}