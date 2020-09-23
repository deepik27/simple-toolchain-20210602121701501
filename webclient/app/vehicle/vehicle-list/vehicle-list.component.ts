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
import * as _ from 'underscore';

import { Component } from '@angular/core';
import { AppHttpClient } from '../../shared/http-client';
import { HttpHeaders } from '@angular/common/http';
import { map } from 'rxjs/operators';

@Component({
  selector: 'vehicle-list',
  templateUrl: 'vehicle-list.component.html',
  styleUrls: ['vehicle-list.component.css'],
})

export class VehicleListComponent {
  vehicles: Vehicle[];
  requestSending: boolean;
  orderByKey: string;
  ascendingOrder: boolean;
  numRecInPage: number;
  pageNumber: number;
  hasNext: boolean;
  isWorkingWithVehicle: boolean;
  workingVehicle: Vehicle;
  errorMessage: string;
  vendors: Vendor[];
  selected_mo_id: string;
  showMoId: boolean = false;

  constructor(private http: AppHttpClient) {
    this.numRecInPage = 15;
    this.pageNumber = 1;
    this.hasNext = false;
    this.isWorkingWithVehicle = false;
    this.workingVehicle = new Vehicle({}, []);
    this.errorMessage = "";
    this.selected_mo_id = null;
  }

  ngOnInit() {
    this.selected_mo_id = null
    this._getVendors()
      .subscribe((vendors: Array<Vendor>) => {
        vendors.unshift(new Vendor({}));
        this.vendors = vendors;
        this._updateVehicleList(1);
      }, (error: any) => {
        this.vendors = [];
        this._updateVehicleList(1);
      });
  }

  onOrderBy(key) {
    this.ascendingOrder = (key === this.orderByKey) ? !this.ascendingOrder : true;
    this.orderByKey = key;

    this.vehicles = _.sortBy(this.vehicles, (vehicle) => vehicle[key]);
    if (!this.ascendingOrder) {
      this.vehicles.reverse();
    }
  }

  // refresh table
  onReload() {
    this._getVendors()
      .subscribe((vendors: Array<Vendor>) => {
        vendors.unshift(new Vendor({}));
        this.vendors = vendors;
        this._updateVehicleList(1);
      }, (error: any) => {
        this.vendors = [];
        this._updateVehicleList(1);
      });
  }

  onNumPageChanged(num: number) {
    this.numRecInPage = num;
    this._updateVehicleList(1);
  }

  onShowPrev() {
    if (this.pageNumber > 1) {
      this._updateVehicleList(this.pageNumber - 1);
    }
  }

  onShowNext() {
    if (this.hasNext) {
      this._updateVehicleList(this.pageNumber + 1);
    }
  }

  // Open a vehicle dialog for creating
  onCreate() {
    this.requestSending = true;
    this.errorMessage = null;
    this._getVendors()
      .subscribe((vendors: Array<Vendor>) => {
        vendors.unshift(new Vendor({}));
        this.vendors = vendors;
        this.requestSending = false;
        this.workingVehicle = new Vehicle({}, []);
        this.isWorkingWithVehicle = true;
      }, (error: any) => {
        this.requestSending = false;
        if (error.status === 404) { // No vendor is registered
          this.workingVehicle = new Vehicle({}, []);
          this.isWorkingWithVehicle = true;
        }
      });
  }

  // Open a vehicle dialog for updating
  onUpdate(mo_id: string) {
    this.requestSending = true;
    this.errorMessage = null;
    this._getVendors()
      .subscribe((vendors: Array<Vendor>) => {
        vendors.unshift(new Vendor({}));
        this.vendors = vendors;
        this.requestSending = false;
        this.workingVehicle = new Vehicle(this._getVehicle(mo_id), this.vendors);
        this.isWorkingWithVehicle = true;
      }, (error: any) => {
        this.requestSending = false;
        if (error.status === 404) { // No vendor is registered
          this.workingVehicle = new Vehicle(this._getVehicle(mo_id), this.vendors);
          this.isWorkingWithVehicle = true;
        }
      });
  }

