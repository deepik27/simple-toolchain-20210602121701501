import { Component, OnInit, Input } from '@angular/core';
import { RealtimeMapComponent } from './realtime-map/realtime-map.component';
import { NumberOfCarsComponent } from './number-of-cars/number-of-cars.component';

import * as _ from 'underscore';

interface MapArea {
  id: string;
  name: string;
  center?: number[],
  extent?: number[]
};


@Component({
  moduleId: module.id,
  selector: 'fmdash-map-page',
  templateUrl: 'map-page.component.html',
  directives: [RealtimeMapComponent, NumberOfCarsComponent],
})
export class MapPageComponent implements OnInit {

  //
  // Area is for focusing on a small region.
  // - to set location, `center` (and `zoom`) or `extent` property
  //   - the default zoom value is 15
  //
  areas: MapArea[] = [
    {id: 'vegas1'  , name: 'MGM Grand, Las Vegas', center:  [-115.165571,36.102118]},
    {id: 'vegas2' ,name: 'Mandalay Bay, Las Vegas', center:  [-115.176670,36.090754]},
    {id: 'munch1'  ,name: 'Hellabrunn Zoo, Munich', center:  [11.55848,48.0993]},
    {id: 'munch2'  ,name: 'Nymphenburg Palace, Munich', center:  [11.553583,48.176656]},
    {id: 'tokyo1' ,name: 'Tokyo, Japan', center:  [139.731992,35.709026]},
  ];
  selectedArea: MapArea;
  private mapLastSelectedArea: MapArea;

  //
  // Region is wider than area, e.g. to track the number of cars
  //
  regions: MapArea[] = [
    {id: 'vegas'  ,name: 'Las Vegas', extent: [-116.26637642089848,35.86905016413695,-114.00868599121098,36.423521308323046]},
    {id: "munich" ,name: 'Munich, Germany', extent: [10.982384418945298,48.01255711693946,12.111229633789048,48.24171763772631]},
    {id: 'tokyo'  ,name: 'Tokyo, Japan', extent:  [139.03856214008624,35.53126066670448,140.16740735493002,35.81016922341598]},
    {id: "toronto",name: 'Toronto, Canada', extent: [-80.69297429492181,43.57305259767264,-78.43528386523431,44.06846938917488]},
  ];


  constructor() {  }

  onMapExtentChanged(extent){
    this.mapLastSelectedArea = {id:'_last_selected', name: 'Last Selected', extent: extent};
    this.selectedArea = {id: 'user_' + Date.now(), name: 'User Defined', extent: extent};
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
            if(fSelectNearestLocation){
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
