import { Component, OnInit, ViewChild } from '@angular/core';
import { Http, Request, Response } from '@angular/http';
import { Router, RouteSegment, OnActivate } from '@angular/router';

import { VendorListComponent } from './vendor-list/vendor-list.component';
import { VehicleListComponent } from './vehicle-list/vehicle-list.component';


@Component({
  moduleId: module.id,
  selector: 'fmdash-vehicle-page',
  templateUrl: 'vehicle-page.component.html',
  directives: [VendorListComponent, VehicleListComponent]
})
export class VehiclePageComponent implements OnInit {

  @ViewChild(VehicleListComponent)
  private vehicleList: VehicleListComponent;

  @ViewChild(VendorListComponent)
  private vendorList: VendorListComponent;

  isWorkingWithVendor: boolean;

  constructor() {}

  ngOnInit() {}

  onCreateVehicle() {
    this.vehicleList.onCreate();
  }

  onCreateVendor() {
    this.vendorList.onReload();
    this.isWorkingWithVendor = true;
  }

  onClose() {
    this.isWorkingWithVendor = false;
  }
}