  // Create a vehicle
  onSubmitVehicle() {
    this.isWorkingWithVehicle = false;
    if (this.workingVehicle.mo_id) {
      this._updateVehicle(this.workingVehicle.mo_id, this.workingVehicle);
    } else {
      this._createNewVehicle(this.workingVehicle);
    }
  }

  // Cancel a vehicle creation
  onCancelVehicle() {
    this.isWorkingWithVehicle = false;
  }

  // Delete given vehicle
  onDelete(mo_id: string) {
    this._deleteVehilce(mo_id);
  }

  onToggleStatus(mo_id: string) {
    let vehicle = new Vehicle(this._getVehicle(mo_id), this.vendors);
    if (vehicle.status === "active") {
      vehicle.status = "inactive";
    } else {
      vehicle.status = "active";
    }
    this._updateVehicle(mo_id, vehicle);
  }

  onSyncWithIoTPlatform() {
    let isRequestOwner = !this.requestSending;
    this.requestSending = true;
    this.errorMessage = null;
    this.http.post("/user/device/sync", {}, {})
      .subscribe((response: any) => {
        // Update vehicle list when succeeded
        this._updateVehicleList(1);
        if (isRequestOwner) {
          this.requestSending = false;
        }
      }, (error: any) => {
        this.errorMessage = error.message || error._body || error;
        if (isRequestOwner) {
          this.requestSending = false;
        }
      });
  }

  private _updateVehicleList(pageNumber: number) {
    let isRequestRoot = !this.requestSending;
    this.requestSending = true;
    this.errorMessage = null;
    this._getVehicles(this.numRecInPage, pageNumber)
      .subscribe((vehicles: Array<Vehicle>) => {
        this.vehicles = vehicles;
        this.pageNumber = pageNumber;
        this.hasNext = this.numRecInPage <= this.vehicles.length;
        if (isRequestRoot) {
          this.requestSending = false;
        }
      }, (error: any) => {
        if (error.status === 400) {
          alert("Thre are no more vehicles.");
        } else if (pageNumber === 1 && error.status === 404) {
          this.vehicles = [];
        } else {
          this.errorMessage = error.message || error._body || error;
        }
        this.hasNext = false;
        if (isRequestRoot) {
          this.requestSending = false;
        }
      });
  }

  // find a vehicle from list
  private _getVehicle(mo_id: string): Vehicle {
    for (let i = 0; i < this.vehicles.length; i++) {
      if (this.vehicles[i].mo_id === mo_id) {
        return this.vehicles[i];
      }
    }
    return null;
  }

  // Get vehicle list from server and update table
  private _getVehicles(numRecInPage: number, pageNumber: number) {
    let url = "/user/vehicle?num_rec_in_page=" + numRecInPage + "&num_page=" + pageNumber;
    return this.http.get(url)
      .pipe(map((data: any) => {
        return data && data.data.map(v => {
          return new Vehicle(v, this.vendors);
        });
      }));
  }

  // Create a vehicle with given data
  private _createNewVehicle(vehicle: Vehicle) {
    // remove internally used property
    let url = "/user/vehicle";
    let body = JSON.stringify({ vehicle: vehicle.getData() });
    let headers = new HttpHeaders({ "Content-Type": "application/json" });
    let options = { headers: headers };

    let isRequestOwner = !this.requestSending;
    this.requestSending = true;
    this.errorMessage = null;
    this.http.post(url, body, options)
      .subscribe((response: any) => {
        // Update vehicle list when succeeded
        this._updateVehicleList(1);
        if (isRequestOwner) {
          this.requestSending = false;
        }
      }, (error: any) => {
        this.errorMessage = error.message || error._body || error;
        if (isRequestOwner) {
          this.requestSending = false;
        }
      });
  }

  // update a vehicle with given data
  private _updateVehicle(mo_id: string, vehicle: Vehicle) {
    vehicle.mo_id = mo_id;
    let url = "/user/vehicle/" + mo_id;
    let body = JSON.stringify(vehicle.getData());
    let headers = new HttpHeaders({ "Content-Type": "application/json" });
    let options = { headers: headers };

    let isRequestOwner = !this.requestSending;
    this.requestSending = true;
    this.errorMessage = null;
    this.http.put(url, body, options)
      .subscribe((response: any) => {
        // Update vehicle list when succeeded
        this._updateVehicleList(this.pageNumber);
        if (isRequestOwner) {
          this.requestSending = false;
        }
      }, (error: any) => {
        this.errorMessage = error.message || error._body || error;
        if (isRequestOwner) {
          this.requestSending = false;
        }
      });
  }

