/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AEGGZJ&popup=y&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
import * as ol from 'openlayers';

import { ActivatedRoute, Params } from '@angular/router';
import { Component, Input, Output, OnInit, OnChanges, OnDestroy, SimpleChange, ViewChild } from '@angular/core';
import { HttpClient } from '../../shared/http-client';
import { Response, Headers, RequestOptions } from '@angular/http';
import { Observable }     from 'rxjs/Observable';
import { MapHelper } from '../../shared/map-helper';
import { MapEventHelper } from '../../shared/map-event-helper';
import { EventService } from '../../shared/iota-event.service';
import { MapGeofenceHelper } from '../../shared/map-geofence-helper';
import { GeofenceService } from '../../shared/iota-geofence.service';
import { DriverBehaviorService } from '../../shared/iota-driver-behavior.service';
import { LocationService, MapArea } from '../../shared/location.service';
import { AlertService } from '../../shared/alert.service';

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
  moduleId: module.id,
  selector: 'driver-behavior',
  templateUrl: 'driver-behavior.component.html',
  styleUrls: ['driver-behavior.component.css'],
})
export class DriverBehaviorComponent implements OnInit {
  private mo_id: string;
  map: ol.Map;
  mapHelper: MapHelper;
  routeLayer: ol.layer.Vector;
	mapEventsLayer: ol.layer.Vector;
	mapGeofenceLayer: ol.layer.Vector;
	behaviorLayer: ol.layer.Vector;
	mapItemHelpers = {};
	mapElementId: string = 'carmonitor';// + (NEXT_MAP_ELEMENT_ID ++);
	popoverElementId: string = 'carmonitorpop';// + (NEXT_MAP_ELEMENT_ID ++);
	START_PIN_STYLE: ol.style.Style;
	END_PIN_STYLE: ol.style.Style;
	TRIP_ROUTE_STYLE: ol.style.Style;
	BEHAVIOR_DETAIL_STYLE: ol.style.Style;
	behaviors = [];
	tripFeatures = [];
	alerts = [];
	selectedBehavior: any;
	trip: any;
	selectedTrip: any;
	tripList = [];
	maxTrips:number = MAX_TRIPS;
	loading: boolean = false;
	tripRouteHttpError: string;
	behaviorHttpError: string;
	popoverElemetId = 'carmonitorpop';

  constructor(private http: HttpClient, 
						private route: ActivatedRoute, 
						private locationService: LocationService, 
						private eventService: EventService,
						private geofenceService: GeofenceService,
						private driverBehaviorService: DriverBehaviorService,
						private alertService: AlertService) {
		this.START_PIN_STYLE = this.getIconStyle('/images/MarkerGreen.png', [79,158], 0.1);
		this.END_PIN_STYLE = this.getIconStyle('/images/MarkerRed.png', [79,158], 0.1);
 		this.TRIP_ROUTE_STYLE = this.getLineStyle('blue', 3);
		this.BEHAVIOR_DETAIL_STYLE = this.getLineStyle('red', 4 /*, [4]*/);
 }

	getIconStyle(src, anchor, scale){
		let style = new ol.style.Style({image: new ol.style.Icon({
			anchor: anchor || [0,0],
			anchorXUnits: 'pixels',
			anchorYUnits: 'pixels',
			opacity: 1,
			scale: scale || 0.8,
			src: src,
		})});
		return style;
	}
	
