import { Component, OnInit } from '@angular/core';
import { Http, Request, Response } from '@angular/http';
import { Router, RouteSegment, OnActivate } from '@angular/router';

import { VehicleListComponent } from './vehicle-list/vehicle-list.component';


@Component({
  moduleId: module.id,
  selector: 'fmdash-vehicle-page',
  templateUrl: 'vehicle-page.component.html',
  directives: [VehicleListComponent]
})
export class VehiclePageComponent implements OnInit {
  constructor() {  }

  ngOnInit() {}
}
