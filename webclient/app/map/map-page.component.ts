import { Component, OnInit, AfterViewInit, Input, Inject, ViewChild } from '@angular/core';
import { Router, RouteSegment, OnActivate, ROUTER_DIRECTIVES } from '@angular/router';

import { RealtimeMapComponent } from './realtime-map/realtime-map.component';
import { NumberOfCarsComponent } from './number-of-cars/number-of-cars.component';
import { LocationService, MapArea } from '../shared/location.service';

import * as _ from 'underscore';

@Component({
  moduleId: module.id,
  selector: 'fmdash-map-page',
  templateUrl: 'map-page.component.html',
  directives: [RealtimeMapComponent, NumberOfCarsComponent, ROUTER_DIRECTIVES],
  providers: [],
})
export class MapPageComponent implements OnInit, AfterViewInit, OnActivate {
  areas: MapArea[];
  regions: MapArea[];
  selectedArea: MapArea;
  mapLastSelectedArea: MapArea;

  private initialVehicleId: string;
  @ViewChild(RealtimeMapComponent) realtimeMap: RealtimeMapComponent;

  //
  // Web API host
  //
  webApiBaseUrl: string;

  constructor(
    private router: Router,
    private locationService: LocationService,
    @Inject('webApiHost') webApiHost: string
  ) {
    this.webApiBaseUrl = window.location.protocol + '//' + webApiHost;
    this.locationService = locationService;
    this.areas = locationService.getAreas().map(x=>x);
    this.regions = locationService.getRegions().map(x=>x);
  }

  onMapExtentChanged(event){
    let extent = event.extent;
    this.locationService.setMapRegionExtent(extent);
    this.mapLastSelectedArea = _.extend({}, this.locationService.getMapRegion()); // fire extent change
  }

  get htmlClientInitialLocation(){
    let mapRegion = this.locationService.getMapRegion();
    let e = mapRegion && mapRegion.extent;
    if(e){
      var lng = (e[0] + e[2]) / 2, lat = (e[1] + e[3]) / 2;
      return '' + lat + ',' + lng;
    }
    return "";
  }

  routerOnActivate(current: RouteSegment){
    this.initialVehicleId = current.getParam('vehicleId');

  }
  ngOnInit() {
    // move location
    this.selectedArea = this.areas[this.areas.length - 1];
    if(this.locationService.getMapRegion()){
      if(this.locationService.getCurrentAreaRawSync()){
        this.areas.push(this.locationService.getCurrentAreaRawSync());
      }
      this.areas.push(this.locationService.getMapRegion());
    } else {
      this.locationService.getCurrentArea().then(area => {
        if(this.locationService.getCurrentAreaRawSync()){
          this.areas.push(this.locationService.getCurrentAreaRawSync());
        }
        this.selectedArea = area;
      }).catch(ex => {
        this.selectedArea = this.areas[0];
      });
    }
  }
  ngAfterViewInit() {
    if(this.initialVehicleId){
      this.realtimeMap.selectDevice(this.initialVehicleId);
    }
  }
}
