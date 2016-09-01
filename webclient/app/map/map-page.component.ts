import { Component, OnInit, Input, Inject } from '@angular/core';

import { RealtimeMapComponent } from './realtime-map/realtime-map.component';
import { NumberOfCarsComponent } from './number-of-cars/number-of-cars.component';
import { LocationService, MapArea } from '../shared/location.service';

import * as _ from 'underscore';

@Component({
  moduleId: module.id,
  selector: 'fmdash-map-page',
  templateUrl: 'map-page.component.html',
  directives: [RealtimeMapComponent, NumberOfCarsComponent],
  providers: [LocationService],
})
export class MapPageComponent implements OnInit {
  areas: MapArea[];
  selectedArea: MapArea;
  private mapLastSelectedArea: MapArea;
  regions: MapArea[];

  //
  // Web API host
  //
  webApiBaseUrl: string;

  constructor(@Inject('webApiHost') webApiHost: string, locationService: LocationService) {
    this.webApiBaseUrl = window.location.protocol + '//' + webApiHost;
    this.areas = locationService.getAreas();
    this.regions = locationService.getRegions();
  }

  onMapExtentChanged(event){
    let extent = event.extent;
    this.mapLastSelectedArea = {id:'_last_selected', name: 'Last Selected', extent: extent};
    //this.selectedArea = {id: 'user_' + Date.now(), name: 'User Defined', extent: extent};
  }

  get htmlClientInitialLocation(){
    let e = this.mapLastSelectedArea && this.mapLastSelectedArea.extent;
    if(e){
      var lng = (e[0] + e[2]) / 2, lat = (e[1] + e[3]) / 2;
      return '' + lat + ',' + lng;
    }
    return "";
  }

  ngOnInit() {
    // move location
    if(navigator.geolocation){
        var fSelectNearestLocation = !this.mapLastSelectedArea;
        navigator.geolocation.getCurrentPosition(pos => {
            var current_center = [pos.coords.longitude, pos.coords.latitude];
            this.areas.push({
                id: '_current',
                name: 'Current Location',
                center: current_center});
            if(fSelectNearestLocation){ // select current location by default
              this.selectedArea = this.areas[this.areas.length-1];
            }else if(fSelectNearestLocation){
                // when the location is not "last selected", re-select the map location depending on the current location
                var nearest = _.min(this.areas, area => {
                    if((area.id && area.id.indexOf('_') === 0) || !area.center) return undefined;
                    // approximate distance by the projected map coordinate
                    var to_rad = function(deg){ return deg / 180 * Math.PI; };
                    var r = 6400;
                    var d_lat = Math.asin(Math.sin(to_rad(area.center[1] - current_center[1]))); // r(=1) * theta
                    var avg_lat = (area.center[1] + current_center[1]) / 2
                    var lng_diff = _.min([Math.abs(area.center[0] - current_center[0]), Math.abs(area.center[0] + 360 - current_center[0]), Math.abs(area.center[0] - 360 - current_center[0])]);
                    var d_lng = Math.cos(to_rad(avg_lat)) * to_rad(lng_diff); // r * theta
                    var d = Math.sqrt(d_lat * d_lat + d_lng * d_lng);
                    //console.log('Distance to %s is about %f km.', area.id, d * 6400);
                    return d;
                });
                if(nearest.id){
                    // when valid nearest is selected, set it
                    this.selectedArea = nearest;
//                    $scope.$digest(); // notify to move fast //FIXME: are there any substitution?
                }
            }
        });
    }
    // make initial seletion of a displayed map area
    if(this.mapLastSelectedArea){
      this.areas.push(this.mapLastSelectedArea);
      this.selectedArea = this.mapLastSelectedArea;
    }else{
      this.selectedArea = this.areas[0];
    }
  }
}
