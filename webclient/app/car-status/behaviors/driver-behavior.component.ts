/**
 * Copyright 2016,2020 IBM Corp. All Rights Reserved.
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
import * as _ from 'underscore';

import { ActivatedRoute, Params } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { AppHttpClient } from '../../shared/http-client';
import { MapHelper } from '../../shared/map-helper';
import { MapEventHelper } from '../../shared/map-event-helper';
import { EventService } from '../../shared/iota-event.service';
import { MapGeofenceHelper } from '../../shared/map-geofence-helper';
import { GeofenceService } from '../../shared/iota-geofence.service';
import { MapPOIHelper } from '../../shared/map-poi-helper';
import { POIService } from '../../shared/iota-poi.service';
import { DriverBehaviorService } from '../../shared/iota-driver-behavior.service';
import { LocationService } from '../../shared/location.service';
import { AlertService } from '../../shared/alert.service';

import { Map, View, Feature } from 'ol';
import { Tile } from 'ol/layer';
import { Style, Icon, Stroke } from 'ol/style';
import { Point, LineString } from 'ol/geom';
import { OSM } from 'ol/source';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import * as olProj from 'ol/proj';

declare var $; // jQuery from <script> tag in the index.html
// as bootstrap type definitoin doesn't extend jQuery $'s type definition

/**
 * The default zoom value when the map `region` is set by `center`
 */
var DEFAULT_ZOOM = 15;
var MAX_TRIPS = 15;
var PROJ_MAP = 'EPSG:3857';
var PROJ_LONLAT = 'EPSG:4326'; // WSG84

@Component({
	selector: 'driver-behavior',
	templateUrl: 'driver-behavior.component.html',
	styleUrls: ['driver-behavior.component.css'],
})
export class DriverBehaviorComponent implements OnInit {
	private mo_id: string;
	map: Map;
	mapHelper: MapHelper;
	routeLayer: VectorLayer;
	mapEventsLayer: VectorLayer;
	mapGeofenceLayer: VectorLayer;
	mapPOILayer: VectorLayer;
	behaviorLayer: VectorLayer;
	mapItemHelpers = {};
	mapElementId: string = 'carmonitor';// + (NEXT_MAP_ELEMENT_ID ++);
	popoverElementId: string = 'carmonitorpop';// + (NEXT_MAP_ELEMENT_ID ++);
	START_PIN_STYLE: Style;
	END_PIN_STYLE: Style;
	TRIP_ROUTE_STYLE: Style;
	BEHAVIOR_DETAIL_STYLE: Style;
	behaviors = [];
	tripFeatures = [];
	alerts = [];
	selectedBehavior: any;
	trip: any;
	selectedTrip: any;
	tripList = [];
	maxTrips: number = MAX_TRIPS;
	loading: boolean = false;
	tripRouteHttpError: string;
	behaviorHttpError: string;
	popoverElemetId = 'carmonitorpop';
	internationalUnit: boolean = false;

	constructor(private http: AppHttpClient,
		private route: ActivatedRoute,
		private locationService: LocationService,
		private eventService: EventService,
		private geofenceService: GeofenceService,
		private poiService: POIService,
		private driverBehaviorService: DriverBehaviorService,
		private alertService: AlertService) {
		this.START_PIN_STYLE = this.getIconStyle('/webclient/img/MarkerGreen.png', [79, 158], 0.1);
		this.END_PIN_STYLE = this.getIconStyle('/webclient/img/MarkerRed.png', [79, 158], 0.1);
		this.TRIP_ROUTE_STYLE = this.getLineStyle('blue', 3);
		this.BEHAVIOR_DETAIL_STYLE = this.getLineStyle('red', 4 /*, [4]*/);
	}

	getIconStyle(src, anchor, scale) {
		let style = new Style({
			image: new Icon({
				anchor: anchor || [0, 0],
				anchorXUnits: 'pixels',
				anchorYUnits: 'pixels',
				opacity: 1,
				scale: scale || 0.8,
				src: src,
			})
		});
		return style;
	}

	getLineStyle(color, width, dash = undefined) {
		let style = new Style({
			stroke: new Stroke({
				color: color,
				lineDash: dash,
				width: width
			}),
		});
		return style;
	}

