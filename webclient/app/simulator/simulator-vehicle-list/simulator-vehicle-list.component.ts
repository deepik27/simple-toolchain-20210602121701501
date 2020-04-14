/**
 * Copyright 2020 IBM Corp. All Rights Reserved.
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

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AppHttpClient } from '../../shared/http-client';
import { map } from 'rxjs/operators';

import {SimulatorVehicleService, SimulatorVehicle} from '../simulator-vehicle.service'

@Component({
  selector: 'simulator-vehicle-list',
  templateUrl: 'simulator-vehicle-list.component.html',
  styleUrls: ['simulator-vehicle-list.component.css'],
})

export class SimulatorVehicleListComponent {
  @Input() selectionMode: boolean;
	@Output() modeChange = new EventEmitter<any>();
  simulatorVehicles: SimulatorVehicle[];
  simulatorVehicle: SimulatorVehicle;
  vehicles: Vehicle[];
  requestSending: boolean;
  orderByKey: string;
  ascendingOrder: boolean;
  numRecInPage: number;
  pageNumber: number;
  hasNext: boolean;
  errorMessage: string;
  vendors: Vendor[];
  showMoId: boolean = false;

  constructor(private http: AppHttpClient, private simulatorVehicleService: SimulatorVehicleService) {
    this.numRecInPage = 15;
    this.pageNumber = 1;
    this.hasNext = false;
    this.errorMessage = "";
  }

  ngOnInit() {
    this.simulatorVehicles = this.simulatorVehicleService.getSimulatorVehicles();

    this._callback();
    this.onReload();
  }

  _callback() {
    this.simulatorVehicleService.getEmitter().subscribe((data) => {
      if (data.type == "selection") {
        if (data.state == "updateSelection") {
          this.simulatorVehicle = data.data;
        } else if (data.state == "updateList") {
          this.simulatorVehicles = data.data;
        }
      }
    });
  }

  onVehicleSelected() {
    this.simulatorVehicleService.selectSimulatorVehicle(this.simulatorVehicle);
  }

  onChangeListMode() {
    this.modeChange.emit(true);
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
    this._updateSelection();
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

  getSelectedVehicles(): SimulatorVehicle[] {
    return this.simulatorVehicles;
  }

  onSelectionChanged(vehicle) {
    if (!vehicle.selected) {
      this.simulatorVehicles = _.filter(this.simulatorVehicles, (v) => {
        return v.mo_id != vehicle.siteid + ":" + vehicle.mo_id;
      });
    } else {
      this.simulatorVehicles.push(this.simulatorVehicleService.createSimulatorVehicle({
        id: vehicle.serial_number || vehicle.mo_id,
        vehicleId: vehicle.mo_id,
        mo_id: vehicle.siteid + ":" + vehicle.mo_id,
        vendor: vehicle.__vendorname,
        serial_number: vehicle.serial_number,
        model: vehicle.model,
        properties: vehicle.properties || {}
      }));
    }
  }

  // Open a vehicle dialog for creating
  onCreate() {
    this.errorMessage = '';
    this.requestSending = true;
    this.errorMessage = null;
    this._getVendors()
      .subscribe((vendors: Array<Vendor>) => {
        vendors.unshift(new Vendor({}));
        this.vendors = vendors;
        this.requestSending = false;
      }, (error: any) => {
        this.requestSending = false;
      });
  }

  setSimulatedVehicles(): Promise<Number> {
    this.errorMessage = '';
    let vehicles = this.getSelectedVehicles();
    if (vehicles.length == 0) {
      this.errorMessage = "Select vehicles to simulate vehicle data.";
      return new Promise((resolve, reject) => resolve(0));
    }

    let current = this.simulatorVehicleService.getSimulatorVehicles(true);
    if (vehicles.length == current.length && _.difference(vehicles, current).length == 0) {
      return new Promise((resolve, reject) => resolve(current.length));
    }

    return new Promise((resolve, reject) => {
      let vehicleIds: String[] = _.map(vehicles, v => v.vehicleId);
      this.simulatorVehicleService.updateSimulatorVehicles(vehicleIds).then((data:SimulatorVehicleService[]) => {
        this._updateSelection();
        resolve(data.length);
      }, (error:any) => {
        this.errorMessage = error.error || error.message;
        reject(error);
      });
    });
  }

  private _updateSelection() {
    this.simulatorVehicles = this.simulatorVehicleService.getSimulatorVehicles();
    this.simulatorVehicle = this.simulatorVehicleService.getSelectedSimulatorVehicle();

    const mo_ids = _.pluck(this.simulatorVehicles, "mo_id");
    _.each(this.vehicles, (v:Vehicle) => {v.selected = _.contains(mo_ids, v.siteid + ":" + v.mo_id)});
  }

  private _updateVehicleList(pageNumber: number) {
    this.errorMessage = '';
    let isRequestRoot = !this.requestSending;
    this.requestSending = true;
    this.errorMessage = null;
    this._getVehicles(this.numRecInPage, pageNumber)
      .then((vehicles: Array<Vehicle>) => {
        this.simulatorVehicleService.getUsedVehicleIds().then((result:any) => {
          _.each(vehicles, (v) => {
            v.unavailable = _.contains(result, v.mo_id) || v.model == "TCU";
            _.each(this.vendors, (vendor) => {
              if (vendor.vendor == v.vendor) v.vendor = vendor.name;
            });
          });
        }).finally(() => {
          this.vehicles = vehicles;
          this.pageNumber = pageNumber;
          this.hasNext = this.numRecInPage <= this.vehicles.length;
          if (isRequestRoot) {
            this.requestSending = false;
          }
        });
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

  private _isVehicleSelected(mo_id: string) {
    return _.some(this.simulatorVehicles, (v) => {
      return v.mo_id == mo_id;
    });
  }

  // Get vehicle list from server and update table
  private _getVehicles(numRecInPage: number, pageNumber: number) {
    let url = "/user/vehicle?num_rec_in_page=" + numRecInPage + "&num_page=" + pageNumber + "&status=active";
    return this.simulatorVehicleService.getSimulatableVehicles(numRecInPage, pageNumber)
      .then((data: any) => {
        return data.map(v => {
          let vehicle = new Vehicle(v, this.vendors);
          vehicle.selected = this._isVehicleSelected(vehicle.siteid + ":" + vehicle.mo_id);
          return vehicle;
        });
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
  selected: boolean = false;
  unavailable: boolean = false;

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
