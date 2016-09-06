import { Component } from '@angular/core';
import { Http, Request, Response } from '@angular/http';
import { Router, RouteSegment, OnActivate } from '@angular/router';

import { AlertListComponent } from './alert-list/alert-list.component';

@Component({
  moduleId: module.id,
  selector: 'fmdash-fleet-alert',
  templateUrl: 'alert-page.component.html',
  directives: [AlertListComponent]
})

export class AlertPageComponent implements OnActivate {
  private extent: number[];
  private filterProp = '';
  private filterValue = '';
  private includeClosed = true;
  private showInput = true;

  constructor(private router: Router){
  }

  routerOnActivate(current: RouteSegment){
    var extent: any = current.getParam('extent'); // extent is comma-separated list of min_lng, min_lat, max_lng, max_lat
    if(extent){
      if(extent.length == 4){
        this.extent = extent;
      }else{
        var splited = extent.split(",");
        if(splited.length === 4 && splited.every((n) => {return !isNaN(n)})){
          this.extent = splited;
        }else{
          this.extent = undefined;
        }
      }
    } else {
      this.extent = undefined;
    }

    let status = current.getParam('status');
    if(status === 'critical'){
      this.filterProp = 'severity';
      this.filterValue = 'High'; // FIXME: tentative. "Critical|High" is expected
      this.includeClosed = false;
      this.showInput = false;
    } else if (status === 'troubled'){
      this.filterProp = 'all';
      this.filterValue = 'all'; // assign temp value to hide control panels
      this.includeClosed = false;
      this.showInput = false;
    } else {
      this.filterProp = '';
      this.filterValue = '';
      this.includeClosed = true;
      this.showInput = true;
    }
  }
}
