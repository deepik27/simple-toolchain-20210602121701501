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
import { Component, OnInit } from '@angular/core';

import { ChartItemComponent } from './chart-item.component'
import { CarListComponent } from './car-list.component'
import { CarStatusDataService } from './car-status-data.service';
import { LocationService, MapArea } from '../../shared/location.service';
import { RealtimeDeviceDataProviderService } from '../../shared/realtime-device-manager.service';

@Component({
  moduleId: module.id,
  selector: 'fmdash-car-status-summary',
  templateUrl: 'car-status-summary.component.html',
  providers: [CarStatusDataService],
})
export class CarStatusSummaryComponent implements OnInit {
  private selectedGroupingProp: string;
  private selectedGroupingLabel: string;
  private regions: MapArea[];
  private selectedRegion: MapArea;

  constructor(
    private locationService: LocationService,
    private realtimeDeviceDataProviderService: RealtimeDeviceDataProviderService
  ) {
    this.regions = this.locationService.getRegions().map(x=>x);
  }

  ngOnInit() {
    if(this.locationService.getMapRegion()){
      this.regions.push(this.locationService.getMapRegion());
      this.selectedRegion = this.regions[this.regions.length - 1];
    }else{
      this.selectedRegion = this.regions[0];
    }
    // initialize tracking
    this.realtimeDeviceDataProviderService.startTracking(this.selectedRegion.extent);
  }

  chartSelectionChanged($event) {
    this.selectedGroupingProp = $event.key;
    this.selectedGroupingLabel = $event.value;
  }
  selectRegion(selValue){
    var region = this.regions[parseInt(selValue)];
    // update tracking extent
    this.realtimeDeviceDataProviderService.startTracking(region.extent);
  }
}
