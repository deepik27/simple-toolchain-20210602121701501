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
import { Component, OnInit, Input, Inject } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

import { LocationService, MapArea } from '../shared/location.service';
import { APP_CONFIG, AppConfig } from '../app-config';

import * as _ from 'underscore';

@Component({
  selector: 'fmdash-control-page',
  templateUrl: 'control-page.component.html',
  providers: [],
})
export class ControlPageComponent implements OnInit {
  areas: MapArea[];
  regions: MapArea[];
  selectedArea: MapArea;
  mapLastSelectedArea: MapArea;

  //
  // Web API host
  //
  webApiBaseUrl: string;

  constructor(
    private route: ActivatedRoute,
    private locationService: LocationService,
    @Inject(APP_CONFIG) appConfig: AppConfig
  ) {
    this.webApiBaseUrl = window.location.protocol + "//" + appConfig.webApiHost;
    this.locationService = locationService;
    this.areas = locationService.getAreas().map(x => x);
    this.regions = locationService.getRegions().map(x => x);
  }

  onMapExtentChanged(event) {
    let extent = event.extent;
    this.locationService.setMapRegionExtent(extent);
    this.mapLastSelectedArea = _.extend({}, this.locationService.getMapRegion()); // fire extent change
  }

  get htmlClientInitialLocation() {
    let mapRegion = this.locationService.getMapRegion();
    let e = mapRegion && mapRegion.extent;
    if (e) {
      let lng = (e[0] + e[2]) / 2, lat = (e[1] + e[3]) / 2;
      return "" + lat + "," + lng;
    }
    return "";
  }

  ngOnInit() {
    // move location
    this.selectedArea = this.areas[this.areas.length - 1];
    if (this.locationService.getMapRegion()) {
      if (this.locationService.getCurrentAreaRawSync()) {
        this.areas.push(this.locationService.getCurrentAreaRawSync());
      }
      this.areas.push(this.locationService.getMapRegion());
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
  }
}