  // delete a vehicle
  private _deleteVehilce(mo_id: string) {
    let isRequestOwner = !this.requestSending;
    this.requestSending = true;
    this.errorMessage = null;
    this.http.delete("/user/vehicle/" + mo_id)
      .subscribe((response: any) => {
        // Update vehicle list when succeeded
        if (this.vehicles.length === 1 && this.pageNumber > 1) {
          this._updateVehicleList(this.pageNumber - 1);
        } else {
          this._updateVehicleList(this.pageNumber);
        }
        if (isRequestOwner) {
          this.requestSending = false;
        }
      }, (error: any) => {
        this.errorMessage = error.message || error._body || error;
        if (isRequestOwner) {
          this.requestSending = false;
        }
      });
  }

  // Get vendor list
  private _getVendors() {
    let url = "/user/vendor?num_rec_in_page=50&num_page=1";
    return this.http.get(url)
      .pipe(map((response: any) => {
        return response && response.data.map(v => {
          return new Vendor(v);
        });
      }));
  }
}

// Vehicle definition
class Vehicle {
  __id: string;
  __mo_id: string;
  __vendorname: string = "";
  mo_id: string; // The ID of the vehicle that is automatically generated by the system.
  iotcvaltmoid: string; // An alternative alias of the vehicle
  siteid: string; // site id only for SaaS environment
  internal_mo_id: number; // The numerical ID of the vehicle that is automatically generated by the system.
  vendor: string = ""; // The vendor ID of the vehicle that is created from within the vendor's system.
  model: string = ""; // The model of the vehicle.
  type: string = ""; // The type of the vehicle. = [ArticulatedTruck,CarWithTrailer,HighSidedVehicle,PassengerCar,Motorcycle,Bus,LightTruck,HeavyTruck,HeavyTruck_AC2,HeavyTruck_AC3,HeavyTruck_AC4,HeavyTruck_AC5,HeavyTruck_AC6,HeavyTruck_AC7,TruckWithTrailer,TruckWithTrailer_AC2,TruckWithTrailer_AC3,TruckWithTrailer_AC4,TruckWithTrailer_AC5,TruckWithTrailer_AC6,TruckWithTrailer_AC7,Unknown]
  serial_number: string = ""; // The serial number of the vehicle.
  usage: string = ""; //  The usage code of the vehicle. = [PrivateUse,Taxi,Commercial,PublicTransport,Emergency,PatrolServices,RoadOperator,SnowPlough,HazMat,Other,Unknown]
  description: string = ""; // Description of the vehicle.
  width: number; // The width of the vehicle.
  height: number; // The height of the vehicle.
  driver_id: string; // The driver ID that is created by the driver interface from within the vehicle.
  status: string = "inactive";
  properties: any;

  constructor(props, vendors: Vendor[]) {
    for (let key in props) {
      this[key] = props[key];
    }
    this.__id = this.serial_number || this.mo_id;
    this.__mo_id = this.iotcvaltmoid || (this.siteid ? (this.siteid + ':' + this.mo_id) : this.mo_id);

    if (this.vendor) {
      _.each(vendors, v => {
        if (v.vendor === this.vendor) {
          this.__vendorname = v.name;
        }
      });
    }
    if (!this.siteid && this.vendor) {
      this.__vendorname = this.vendor; // Proberbly bluemix
    }
  }

  getData() {
    let data: any = {};
    for (let key in this) {
      if (key.lastIndexOf("__", 0) !== 0) {
        data[key] = this[key];
      }
    }
    return data;
  }
}

// Vendor definition
class Vendor {
  vendor: string; // The ID of the vendor.
  name: string; // Name of the vendor.

  constructor(props) {
    if (props) {
      this.vendor = props['vendor'];
      this.name = props['name'] || this.vendor;
    }
  }
}
