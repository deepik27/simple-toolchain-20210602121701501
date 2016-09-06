import { Component, OnInit } from '@angular/core';
import { ROUTER_PROVIDERS, Routes, ROUTER_DIRECTIVES, Router } from '@angular/router';

import { CarStatusSummaryComponent } from './summary/car-status-summary.component';
import { CarStatusComponent } from './car-status.component';
import { CarStatusDataService } from './summary/car-status-data.service';
import { LocationService, MapArea } from '../shared/location.service';

import { RealtimeDeviceDataProviderService } from '../shared/realtime-device-manager.service';

@Component({
  moduleId: module.id,
  selector: 'fmdash-car-status-page',
  template: `
    <div class="container-50 noTopPadding container-30-right">
      <form class="floatRight">
        <select [(ngModel)]="selectedRegion" #sel (change)="selectRegion(sel.value)">
          <option *ngFor="let region of regions" [ngValue]="region">{{region.name}}</option>
        </select>
      </form>
      <h4>Car Status</h4>
      <router-outlet></router-outlet>
    </div>`,
    directives: [ROUTER_DIRECTIVES],
    providers: [CarStatusDataService],
})
@Routes([
  {path:'/',       component: CarStatusSummaryComponent},
  {path:'/:mo_id', component: CarStatusComponent},
])
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
