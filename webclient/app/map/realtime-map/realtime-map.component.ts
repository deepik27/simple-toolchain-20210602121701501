import { Component, EventEmitter, Input, Output,
					OnInit, OnChanges, SimpleChange, Inject } from '@angular/core';
import { Http, Request, Response, URLSearchParams } from '@angular/http';
import { Observable, Subject } from 'rxjs/Rx.DOM';

import * as ol from 'openlayers';

import { MapHelper } from './map-helper';
import { AnimatedDevice, AnimatedDeviceManager } from '../shared/animated-device';
import { AnimatedDeviceManagerService } from '../shared/animated-device-manager.service';

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

var CAR_PROBE_URL = '/user/carProbe';

	/**
	 * The default zoom value when the map `region` is set by `center`
	 */
	var DEFAULT_ZOOM = 15;

	// internal settings
	var INV_MAX_FPS = 1000 / 10;
	var ANIMATION_DELAY = 2000;
	var DEFAULT_MOVE_REFRESH_DELAY = 500;
	var CAR_STATUS_REFRESH_PERIOD = 0 // was 15000; now, setting 0 not to update via polling (but by WebSock)
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
	eventsLayer: ol.layer.Vector;
	carsLayer: ol.layer.Vector;
	mapHelper: MapHelper;

	mapElementId = 'carmonitor';
	popoverElemetId = 'carmonitorpop';

	// RxJS
	mapExtentSubject = new Subject<any>();

	//
	// Devices management
	//
	animatedDeviceManager: AnimatedDeviceManager;

	//
	// Connection to server and reflecting the response to the Map
	//
	activeWsClient = null;
	activeWsSubscribe = null; // WebSocket client
	carStatusIntervalTimer: any;

  constructor(
		private $http: Http,
		@Inject('webApiHost') private webApiHost: string,
		animatedDeviceManagerService: AnimatedDeviceManagerService
	) {
		this.animatedDeviceManager = animatedDeviceManagerService.getManager();
	}

	switchDebug(){
		this.DEBUG = !this.DEBUG;
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
		// create a map
		var opt = new ol.Object();

		this.map =  new ol.Map({
			target: document.getElementById(this.mapElementId),
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
				this.carsLayer
			],
			view: new ol.View({
				center: ol.proj.fromLonLat((this.region && this.region.center) || [0, 0], undefined),
				zoom: ((this.region && this.region.zoom) || DEFAULT_ZOOM)
			}),
		});
		this.mapHelper = new MapHelper(this.map);

		// setup view change event handler
		this.mapHelper.postChangeViewHandlers.push(extent => {
			this.stopTracking(true); // true to move to next extent smoothly
			this.startTracking(extent);
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
				result.content = '<span style="white-space: nowrap;">ID: ' + _.escape(device.deviceID) + "</style>";
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
					result.content += '<div style="white-space: nowrap;">Engine Temp: ' + _.escape(sample.props && sample.props.engineTemp) + "</div>";
					result.content += '<div style="white-space: nowrap;">Timestamp: ' + _.escape(sample.timestamp) + "</div>";
				}
				if(info){
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

		// setup animation
		// - workaround styles
		this.mapHelper.preloadStyles(this.map, CAR_STYLES);
		// - define feature synchronizer
		var syncCarFeatures = (devices, frameTime, surpussEvent = true) => {
			devices.forEach((device) => {
				var cur = device.getAt(frameTime); // get state of the device at frameTime
				var curPoint = (cur.lng && cur.lat) ? new ol.geom.Point(ol.proj.fromLonLat([cur.lng, cur.lat], undefined)) : null;
				var curStatus = cur.status || 'normal';
				//console.log('syncCarFeatures - Putting icon at ', [cur.lng, cur.lat])

				var feature = device.feature;
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
					device.feature = feature;
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
					device.feature = null;
				}
			});
		}
		// // - register rendering handlers
		this.mapHelper.preComposeHandlers.push((event, frameTime) => {
			syncCarFeatures(this.animatedDeviceManager.getDevices(), frameTime);
		});
		this.mapHelper.postComposeHandlers.push((event, frameTime) => {
			return INV_MAX_FPS; // give delay for next frame if not other events captured
		});
	}

	/**
	 * Start trackgin a region
	 */
	startTracking(extent){
		var xt = this.mapHelper.expandExtent(extent, 0.5); // get extended extent to track for map
		var qs = ['min_lat='+xt[1], 'min_lng='+xt[0],
							'max_lat='+xt[3], 'max_lng='+xt[2]].join('&');
		// handle cars
		this.refreshCarStatus(qs).then((data) => {
			// adjust animation time
			if(data.serverTime){
				this.mapHelper.setTimeFromServerRightNow(data.serverTime);
			}

			// start websock server for real-time tracking
			this.stopWsClient();
			if (data.wssPath){
				var startWssClient = () => {
					var wsProtocol = (location.protocol == "https:") ? "wss" : "ws";
					var wssUrl = wsProtocol + '://' + this.webApiHost + data.wssPath;
					// websock client to keep the device locations latest
					var ws = this.activeWsClient = Observable.webSocket(wssUrl);
					this.activeWsSubscribe = ws.subscribe((data: any) => {
						this.animatedDeviceManager.addDeviceSamples(data.devices);
					}, (e) => {
						if (e.type === 'close'){
							this.activeWsSubscribe = null;
							ws.socket.close(); //closeObserver(); observer.dispose();
							// handle close event
							if(ws === this.activeWsClient){ // reconnect only when this ws is active ws
								console.log('got wss socket close event. reopening...')
								this.activeWsClient = null;
								startWssClient(); // restart!
								return;
							}
						}
						// error
						console.error('Error event from WebSock: ', e);
					});
				};
				startWssClient(); // start wss
			}

			// start animation
			this.mapHelper.startAnimation();

			// schedule status timer
			var carStatusTimerFunc = () => {
				this.refreshCarStatus(qs);
				this.carStatusIntervalTimer = setTimeout(carStatusTimerFunc, CAR_STATUS_REFRESH_PERIOD);
			}
			if(CAR_STATUS_REFRESH_PERIOD > 0)
					this.carStatusIntervalTimer = setTimeout(carStatusTimerFunc, CAR_STATUS_REFRESH_PERIOD);
		}, (err) => {
			console.warn('it\'s fail to access the server.');
		})

		// handle driver events
		this.refreshDriverEvents(qs);
	};
	// Add/update cars with DB info
	refreshCarStatus(qs) {
		return this.$http.get(CAR_PROBE_URL + '?' + qs).toPromise().then((resp) => {
			let data = resp.json();
			if(data.devices){
				this.animatedDeviceManager.addDeviceSamples(data.devices);
			}
			return data; // return resp so that subsequent can use the resp
		});
	};
	// Add driver events on the map
	refreshDriverEvents(qs){
		return this.$http.get(CAR_PROBE_URL + '?' + qs).toPromise().then((resp) => {
			let data = resp.json();
			var events = data.devices;
			if (events){
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
			}
		});
	};

	/**
	 * Stop server connection
	 */
	stopTracking(intermediate){
		// stop timer
		if(this.carStatusIntervalTimer){
			clearTimeout(this.carStatusIntervalTimer);
			this.carStatusIntervalTimer = 0;
		}
		if(!intermediate){
			// stop animation
			this.mapHelper.stopAnimation();
			// stop WebSock client
			this.stopWsClient();
		}
	};
	stopWsClient(){
		if (this.activeWsSubscribe){
			this.activeWsSubscribe.unsubscribe();
			this.activeWsSubscribe = null;
		}
		if (this.activeWsClient){
			if (this.activeWsClient.socket && this.activeWsClient.socket){
				this.activeWsClient.socket.close();
			}
			this.activeWsClient = null;
		}
	}





    ngOnInit() {
        this.initMap();
	}

	ngOnChanges(changes: {[propertyName: string]: SimpleChange}){
		if('region' in changes){
		 	let region = changes['region'].currentValue;
		 	console.log("MoveMap", region);
		 	this.mapHelper && this.mapHelper.moveMap(region);
		}
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
