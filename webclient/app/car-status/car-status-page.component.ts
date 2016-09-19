import { Component, OnInit } from '@angular/core';

import { CarStatusDataService } from './summary/car-status-data.service';
import { LocationService, MapArea } from '../shared/location.service';

import { RealtimeDeviceDataProviderService } from '../shared/realtime-device-manager.service';

@Component({
  moduleId: module.id,
  selector: 'fmdash-car-status-page',
  templateUrl: 'car-status-page.component.html',
  providers: [CarStatusDataService],
})
export class CarStatusPageComponent implements OnInit {
  regions: MapArea[];
  selectedRegion: MapArea;


  constructor(
    private locationService: LocationService,
    private realtimeDeviceDataProviderService: RealtimeDeviceDataProviderService
  ) {
    this.regions = this.locationService.getRegions().map(x=>x);
  }

  selectRegion(selValue){
    var region = this.regions[parseInt(selValue)];
    // update tracking extent
    this.realtimeDeviceDataProviderService.startTracking(region.extent);
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
}
