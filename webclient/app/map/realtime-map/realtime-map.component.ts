import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChange, Inject } from '@angular/core';
import { Router } from '@angular/router';

import * as ol from 'openlayers';
import { Observable } from 'rxjs/Observable';

import { MapHelper } from './map-helper';
import { MapEventHelper } from '../../shared/map-event-helper';
import { EventService } from '../../shared/iota-event.service';
import { MapGeofenceHelper } from '../../shared/map-geofence-helper';
import { GeofenceService } from '../../shared/iota-geofence.service';
import { RealtimeDeviceData, RealtimeDeviceDataProvider } from '../../shared/realtime-device';
import { RealtimeDeviceDataProviderService } from '../../shared/realtime-device-manager.service';
import { AppConfig, APP_CONFIG } from '../../app-config';

declare var $; // jQuery from <script> tag in the index.html
// as bootstrap type definitoin doesn't extend jQuery $'s type definition

/*
 * Additional styles, javascripts
 * my css: car-monitor.css
 * OpenLayers 3.5:
 *   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/ol3/3.5.0/ol.css" type="text/css">
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/ol3/3.5.0/ol.js"></script>
 * rx-lite 3.1.2, rxjs-dom 7.0.3:
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/rxjs/3.1.2/rx.lite.js"></script>
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/rxjs-dom/7.0.3/rx.dom.js"></script>
 */

	/**
	 * The default zoom value when the map `region` is set by `center`
	 */
	var DEFAULT_ZOOM = 15;

	// internal settings
	var INV_MAX_FPS = 1000 / 10;
	var ANIMATION_DELAY = 2000;
	var DEFAULT_MOVE_REFRESH_DELAY = 500;
	var NEXT_MAP_ELEMENT_ID = 1;


@Component({
  moduleId: module.id,
  selector: 'fmdash-realtime-map',
  templateUrl: 'realtime-map.component.html',
})
export class RealtimeMapComponent implements OnInit {
  @Input() region: any;
  @Output() extentChanged = new EventEmitter<any>();

	// DEBUG flag
	DEBUG = false;
	debugData = '[none]';

	// Mapping
	map: ol.Map;
	mapEventsLayer: ol.layer.Vector;
	mapGeofenceLayer: ol.layer.Vector;
	eventsLayer: ol.layer.Vector;
	carsLayer: ol.layer.Vector;
	mapHelper: MapHelper;
	eventHelper: MapEventHelper;
	geofenceHelper: MapGeofenceHelper;

	mapElementId = 'carmonitor';
	popoverElemetId = 'carmonitorpop';

	// device features map
	private deviceFeatures: { [deviceID: string]: ol.Feature } = {};

	//
	// Devices management
	//
	animatedDeviceManager: RealtimeDeviceDataProvider;
	animatedDeviceManagerService: RealtimeDeviceDataProviderService;

  constructor(
		private router: Router,
		animatedDeviceManagerService: RealtimeDeviceDataProviderService,
		private eventService: EventService,
		private geofenceService: GeofenceService,
		@Inject(APP_CONFIG) private appConfig: AppConfig
	) {
		this.animatedDeviceManagerService = animatedDeviceManagerService;
		this.animatedDeviceManager = animatedDeviceManagerService.getProvider();
	}