	getLineStyle(color, width, dash=undefined){
		let style = new ol.style.Style({
		    stroke: new ol.style.Stroke({
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
		this.mapEventsLayer = new ol.layer.Vector({
			source: new ol.source.Vector(),
			renderOrder: undefined
		});
		this.mapGeofenceLayer = new ol.layer.Vector({
			source: new ol.source.Vector(),
			renderOrder: undefined
		});
    this.routeLayer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      renderOrder: undefined
    });
    this.behaviorLayer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      renderOrder: undefined
    });

 		let area:any = this.locationService.getCurrentAreaRawSync();
   // create a map
    this.map =  new ol.Map({
      target: document.getElementById(this.mapElementId),
      layers: [
        new ol.layer.Tile({
          source: new ol.source.OSM(<ol.Object>{}),
          preload: 4,
        }),
				this.mapGeofenceLayer,
				this.mapEventsLayer,
        this.routeLayer,
        this.behaviorLayer,
     ],
      view: new ol.View({
        center: ol.proj.fromLonLat((area && area.center) || [0, 0], undefined),
        zoom: ((area && area.zoom) || DEFAULT_ZOOM)
      }),
    });
		this.mapItemHelpers["event"] = new MapEventHelper(this.map, this.mapEventsLayer, this.eventService);
    this.mapItemHelpers["geofence"] = new MapGeofenceHelper(this.map, this.mapGeofenceLayer, this.geofenceService, {itemLabel: "Boundary"});

    // add helpers
		this.mapHelper = new MapHelper(this.map, function(coordinate, feature, layer) {
      let item = feature.get("item");
      if (item) {
        let helper = this.mapItemHelpers[item.getItemType()];
        if (helper && helper.hitTest) {
          return helper.hitTest(item, feature, ol.proj.toLonLat(coordinate, undefined));
        }
      }
      return true;
    }.bind(this));

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
          pop.on('shown.bs.popover', function(){
            let c = $(elem).parent().find('.popover .close');
            c && c.on('click', function(){
              closeCallback && closeCallback();
            });
            let r = $(elem).parent().find('.popover .remove');
            r && r.on('click', function(e) {
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
        hoverContent = {content: '<span style="white-space: nowrap;">' + _.escape(content) + '</span>' };
      } else {
        let item = feature.get("item");
        if (item) {
          let helper = this.mapItemHelpers[item.getItemType()];
          if (helper) {
            let props = helper.getHoverProps(item);
            if (props && props.length > 0) {
              let title = helper.getItemLabel() + " (" + item.getId() + ")";
              let details: string = "<table><tbody>";
              props.forEach(function(prop) {
                details += "<tr><th style='white-space: nowrap;text-align:right;'><span style='margin-right:10px;'>" + _.escape(prop.key.toUpperCase()) +
                                    ":</span></th><td>" + _.escape(prop.value) + "</td></tr>";
              });
              details += "</tbody><table>";
              hoverContent = {title: title, content: details, removeable: true};
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

	_loadDriverBehavior(mo_id, trip_id) {
		this.loading = true;
		this.behaviors = [];
		this.tripFeatures = [];
		this.driverBehaviorService.getCarProbeHistory(mo_id, trip_id).subscribe(data => {
			try {
				this.updateTripRoute(data);
			} finally {
				this.loading = false;
			}
			this.driverBehaviorService.getDrivingBehavior(mo_id, trip_id).subscribe(data => {
				if (!data || !data.ctx_sub_trips) {
					return; // no content
				}
				var subTrips = [].concat(data.ctx_sub_trips);
				var behaviorDetails = _.flatten(_.pluck(subTrips, 'driving_behavior_details'));
				behaviorDetails = behaviorDetails.sort((a, b) => {return a.start_time - b.start_time;});
				let detailIndex = 0;
				let detailList = [];
				this.trip.forEach(probe => {
					for(let i=detailIndex; i<behaviorDetails.length; i++){
						if(probe.timestamp >= behaviorDetails[i].start_time){
							behaviorDetails[i].route = [];
							detailList.push(behaviorDetails[i]);
							detailIndex++;
						}else{
							break;
						}
					}
					detailList.forEach(detail => {
						detail.route.push({
							longitude: probe.matched_longitude||probe.longitude,
							latitude: probe.matched_latitude||probe.latitude
						});
					});
					detailList = detailList.filter(detail => {return probe.timestamp < 	detail.end_time;});
				});
				var byName = _.groupBy(behaviorDetails, function(d){ return d.behavior_name; });

				this.behaviors = _.sortBy(_.pairs(byName).map(function(p){
					return {name: p[0], details: p[1]};
				}), function(behavior) {
					return behavior.name;
				});
				this.selectedBehavior = this.behaviors[0];
				this.setSelectedBehavior(this.selectedBehavior);
				
				// features
				if (!data.trip_features) {
					return; // no trip_features
				}
				var tripFeatures = [].concat(data.trip_features);
				this.tripFeatures = _.sortBy(_.filter(tripFeatures.map(function(p){
					return {name: p.feature_name, value: p.feature_value};
				}), function(feature) {
					return !_.contains(["month_of_year", "day_of_week", "day_of_month"], feature.name);
				}), function(feature) {
					return feature.name;
				});
			}, error => {
				if (error.status === 400) {
					// The trajectory may be too short to analyze. 
				} else {
					this.behaviorHttpError = error.message || error._body || error;
				}
			});

			let from = this.trip[0].timestamp;
			let to = this.trip[this.trip.length-1].timestamp;
			this.alertService.getAlert({from: from, to: to, mo_id: mo_id, includeClosed: true, limit: 200}).subscribe(data => {
				var alerts = data.alerts;
				alerts.sort((a, b) => {return a.ts - b.ts;});
				let alertIndex = 0;
				let alertList = [];
				this.trip.forEach(probe => {
					for(let i=alertIndex; i<alerts.length; i++){
						if(probe.timestamp >= alerts[i].ts){
							alerts[i].route = [];
							alertList.push(alerts[i]);
							alertIndex++;
						}else{
							break;
						}
					}
					alertList.forEach(alert => {
						alert.route.push({
							longitude: probe.matched_longitude||probe.longitude,
							latitude: probe.matched_latitude||probe.latitude
						});
					});
					alertList = alertList.filter(alert => {return alert.closed_ts < 0 || probe.timestamp < alert.closed_ts;});
				});
				var byType = _.groupBy(alerts, "description");
				this.alerts = _.sortBy(_.pairs(byType).map(p => {
					let type;
					if(p[1][0].type === "geofence"){
						type = "Geofence";
					}else if(p[1][0].source.type === "event"){
						type = "Event";
					}else{
						type = "";
					}
					return {name: p[0], type: type, details: p[1]};
				}), "type");
			});
		}, error => {
			this.loading = false;
			this.tripRouteHttpError = error.message || error._body || error;
		});
	}
	
	expandExtent(extent, ratio):[number, number, number, number] {
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
	createRouteLine(start, end, style): ol.Feature {
		let geom = new ol.geom.LineString([[start.matched_longitude || start.longitude, start.matched_latitude || start.latitude],
																				[end.matched_longitude || end.longitude, end.matched_latitude || end.latitude]]);
		geom.transform(PROJ_LONLAT, PROJ_MAP);
		let feature = new ol.Feature({
			geometry: geom,
		});
		feature.setStyle(style);
		return feature;
	}

	// Show trip route
	updateTripRoute(trip){
			// map not initialized yet
			if(!this.mapHelper) return;
			
			// clear first
			this.routeLayer.getSource().clear();

			if(!trip || trip.length === 0) {
				this.trip = null;
				return;
			}
			this.trip = trip;

			// add start/end icon
			let routeLayer = this.routeLayer;
			function addFeature(geo, style){
				if(isNaN(parseFloat(geo[0])) || isNaN(parseFloat(geo[1]))) return; // skip
				let feature = new ol.Feature({
					geometry: new ol.geom.Point(ol.proj.fromLonLat([geo[0], geo[1]], undefined)),
				});
				feature.setStyle(style);
				routeLayer.getSource().addFeature(feature);
			}

			// add start and end positions
			let start = trip[0];
			let end = trip[trip.length-1];
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
				features.push(this.createRouteLine(trip[i], trip[i+1], this.TRIP_ROUTE_STYLE));
			}
			this.routeLayer.getSource().addFeatures(features);
			
			// update map extent
			let tripRouteExtent = this.routeLayer.getSource().getExtent();
			if(tripRouteExtent){
				let extent = ol.proj.transformExtent(tripRouteExtent, PROJ_MAP, PROJ_LONLAT);
				extent = this.expandExtent(extent, 0); // expand if necessary
				this.mapHelper.moveMap({extent: extent});
			}
	}
	
	// Show driving behavior markers
	updateBehaviorDetails(details){
			// map not initialized yet
			if(!this.mapHelper) return;
			
			// clear first
			this.behaviorLayer.getSource().clear();
			if(!details) return;
			
			let features:any = _.flatten([].concat(details.details).map(function(detail){
				let route = [];
				for(let i=0; i<detail.route.length-1; i++){
					route.push(this.createRouteLine(detail.route[i], detail.route[i+1], this.BEHAVIOR_DETAIL_STYLE));
				}
				return route;
			}.bind(this)));
			this.behaviorLayer.getSource().addFeatures(features);
	}

	_isFiniteNumber(value): boolean {
		return isFinite(value-0) && value !== null && value !== "" && value !== false;
	}
}