	initMap() {
		let self = this;
		// create layers
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
		this.behaviorLayer = new VectorLayer({
			source: new VectorSource(),
			renderOrder: undefined
		});

		let area: any = this.locationService.getCurrentAreaRawSync();
		// create a map
		this.map = new Map({
			target: document.getElementById(this.mapElementId),
			layers: [
				new Tile({
					source: new OSM(),
					preload: 4,
				}),
				this.mapGeofenceLayer,
				this.mapEventsLayer,
				this.mapPOILayer,
				this.routeLayer,
				this.behaviorLayer,
			],
			view: new View({
				center: olProj.fromLonLat((area && area.center) || [0, 0], undefined),
				zoom: ((area && area.zoom) || DEFAULT_ZOOM)
			}),
		});
		this.mapItemHelpers["event"] = new MapEventHelper(this.map, this.mapEventsLayer, this.eventService);
		this.mapItemHelpers["geofence"] = new MapGeofenceHelper(this.map, this.mapGeofenceLayer, this.geofenceService, { itemLabel: "Boundary" });
		this.mapItemHelpers["poi"] = new MapPOIHelper(this.map, this.mapPOILayer, this.poiService);

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

		this.initPopup();
	}

	initPopup() {
		let helpers = this.mapItemHelpers;
		this.mapHelper.addPopOver({
			elm: document.getElementById(this.popoverElemetId),
			pin: false,
			updateInterval: 1000,
		},
			function showPopOver(elem, feature, pinned, closeCallback) {
				if (!feature) return;
				let content = <any>getPopOverContent(feature);
				if (content) {
					let title = '<div>' + (content.title ? _.escape(content.title) : '') + '</div>';
					let item = feature.get("item");
					if (pinned) {
						title += '<div><span class="btn btn-default close">&times;</span></div>';
					}
					let pop = $(elem).popover({
						html: true,
						title: title,
						content: content.content
					});
					if (pinned) {
						pop.on('shown.bs.popover', () => {
							let c = $(elem).parent().find('.popover .close');
							c && c.on('click', () => {
								closeCallback && closeCallback();
							});
							let r = $(elem).parent().find('.popover .remove');
							r && r.on('click', (e) => {
								let helper = helpers[item.getItemType()];
								if (helper) {
									helper.removeItemsFromView([item]);
								}
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
				let content = getPopOverContent(feature);
				if (content) {
					let popover = $(elem).data('bs.popover');
					if (popover.options.content !== content.content) {
						popover.options.content = content.content;
						$(elem).popover('show');
					}
				}
			});

		// popover - generate popover content from ol.Feature
		let getPopOverContent = (feature) => {
			let hoverContent = null;
			let content = <string>feature.get('popoverContent');
			if (content) {
				hoverContent = { content: '<span style="white-space: nowrap;">' + _.escape(content) + '</span>' };
			} else {
				let item = feature.get("item");
				if (item) {
					let helper = this.mapItemHelpers[item.getItemType()];
					if (helper) {
						let props = helper.getHoverProps(item);
						if (props && props.length > 0) {
							let title = helper.getItemLabel() + " (" + item.getId() + ")";
							let details: string = "<table><tbody>";
							props.forEach((prop) => {
								details += "<tr><th style='white-space: nowrap;text-align:right;'><span style='margin-right:10px;'>" + _.escape(prop.key.toUpperCase()) +
									":</span></th><td>" + _.escape(prop.value) + "</td></tr>";
							});
							details += "</tbody><table>";
							hoverContent = { title: title, content: details, removeable: true };
						}
					}
				}
			}
			return hoverContent;
		};
	}

	ngOnInit() {
		this.initMap();

		// get mo_id
		var mo_id: any;
		this.route.params.forEach((params: Params) => {
			mo_id = mo_id || params['mo_id'];
		});
		this.mo_id = <string>mo_id;
		this.loadDriverBehavior();
	}

	OnDestroy() {
	}

	onTripChanged(event) {
		this.selectedTrip = this.tripList[event.target.selectedIndex];
		this._loadDriverBehavior(this.mo_id, this.selectedTrip.trip_id);
	}

	loadDriverBehavior() {
		this.tripRouteHttpError = undefined;
		this.behaviorHttpError = undefined;
		if (this.mo_id) {
			this.selectedTrip = null;
			this.tripList = [];
			this.driverBehaviorService.getTrips(this.mo_id, this.maxTrips).subscribe(tripList => {
				this.tripList = tripList;
				if (this.tripList && this.tripList.length > 0)
					this.selectedTrip = this.tripList[0];
				this._loadDriverBehavior(this.mo_id, this.selectedTrip.trip_id);
			});
		}
	}

	_convertFeature(tripFeature) {
		const _formatName = (v) => {
			if (v === "day_of_week") {
				return "Day of the week";
			}
			let name = v.split('_').join(' ');
			if (name.length > 0) {
				name = name.charAt(0).toUpperCase() + name.substr(1).toLowerCase();
			}
			return name;
		}
		// second to minutes/hours
		const _formatTime = (v) => {
			let nVal = parseFloat(v);
			if (nVal > 3600) {
				return { value: (Math.ceil(nVal / 3600 * 100) / 100), unit: "hours" };
			} else if (nVal > 60) {
				return { value: (Math.ceil(nVal / 60 * 100) / 100), unit: "minutes" };
			}
			return { value: v, unit: "seconds" };
		};
		// m to mile
		const _formatDistance = (v) => {
			let nVal = parseFloat(v) / 1000;
			if (!this.internationalUnit) nVal *= 0.6213711922;
			return { value: (Math.ceil(nVal * 100) / 100), unit: this.internationalUnit ? "km" : "miles" };
		};
		// km/h to mph
		const _formatSpeed = (v) => {
			let nVal = parseFloat(v);
			if (!this.internationalUnit) nVal *= 0.6213711922;
			return { value: (Math.ceil(nVal * 10) / 10), unit: this.internationalUnit ? "km/h" : "mph" };
		};
		const _formatDayOfWeek = (v) => {
			switch (v) {
				case "1": return { value: "Sunday", unit: "" };
				case "2": return { value: "Monday", unit: "" };
				case "3": return { value: "Tuesday", unit: "" };
				case "4": return { value: "Wednesday", unit: "" };
				case "5": return { value: "Thursday", unit: "" };
				case "6": return { value: "Friday", unit: "" };
				case "7": return { value: "Saturday", unit: "" };
			}
			return v;
		}

		let value = { value: tripFeature.feature_value, unit: "" };
		let sortorder = 1000;
		switch (tripFeature.feature_name) {
			case "day_of_week":
				sortorder = 1;
				value = _formatDayOfWeek(tripFeature.feature_value);
				break;
			case "distance":
				sortorder = 2;
				value = _formatDistance(tripFeature.feature_value);
				break;
			case "average_speed":
				sortorder = 3;
				value = _formatSpeed(tripFeature.feature_value);
				break;
			case "max_speed":
				sortorder = 4;
				value = _formatSpeed(tripFeature.feature_value);
				break;
			case "time_span":
				sortorder = 5;
				value = _formatTime(tripFeature.feature_value);
				break;
			case "idle_time":
				sortorder = 6;
				value = _formatTime(tripFeature.feature_value);
				break;
			case "rush_hour_driving":
				sortorder = 7;
				value = _formatTime(tripFeature.feature_value);
				break;
			case "night_driving_time":
				sortorder = 8;
				value = _formatTime(tripFeature.feature_value);
				break;
		}
		return { name: _formatName(tripFeature.feature_name), value: value.value, unit: value.unit, sortorder: sortorder };
	}

	_loadTriopDetails(mo_id, trip_id) {
		return new Promise((resolve, reject) => {
			let allPromises = [];

			// Get entire trip route
			allPromises.push(new Promise((resolve2, reject2) => {
				const MAX_LENGTH = 1000;
				this.driverBehaviorService.getCarProbeHistoryCount(mo_id, trip_id).subscribe(data => {
					let promises = [];
					let offset = 0;
					while (offset < data.count) {
						promises.push(new Promise((resolve3, reject3) => {
							this.driverBehaviorService.getCarProbeHistory(mo_id, trip_id, offset, MAX_LENGTH).subscribe(data => {
								resolve3(data);
							}, error => {
								reject3(error);
							});
						}));
						offset += MAX_LENGTH;
					}

					Promise.all(promises).then((trips) => {
						let tripRoute = [];
						trips.forEach((trip) => {
							tripRoute = tripRoute.concat(trip);
						});
						resolve2(tripRoute);
					});
				}, error => {
					reject2(error);
				});
			}));

			// Get Driving Behavior
			allPromises.push(new Promise((resolve2, reject2) => {
				this.driverBehaviorService.getDrivingBehavior(mo_id, trip_id).subscribe(data => {
					resolve2(data);
				}, error => {
					reject2(error);
				});
			}));

			// Wait for trip and behaviors are retrieved
			Promise.all(allPromises).then((data) => {
				resolve({ trip: data[0], behavior: data[1] });
			}).catch(error => {
				reject(error);
			});
		});
	}

	_loadDriverBehavior(mo_id, trip_id) {
		this.loading = true;
		this.behaviors = [];
		this.tripFeatures = [];

		// Load entire trip route and behaviors on the route
		this._loadTriopDetails(mo_id, trip_id).then(data => {
			let trip = (<any>data).trip;
			let behavior = (<any>data).behavior;

			// Draw entire trip route path on the map
			try {
				this.updateTripRoute(trip);
			} finally {
				this.loading = false;
			}

			// Show trip features on the table
			if (behavior.trip_features) {
				let tripFeatures = behavior.trip_features;
				this.tripFeatures = _.sortBy(_.filter(tripFeatures, (feature) => {
					return !_.contains(["month_of_year", "day_of_month"], (<any>feature).feature_name);
				}).map((p) => {
					return this._convertFeature(p);
				}), (feature) => {
					return feature.sortorder;
				});
			}

			// Show behaviors on the table
			if (behavior.ctx_sub_trips) {
				let subTrips = behavior.ctx_sub_trips;
				let behaviorDetails = _.flatten(_.pluck(subTrips, 'driving_behavior_details'));
				behaviorDetails = behaviorDetails.sort((a, b) => { return a.start_time - b.start_time; });
				let detailIndex = 0;
				let detailList = [];
				this.trip.forEach(probe => {
					for (let i = detailIndex; i < behaviorDetails.length; i++) {
						if (probe.timestamp >= behaviorDetails[i].start_time) {
							behaviorDetails[i].route = [];
							detailList.push(behaviorDetails[i]);
							detailIndex++;
						} else {
							break;
						}
					}
					detailList.forEach(detail => {
						detail.route.push({
							longitude: probe.matched_longitude || probe.longitude,
							latitude: probe.matched_latitude || probe.latitude
						});
					});
					detailList = detailList.filter(detail => { return probe.timestamp < detail.end_time; });
				});
				let byName = _.groupBy(behaviorDetails, (d) => { return d.behavior_name; });

				this.behaviors = _.sortBy(_.pairs(byName).map((p) => {
					return { name: p[0], details: p[1] };
				}), (behavior) => {
					return behavior.name;
				});
				this.selectedBehavior = this.behaviors[0];
				this.setSelectedBehavior(this.selectedBehavior);
			}

			if (!this.trip || this.trip.length == 0) {
				return;
			}
			
			// Set alerts on the table
			let from = this.trip[0].timestamp;
			let to = this.trip[this.trip.length - 1].timestamp;
			this.alertService.getAlert({ from: from, to: to, mo_id: mo_id, includeClosed: true, limit: 200 }).subscribe(data => {
				let alerts = data.alerts;
				alerts.sort((a, b) => { return a.ts - b.ts; });
				let alertIndex = 0;
				let alertList = [];
				this.trip.forEach(probe => {
					for (let i = alertIndex; i < alerts.length; i++) {
						if (probe.timestamp >= alerts[i].ts) {
							alerts[i].route = [];
							alertList.push(alerts[i]);
							alertIndex++;
						} else {
							break;
						}
					}
					alertList.forEach(alert => {
						alert.route.push({
							longitude: probe.matched_longitude || probe.longitude,
							latitude: probe.matched_latitude || probe.latitude
						});
					});
					alertList = alertList.filter(alert => { return alert.closed_ts < 0 || probe.timestamp < alert.closed_ts; });
				});
				let byType = _.groupBy(alerts, "description");
				this.alerts = _.sortBy(_.pairs(byType).map(p => {
					let type;
					if (p[1][0].type === "geofence") {
						type = "Geofence";
					} else if (p[1][0].source.type === "event") {
						type = "Event";
					} else {
						type = "";
					}
					return { name: p[0], type: type, details: p[1] };
				}), "type");
			});
		}).catch(error => {
			this.loading = false;
			this.tripRouteHttpError = error.message || error._body || error;
		});
	}

	expandExtent(extent, ratio): [number, number, number, number] {
		// draw real-time location of cars
		let min_lng0 = extent[0];
		let min_lat0 = extent[1];
		let max_lng0 = extent[2];
		let max_lat0 = extent[3];
		let min_lng = min_lng0 - (max_lng0 - min_lng0) * ratio;
		let min_lat = min_lat0 - (max_lat0 - min_lat0) * ratio;
		let max_lng = max_lng0 + (max_lng0 - min_lng0) * ratio;
		let max_lat = max_lat0 + (max_lat0 - min_lat0) * ratio;
		return [min_lng, min_lat, max_lng, max_lat];
	}

	setSelectedBehavior(behavior) {
		this.selectedBehavior = behavior;
		this.updateBehaviorDetails(behavior);
	}

	// update behaviors
	createRouteLine(start, end, style): Feature {
		let geom = new LineString([[start.matched_longitude || start.longitude, start.matched_latitude || start.latitude],
		[end.matched_longitude || end.longitude, end.matched_latitude || end.latitude]]);
		geom.transform(PROJ_LONLAT, PROJ_MAP);
		let feature = new Feature({
			geometry: geom,
		});
		feature.setStyle(style);
		return feature;
	}

	// Show trip route
	updateTripRoute(trip) {
		// map not initialized yet
		if (!this.mapHelper) return;

		// clear first
		this.routeLayer.getSource().clear();

		if (!trip || trip.length === 0) {
			this.trip = null;
			return;
		}
		this.trip = trip;

		// add start/end icon
		let routeLayer = this.routeLayer;
		function addFeature(geo, style) {
			if (isNaN(parseFloat(geo[0])) || isNaN(parseFloat(geo[1]))) return; // skip
			let feature = new Feature({
				geometry: new Point(olProj.fromLonLat([geo[0], geo[1]], undefined)),
			});
			feature.setStyle(style);
			routeLayer.getSource().addFeature(feature);
		}

		// add start and end positions
		let start = trip[0];
		let end = trip[trip.length - 1];
		let tripSummary = {
			start_longitude: start.matched_longitude || start.longitude,
			start_latitude: start.matched_latitude || start.latitude,
			end_longitude: end.matched_longitude || end.longitude,
			end_latitude: end.matched_latitude || end.latitude
		}
		addFeature([tripSummary.start_longitude, tripSummary.start_latitude], this.START_PIN_STYLE);
		addFeature([tripSummary.end_longitude, tripSummary.end_latitude], this.END_PIN_STYLE);

		// draw route
		let features = [];
		for (let i = 0; i < trip.length - 1; i++) {
			features.push(this.createRouteLine(trip[i], trip[i + 1], this.TRIP_ROUTE_STYLE));
		}
		this.routeLayer.getSource().addFeatures(features);

		// update map extent
		let tripRouteExtent = this.routeLayer.getSource().getExtent();
		if (tripRouteExtent) {
			let extent = olProj.transformExtent(tripRouteExtent, PROJ_MAP, PROJ_LONLAT);
			extent = this.expandExtent(extent, 0); // expand if necessary
			this.mapHelper.moveMap({ extent: extent });
		}
	}

	// Show driving behavior markers
	updateBehaviorDetails(details) {
		// map not initialized yet
		if (!this.mapHelper) return;

		// clear first
		this.behaviorLayer.getSource().clear();
		if (!details) return;

		let features: any = _.flatten([].concat(details.details).map((detail) => {
			let route = [];
			for (let i = 0; i < detail.route.length - 1; i++) {
				route.push(this.createRouteLine(detail.route[i], detail.route[i + 1], this.BEHAVIOR_DETAIL_STYLE));
			}
			return route;
		}));
		this.behaviorLayer.getSource().addFeatures(features);
	}

	_isFiniteNumber(value): boolean {
		return isFinite(value - 0) && value !== null && value !== "" && value !== false;
	}
}