	switchDebug(){
		this.DEBUG = !this.DEBUG;
		this.appConfig.DEBUG = !this.appConfig.DEBUG;
	}
	debugOut(){
		var extent = this.map.getView().calculateExtent(this.map.getSize());
		extent = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
		var center = ol.proj.toLonLat(this.map.getView().getCenter(), 'EPSG:3857');
		this.debugData = "" + JSON.stringify(extent) + ", Center:" + JSON.stringify(center);
	}
	initMap(){
		// create layers
		this.eventsLayer = new ol.layer.Vector({
			source: new ol.source.Vector(),
			style: function(feature){
				return getDrivingEventStyle(feature.get('drivingEvent'));
			}
		});
		// car layer with rendering style
		this.carsLayer = new ol.layer.Vector({
			source: new ol.source.Vector(),
			style: function(feature){
				return getCarStyle(feature.get('carStatus'));
			}
		});
		this.mapEventsLayer = new ol.layer.Vector({
			source: new ol.source.Vector()
		});
		this.mapGeofenceLayer = new ol.layer.Vector({
			source: new ol.source.Vector()
		});

		// create a map
		var opt = new ol.Object();
		var mapTargetElement = document.getElementById(this.mapElementId);

		this.map =  new ol.Map({
			controls: ol.control.defaults({
				attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
					collapsible: false
				})
			}),
			target: mapTargetElement,
			layers: [
				new ol.layer.Tile({
					//source: new ol.source.MapQuest({layer: 'sat'}),
					source: new ol.source.OSM(<ol.Object>{
						//wrapX: false,
						//url: 'url: //{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png', // default
					}),
					preload: 4,
				}),
				this.eventsLayer,
				this.mapGeofenceLayer,
				this.mapEventsLayer,
				this.carsLayer
			],
			view: new ol.View({
				center: ol.proj.fromLonLat((this.region && this.region.center) || [0, 0], undefined),
				zoom: ((this.region && this.region.zoom) || DEFAULT_ZOOM)
			}),
		});
		this.mapHelper = new MapHelper(this.map);
		this.eventHelper = new MapEventHelper(this.map, this.mapEventsLayer, this.eventService);
		this.geofenceHelper = new MapGeofenceHelper(this.map, this.mapGeofenceLayer, this.geofenceService);

		// setup view change event handler
		this.mapHelper.postChangeViewHandlers.push(extent => {
			//this.animatedDeviceManagerService.stopTracking(true, this.mapHelper); // true to move to next extent smoothly
			this.animatedDeviceManagerService.startTracking(extent, this.mapHelper, events => {
				// create markers
				var markers = events.map((event) => {
					var result = new ol.Feature({
						geometry: new ol.geom.Point(ol.proj.fromLonLat(<ol.Coordinate>[event.s_longitude, event.s_latitude], undefined)),
						popoverContent: event.event_name,
					});
					result.setStyle(getDrivingEventStyle(event)); //WORKAROUND not sure why layer style not work
					return result;
				});
				// update layer contents
				this.eventsLayer.getSource().clear();
				this.eventsLayer.getSource().addFeatures(markers);

			});
			// fire event
			this.extentChanged.emit({extent: extent});
		});

		//
		// Setup popover
		//
		this.mapHelper.addPopOver({
				elm: document.getElementById(this.popoverElemetId),
				pin: true,
				updateInterval: 1000,
			},
			function showPopOver(elem, feature, pinned, closeCallback){
				if(!feature) return;
				var content = <any>getPopOverContent(feature);
				if(content){
					var title = '<div>' + (content.title ? _.escape(content.title) : '') + '</div>' +
							(pinned ? '<div><span class="btn btn-default close">&times;</span></div>' : '');
					var pop = $(elem).popover({
						//placement: 'top',
						html: true,
						title: title,
						content: content.content
					});
					if(pinned){
						pop.on('shown.bs.popover', function(){
							var c = $(elem).parent().find('.popover .close');
							c.on('click', function(){
								closeCallback && closeCallback();
							});
						});
					}
					$(elem).popover('show');
				}
			},
			function destroyPopOver(elem, feature, pinned){
				if(!feature) return;
				$(elem).popover('destroy');
			},
			function updatePopOver(elem, feature, pinned){
				if(!feature) return;
				var content = getPopOverContent(feature);
				if(content){
					var popover = $(elem).data('bs.popover');
					if(popover.options.content != content.content){
						popover.options.content = content.content;
						$(elem).popover('show');
					}
				}
			});

		// popover - generate popover content from ol.Feature
		var getPopOverContent = (feature)=> {
			var content = <string>feature.get('popoverContent');
			if(content)
				return {content: '<span style="white-space: nowrap;">' + _.escape(content) + '</span>' };

			var device = feature.get('device');
			if(device){
				let result = { content: '', title: null };
				result.content = ('<span style="white-space: nowrap;">ID: '
												+ '<a onclick="document[\'' + ("_handleClick" + this.popoverElemetId) + '\'](\'' + _.escape(device.deviceID) + '\'); return 0;"'
												+ ' href="javascript:void(0)">'
												+ _.escape((device.vehicle && device.vehicle.serial_number) || device.deviceID)
												+ '</a></span>');
				this.animatedDeviceManagerService.scheduleVehicleDataLoading(device.deviceID);
				var info = device.latestInfo;
				var sample = device.latestSample;
				if(sample && this.DEBUG){
					var content = '<div class="">Connected: ' + sample.device_connection + '</div>' +
									'<div class="">Device status: ' + sample.device_status + '</div>';
					result.content += content;
				}
				if(sample){
					result.content += '<div style="white-space: nowrap;">Longitude: ' + _.escape(sample.lng) + "</div>";
					result.content += '<div style="white-space: nowrap;">Latitude: ' + _.escape(sample.lat) + "</div>";
					result.content += '<div style="white-space: nowrap;">Speed: ' + _.escape(sample.speed) + "</div>";
					result.content += '<div style="white-space: nowrap;">Fuel: ' + _.escape(sample.props && sample.props.fuel) + "</div>";
					result.content += '<div style="white-space: nowrap;">Engine Oil Temperature: ' + _.escape(sample.props && sample.props.engineTemp) + "</div>";
					result.content += '<div style="white-space: nowrap;">Timestamp: ' + _.escape(sample.timestamp) + "</div>";
				}
				if(info){
					if(info.alerts && this.DEBUG){
						result.content += '<div style="white-space: nowrap;">Alerts: ' + _.escape(JSON.stringify(info.alerts)) + "</div>";
					}
					if(info.name && info.makeModel){
						result.title = info.name;
					}else if(info.name){
						result.title = info.name;
					}
					if(info.reservation){
						var content = "";
						if(sample && sample.status == 'in_use'){
							content = 'Reserved until ' + moment(parseInt(info.reservation.dropOffTime) * 1000).calendar();
						}else{
							content = 'Reserved from ' + moment(parseInt(info.reservation.pickupTime) * 1000).calendar();
						}
						result.content += '<div class="marginTop-10" style="white-space: nowrap;">' + content + '</div>';
					}
				}
				if(sample && sample.status == 'in_use'){
					if(sample.speed){
						result.content += '<div class="">Speed: ' + sample.speed.toFixed(1) + 'km/h</div>';
					}
					if(sample.matched_heading){
						var heading = +sample.matched_heading;
						heading = (heading < 0) ? heading + 360 : heading;
						var index = Math.floor(((heading/360 + 1/32) % 1) * 16);
						var dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
						var dir = dirs[index];
						result.content += '<div class="">Heading: ' + dir + '</div>';
					}
				}
				return result;
			}
			return null;
		}

		// setup alert popover
		// - 1. create alerts Observable
		let alertsProvider = Observable.interval(2000).map(() => {
			// get all the alerts here
			let result = [];
			this.animatedDeviceManager.getDevices().forEach(device => {
				if(device.latestSample.info.alerts.items){
					result.push(...device.latestSample.info.alerts.items);
				}
			});
			return result;
		});

		// setup alert popover
		// - 2. setup popover
		let alertPopoverHandle = this.mapHelper.addModelBasedPopover(alertsProvider, {
			getKey: (alert => alert._id),
			getFeature: ((alert, map) => this.deviceFeatures[alert.mo_id]),
			createOverlay: ((model, map) => {
				let elem = document.createElement('div');
				elem.classList.add('mapAlertPopover', 'opening');
				if(model.severity === 'Critical' || model.severity === 'High'){
					elem.classList.add('red');
				}else if(model.severity === 'Medium'){
					elem.classList.add('orange');
				}else if(model.severity === 'Low'){
					elem.classList.add('blue');
				}else{
					elem.classList.add('green');
				}
				elem.innerHTML = `
					<a class="close" href="javascript: void(0);">&times;</a>
					<div class="content">${_.escape(model.description)}</div>					
				`;
				mapTargetElement.appendChild(elem);

				let r = new ol.Overlay({
					element: elem,
					offset: [-10,-3],
					positioning: 'bottom-right',
					stopEvent: true
				});
				return r;
			}),
			showPopover: function showInfoPopover(elem, feature, pinned, model, closeFunc){
				// schedule opening animation
				_.delay(() => elem.classList.remove('opening'), 100);
				var c = $(elem).find('.close')
				c && c.on('click', function(){
					setTimeout(() => closeFunc(), 5); // schedule element removel
				});				
			},
			destroyPopover: function destroyInfoPopover(elem, feature, pin, model, closeFunc){
				elem.classList.add('closing');
				setTimeout(() => closeFunc(), 500); // schedule element removel
				return true;
			}
		});

		// setup animation
		// - workaround styles
		this.mapHelper.preloadStyles(this.map, CAR_STYLES);
		// - define feature synchronizer
		var syncCarFeatures = (devices, frameTime, surpussEvent = true) => {
			if(this.appConfig.DEBUG){
				console.log('DEBUG-MAP: syncing car features. Number of devices=' + devices.length + ', frameTime=' + new Date(frameTime));
			}
			devices.forEach((device) => {
				var cur = device.getAt(frameTime); // get state of the device at frameTime
				var curPoint = (cur.lng && cur.lat) ? new ol.geom.Point(ol.proj.fromLonLat([cur.lng, cur.lat], undefined)) : null;
				var curStatus = cur.status || 'normal';
				//console.log('syncCarFeatures - Putting icon at ', [cur.lng, cur.lat])

				var feature: any = this.deviceFeatures[device.deviceID];
				if(curPoint && !feature){
					// create a feature for me
					feature = new ol.Feature({
						geometry: curPoint,
						carStatus: curStatus,
						//style: getCarStyle(curStatus),  //WORKAROUND: not sure why layer style not work
						device: device,
					});
					if(curStatus)
						feature.setStyle(getCarStyle(curStatus));
						this.carsLayer.getSource().addFeature(feature);
					this.deviceFeatures[device.deviceID] = feature;
				}else if(curPoint && feature){
					// update
					if(curStatus && curStatus !== feature.get('carStatus')){
						feature.set('carStatus', curStatus, surpussEvent);
						feature.setStyle(getCarStyle(curStatus)); //WORKAROUND: not sure why layer style not work
					}
					if(curPoint.getCoordinates() != feature.getGeometry().getCoordinates()){
						feature.setGeometry(curPoint);
					}
				}else if(!curPoint && feature){
					// remove feature
					(<any>this.carsLayer.getSource()).removeFeature(feature);
					delete this.deviceFeatures[device.deviceID];
				}
			});
		}
		// // - register rendering handlers
		this.mapHelper.preComposeHandlers.push((event, frameTime) => {
			try{
				syncCarFeatures(this.animatedDeviceManager.getDevices(), frameTime);
			} catch(e) {
				console.error('DEBUG-MAP: got exception while syncing car features', e);
			}
		});
		this.mapHelper.postComposeHandlers.push((event, frameTime) => {
			return INV_MAX_FPS; // give delay for next frame if not other events captured
		});
	}

	ngOnInit() {
		this.initMap();
		this.region && this.mapHelper.moveMap(this.region);

		// register popover link event handler to document
		document['_handleClick' + this.popoverElemetId] = (vehicleId) => {
			console.log('Car ID link is clicked on the popover');
			this.router.navigate(['/carStatus', vehicleId]);
		};
	}

	ngOnChanges(changes: {[propertyName: string]: SimpleChange}){
		if('region' in changes){
		 	let region = changes['region'].currentValue;
		 	console.log("MoveMap", region);
		 	this.mapHelper && this.mapHelper.moveMap(region);
		}
	}

  selectDevice(deviceId: string){
		// see if the device is loaded
		var probe = new Promise((resolve, reject) => {
			var dev = this.animatedDeviceManager.getDevice(deviceId);
			if(dev)
				return resolve(dev.latestSample);
			return this.animatedDeviceManagerService.getProbe(deviceId);
		});
		probe.then((probeData: any) => {
			var center = [probeData.lng, probeData.lat];
			this.mapHelper.moveMap({ center: center });
		});
		// schecule popover
		var nRetry = 10;
		var interval = 500;
		var showPopoverFunc = () => {
			var device = this.animatedDeviceManager.getDevice(deviceId);
			if(device && this.deviceFeatures[device.deviceID]){
				this.mapHelper.showPinnedPopover(this.deviceFeatures[device.deviceID]);
			}else if(nRetry-- > 0){
				setTimeout(showPopoverFunc, interval);
			}
		}
		setTimeout(showPopoverFunc, interval);
  }
}

