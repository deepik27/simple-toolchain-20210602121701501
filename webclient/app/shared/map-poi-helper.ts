/**
 * Copyright 2019,2020 IBM Corp. All Rights Reserved.
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
import * as _ from "underscore";
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { POIService } from "./iota-poi.service";
import{ MapItemHelper } from "./map-item-helper";
import{ Item } from "./map-item-helper";

import { Map, Feature, Coordinate } from 'ol';
import { Style, Icon } from 'ol/style';
import { Point } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import * as olProj from 'ol/proj';


export class MapPOIHelper extends MapItemHelper<POI> {
  isAvailable: boolean = false;
  dirs: string[];
  poiIcon = null;
  poiStyle: Style;
  defaultStyle: Style;
  selectedPoiStyle: Style;
  selectedPOI: POI = null;
  queryProperties: any;

  constructor(public map: Map, public itemLayer: VectorLayer, public poiService: POIService, options: any = {}) {
    super(map, itemLayer);

    options = options || {};
    this.setItemLabel(options.itemLabel || "POI");

    this.poiService.getCapability().subscribe((data: any) => {
      if (data) {
        this.isAvailable = data.available;
      }
    });

    let self = this;
    let getFeatureStyle = function getFeatureStyle(feature: Feature) {
      self.defaultStyle = self.getIconStyle('/webclient/img/MarkerGray.png', [79,158], 0.1);
      self.poiStyle = self.getIconStyle('/webclient/img/MarkerBlue.png', [79,158], 0.1);
      self.selectedPoiStyle = self.getIconStyle('/webclient/img/MarkerRed.png', [79,158], 0.1);

      return function(feature, resolution) {
        let style = self.getFeatureStyle(feature);
        feature.setStyle(style);
        return style;
      };
    }(undefined);
    this.itemLayer.setStyle(getFeatureStyle);
  }

  getFeatureStyle(feature: Feature) {
    let poi = feature.get("item");
    if (!poi) {
      return this.defaultStyle;
    } else if (this.selectedPOI && poi.id == this.selectedPOI.id) {
      return this.selectedPoiStyle;
    }
    return this.poiStyle;
  };

	getIconStyle(src, anchor, scale){
		let style = new Style({image: new Icon({
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
    min_longitude -= 0.01;
    min_latitude -= 0.01;
    max_longitude += 0.01;
    max_latitude += 0.01;

    const selectedId = this.selectedPOI ? this.selectedPOI.id : null;
    this.selectedPOI = null;
    let center_latitude = (max_latitude + min_latitude) / 2;
    let center_longitude = (max_longitude + min_longitude) / 2;
    let radius = Math.ceil(this._calcDistance([center_longitude, center_latitude], [max_longitude, max_latitude]) / 1000);
    return this.poiService.queryPOIs({
        latitude: center_latitude,
        longitude: center_longitude,
        radius: radius,
        properties: this.queryProperties
    }).pipe(map(data => {
      return data.map((poi) => {
        const newPOI = new POI(poi);
        if (selectedId == newPOI.id) {
          this.selectedPOI = newPOI
        }
        return newPOI;
      });
    }));
  }

  public updateSelection(poi: POI) {
    if (this.selectedPOI) {
      _.each(this.itemMap[this.selectedPOI.id].features, (feature:Feature) => feature.setStyle(this.poiStyle));
    }
    this.selectedPOI = poi;
    if (this.selectedPOI) {
      _.each(this.itemMap[this.selectedPOI.id].features, (feature:Feature) => feature.setStyle(this.selectedPoiStyle));
    }
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
    let coordinates: Coordinate = [poi.longitude || 0, poi.latitude || 0];
    let position = olProj.fromLonLat(coordinates, undefined);
    let feature = new Feature({geometry: new Point(position), item: poi});
//    console.log("created a poi feature : " + poi.poi_id);
    return [feature];
  }

  public createTentativeFeatures(loc: any) {
    // Setup current poi position
    let position = olProj.fromLonLat([loc.longitude, loc.latitude], undefined);
    let feature = new Feature({geometry: new Point(position)});
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
