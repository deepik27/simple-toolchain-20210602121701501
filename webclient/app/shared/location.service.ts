/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
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

import { Injectable } from '@angular/core';

@Injectable()
export class LocationService {
  constructor() { }

  //
  // Area is for focusing on a small region.
  // - to set location, `center` (and `zoom`) or `extent` property
  //   - the default zoom value is 15
  //
  areas: MapArea[] = [
    { id: 'vegas1', name: 'MGM Grand, Las Vegas', center: [-115.1664377, 36.102894] },
    { id: 'orlando1', name: 'Hilton, Orlando', center: [-81.4591377, 28.4246951] },
    { id: 'munch1', name: 'Nymphenburg Palace, Munich', center: [11.555974, 48.176261] },
    { id: 'india1', name: 'Connaught Place, New Delhi', center: [77.2156304, 28.630628] },
    { id: 'tokyo1', name: 'Tokyo, Japan', center: [139.731992, 35.709026] },
  ];

  //
  // Track current position from GPS
  //
  private currentArea: MapArea;

  //
  // Region is wider than area, e.g. to track the number of cars
  //
  regions: MapArea[] = [
    { id: 'vegas', name: 'Las Vegas, Nevada', extent: [-116.26637642089848, 35.86905016413695, -114.00868599121098, 36.423521308323046] },
    { id: 'orlando', name: 'Orlando, Florida', extent: [-81.6327685, 28.6218145, -81.2464724, 28.411081] },
    { id: "munich", name: 'Munich, Germany', extent: [10.982384418945298, 48.01255711693946, 12.111229633789048, 48.24171763772631] },
    { id: 'newdelhi', name: 'New Delhi, India', extent: [77.06557, 28.7065088, 77.2948207, 28.5536736] },
    { id: 'tokyo', name: 'Tokyo, Japan', extent: [139.03856214008624, 35.53126066670448, 140.16740735493002, 35.81016922341598] },
  ];

  //
  // Track visible extent in Map
  //
  private mapRegion: MapArea;

  getAreas(): MapArea[] {
    return this.areas;
  }
  getCurrentAreaRawSync(): MapArea {
    return this.currentArea;
  }
  getCurrentArea(chooseNearestFromList = false): Promise<MapArea> {
    return new Promise((resolve, reject) => {
      var chooseNearest = (from) => {
        // when the location is not "last selected", re-select the map location depending on the current location
        var current_center = from.center;
        var nearest = _.min(this.areas, area => {
          if ((area.id && area.id.indexOf('_') === 0) || !area.center) return undefined;
          // approximate distance by the projected map coordinate
          var to_rad = function (deg) { return deg / 180 * Math.PI; };
          var r = 6400;
          var d_lat = Math.asin(Math.sin(to_rad(area.center[1] - current_center[1]))); // r(=1) * theta
          var avg_lat = (area.center[1] + current_center[1]) / 2
          var lng_diff = _.min([Math.abs(area.center[0] - current_center[0]), Math.abs(area.center[0] + 360 - current_center[0]), Math.abs(area.center[0] - 360 - current_center[0])]);
          var d_lng = Math.cos(to_rad(avg_lat)) * to_rad(lng_diff); // r * theta
          var d = Math.sqrt(d_lat * d_lat + d_lng * d_lng);
          //console.log('Distance to %s is about %f km.', area.id, d * 6400);
          return d;
        });
        if (nearest.id) {
          return nearest;
        }
        return from;
      }

      if (this.currentArea) {
        var r = chooseNearestFromList ? chooseNearest(this.currentArea) : this.currentArea;
        return resolve(r);
      }
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          var current_center = [pos.coords.longitude, pos.coords.latitude];
          this.currentArea = { id: '_current', name: 'Current Location', center: current_center };
          var r = chooseNearestFromList ? chooseNearest(this.currentArea) : this.currentArea;
          return resolve(r);
        });
      } else {
        return reject();
      }
    });
  }
  getRegions(): MapArea[] {
    return this.regions;
  }
  getMapRegion(): MapArea {
    return this.mapRegion;
  }
  setMapRegionExtent(extent: number[]) {
    if (!this.mapRegion || this.mapRegion.id !== '_last_selected') {
      this.mapRegion = { id: '_last_selected', name: 'Last Selected Area in Map', extent: extent };
    } else {
      this.mapRegion.extent = extent;
    }
  }

}

export interface MapArea {
  id: string;
  name: string;
  center?: number[],
  extent?: number[]
};
