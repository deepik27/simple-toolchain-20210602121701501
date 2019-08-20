/**
 * Copyright 2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
import * as ol from "openlayers";
import { Injectable } from "@angular/core";
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { POIService } from "./iota-poi.service";
import{ MapItemHelper } from "./map-item-helper";
import{ Item } from "./map-item-helper";

@Injectable()
export class MapPOIHelper extends MapItemHelper<POI> {
  isAvailable: boolean = false;
  dirs: string[];
  poiIcon = null;
  poiStyle: ol.style.Style;
  defaultStyle: ol.style.Style;
  queryProperties: any;

  constructor(public map: ol.Map, public itemLayer: ol.layer.Vector, public poiService: POIService, options: any = {}) {
    super(map, itemLayer);

    options = options || {};
    this.setItemLabel(options.itemLabel || "POI");

    this.poiService.getCapability().subscribe(data => {
      if (data) {
        this.isAvailable = data.available;
      }
    });

    let self = this;
    let getFeatureStyle = function getFeatureStyle(feature: ol.Feature) {
      self.defaultStyle = self.getIconStyle('/images/MarkerGray.png', [79,158], 0.1);
      self.poiStyle = self.getIconStyle('/images/MarkerBlue.png', [79,158], 0.1);

      return function(feature, resolution) {
        let style = self.getFeatureStyle(feature);
        feature.setStyle(style);
        return style;
      };
    }(undefined);
    this.itemLayer.setStyle(getFeatureStyle);
  }

  getFeatureStyle(feature: ol.Feature) {
    let poi = feature.get("item");
    if (!poi) {
      return this.defaultStyle;
    }
    return this.poiStyle;
  };

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

  public getItemType() {
    return "poi";
  }

  // query items within given area
  public queryItems(min_longitude: number, min_latitude: number, max_longitude: number, max_latitude: number) {
    if (!this.isAvailable) {
      return of([]);
    }
    let center_latitude = (max_latitude + min_latitude) / 2;
    let center_longitude = (max_longitude + min_longitude) / 2;
    let radius = Math.ceil(this._calcDistance([center_longitude, center_latitude], [max_longitude, max_latitude]) / 1000);
    return this.poiService.queryPOIs({
        latitude: center_latitude,
        longitude: center_longitude,
        radius: radius,
        properties: this.queryProperties
    }).pipe(map(data => {
      return data.map(function(poi) {
        return new POI(poi);
      });
    }));
  }

  /*
  * Calculate a distance between point1[longitude, latitude] and point2[longitude, latitude]
  */
  _calcDistance(point1, point2) {
    let R = 6378e3;
    let lon1 = this._toRadians(point1[0]);
    let lat1 = this._toRadians(point1[1]);
    let lon2 = this._toRadians(point2[0]);
    let lat2 = this._toRadians(point2[1]);
    let delta_x = lon2 - lon1;
    let delta_y = lat2 - lat1;
    let a = Math.sin(delta_y / 2) * Math.sin(delta_y / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(delta_x / 2) * Math.sin(delta_x / 2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let distance = R * c;
    return distance;
  }

  _toRadians(n) {
    return n * (Math.PI / 180);
  }

  public setQueryProperties(props: any) {
    this.queryProperties = props;
  }

  // query items within given area
  public getItem(id: string) {
    return this.poiService.getPOI(id).pipe(map(data => {
      return new POI(data);
    }));
  }

  public createItemFeatures(poi: POI) {
    // Setup current poi position
    let coordinates: ol.Coordinate = [poi.longitude || 0, poi.latitude || 0];
    let position = ol.proj.fromLonLat(coordinates, undefined);
    let feature = new ol.Feature({geometry: new ol.geom.Point(position), item: poi});
//    console.log("created a poi feature : " + poi.poi_id);
    return [feature];
  }

  public createTentativeFeatures(loc: any) {
    // Setup current poi position
    let position = ol.proj.fromLonLat([loc.longitude, loc.latitude], undefined);
    let feature = new ol.Feature({geometry: new ol.geom.Point(position)});
    return [feature];
  }

  public createItem(param: any) {
    return new POI(param);
  }

  public getHoverProps(poi: POI) {
    // poi type or description
    let description = poi.getId();
    if (poi.properties) {
      description = poi.properties.name;
    }
    let vehicle;
    if (poi.properties) {
      vehicle = poi.properties.serialnumber || poi.properties.mo_id;
    }

    let props = [];
    if (description) {
      props.push({key: "name", value: description});
    }
    if (vehicle) {
      props.push({key: "vehilce", value: vehicle});
    }
    // location and heading
    props.push({key: "location", value: Math.round(poi.latitude * 10000000) / 10000000 + "," + Math.round(poi.longitude * 10000000) / 10000000});
    return props;
  }
}

export class POI extends Item {
  id: string;
  longitude: number;
  latitude: number;
  properties: any;

  constructor(params) {
    super(params);
  }

  public getId() {
    return this.id ? this.id.toString() : null;
  }
  public getItemType() {
    return "poi";
  }
}