/***************************************************************
 * Style Utility Functions
 */

/**
 * Get car style for the given status
 * @return ol.style.Style
 */
var getCarStyle = function(status){
	return CAR_STYLE_MAP[status] || CAR_STYLE_MAP['unknown'];
};
var CAR_STYLES = [];
var CAR_STYLE_MAP = {};
(function(){
	var data = [['normal', 'img/car-blue.png'],
							['available', 'img/car-green.png'],
							['troubled', 'img/car-orange.png'],
							['critical', 'img/car-red.png'],
							['unknown', 'img/car-gray.png']];
	data.forEach(function(item){
		var status = item[0], icon = item[1];
		var style = new ol.style.Style({image: new ol.style.Icon({
			anchor: [16, 16],
			anchorXUnits: 'pixels',
			anchorYUnits: 'pixels',
			opacity: 1,
			scale: 0.8,
			src: icon,
			//imgSize: [32, 32],
		})});
		CAR_STYLES.push(style);
		CAR_STYLE_MAP[status] = style;
	});
})();

/**
 * Get driver events' style on the map
 */
var getDrivingEventStyle = (function(){
	var _cache: ol.style.Style;

	return function(event){
		if(_cache)
			return _cache;

		_cache = new ol.style.Style({
			image: new (<any>ol.style.RegularShape)({ // unwrap class as the class defition is poor
				points: 3,
				radius: 9,
				rotation: 0,
				snapToPixel: false,
				fill: new ol.style.Fill({color: 'yellow'}),
				stroke: new ol.style.Stroke({
					color: 'black', width: 1
				}),
			}),
		});
		return _cache
	};
})();
