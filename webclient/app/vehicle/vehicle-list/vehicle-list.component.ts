/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 *
 * Data Privacy Disclaimer
 * 
 * This Program has been developed for demonstration purposes only to illustrate the technical
 * capabilities and potential business uses of the IBM IoT for Automotive
 * 
 * The components included in this Program may involve the processing of personal information
 * (for example location tracking and behavior analytics). When implemented in practice such
 * processing may be subject to specific legal and regulatory requirements imposed by country
 * specific data protection and privacy laws. Any such requirements are not addressed in
 * this Program.
 * 
 * Licensee is responsible for the ensuring Licensee's use of this Program and any deployed
 * solution meets applicable legal and regulatory requirements. This may require the implementation
 * of additional features and functions not included in the Program.
 * 
 * Apple License issue
 * 
 * This Program is intended solely for use with an Apple iOS product and intended to be used
 * in conjunction with officially licensed Apple development tools and further customized
 * and distributed under the terms and conditions of Licensee's licensed Apple iOS Developer
 * Program or Licensee's licensed Apple iOS Enterprise Program.
 * 
 * Licensee agrees to use the Program to customize and build the application for Licensee's own
 * purpose and distribute in accordance with the terms of Licensee's Apple developer program
 * 
 * Risk Mitigation / Product Liability Issues
 * 
 * The Program and any resulting application is not intended for design, construction, control,
 * or maintenance of automotive control systems where failure of such sample code or resulting
 * application could give rise to a material threat of death or serious personal injury.
 * 
 * IBM shall have no responsibility regarding the Program's or resulting application's compliance
 * with laws and regulations applicable to Licensee's business and content. Licensee is responsible
 * for use of the Program and any resulting application.
 * 
 * As with any development process, Licensee is responsible for developing, sufficiently testing
 * and remediating Licensee's products and applications and Licensee is solely responsible for any
 * foreseen or unforeseen consequences or failures of Licensee's products or applications.
 * 
 * REDISTRIBUTABLES
 * 
 * If the Program includes components that are Redistributable, they will be identified 
 * in the REDIST file that accompanies the Program. In addition to the license rights granted
 * in the Agreement, Licensee may distribute the Redistributables subject to the following terms:
 * 
 * 1) Redistribution must be in source code form only and must conform to all directions,
 *    instruction and specifications in the Program's accompanying REDIST or documentation;
 * 2) If the Program's accompanying documentation expressly allows Licensee to modify
 *    the Redistributables, such modification must conform to all directions, instruction and
 *    specifications in that documentation and these modifications, if any, must be treated
 *    as Redistributables;
 * 3) Redistributables may be distributed only as part of Licensee's application that was developed
 *    using the Program ("Licensee's Application") and only to support Licensee's customers
 *    in connection with their use of Licensee's Application. Licensee's application must constitute
 *    significant value add such that the Redistributables are not a substantial motivation
 *    for the acquisition by end users of Licensee's software product;
 * 4) If the Redistributables include a Java Runtime Environment, Licensee must also include other
 *    non-Java Redistributables with Licensee's Application, unless the Application is designed to
 *    run only on general computer devices (e.g., laptops, desktops and servers) and not on handheld
 *    or other pervasive devices (i.e., devices that contain a microprocessor but do not have
 *    computing as their primary purpose);
 * 5) Licensee may not remove any copyright or notice files contained in the Redistributables;
 * 6) Licensee must hold IBM, its suppliers or distributors harmless from and against any claim
 *    arising out of the use or distribution of Licensee's Application;
 * 7) Licensee may not use the same path name as the original Redistributable files/modules;
 * 8) Licensee may not use IBM's, its suppliers or distributors names or trademarks in connection
 *    with the marketing of Licensee's Application without IBM's or that supplier's
 *    or distributor's prior written consent;
 * 9) IBM, its suppliers and distributors provide the Redistributables and related documentation
 *    without obligation of support and "AS IS", WITH NO WARRANTY OF ANY KIND, EITHER EXPRESS
 *    OR IMPLIED, INCLUDING THE WARRANTY OF TITLE, NON-INFRINGEMENT OR NON-INTERFERENCE AND THE
 *    IMPLIED WARRANTIES AND CONDITIONS OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.;
 * 10) Licensee is responsible for all technical assistance for Licensee's Application and any
 *     modifications to the Redistributables; and
 * 11) Licensee's license agreement with the end user of Licensee's Application must notify the end
 *     user that the Redistributables or their modifications may not be i) used for any purpose
 *     other than to enable Licensee's Application, ii) copied (except for backup purposes),
 *     iii) further distributed or transferred without Licensee's Application or 
 *     iv) reverse assembled, reverse compiled, or otherwise translated except as specifically
 *     permitted by law and without the possibility of a contractual waiver. Furthermore, Licensee's
 *     license agreement must be at least as protective of IBM as the terms of this Agreement.
 * 
 * Feedback License
 * 
 * In the event Licensee provides feedback to IBM regarding the Program, Licensee agrees to assign
 * to IBM all right, title, and interest (including ownership of copyright) in any data, suggestions,
 * or written materials that 1) are related to the Program and 2) that Licensee provides to IBM.
 */
import { Component, Input } from '@angular/core';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import { Observable }     from 'rxjs/Observable';
import { OrderByPipe } from '../../utils/order-by.pipe';
import { MomentPipe } from '../../utils/moment.pipe';

@Component({
  moduleId: module.id,
  selector: 'vehicle-list',
  templateUrl: 'vehicle-list.component.html',
  styleUrls: ['../../../css/table.css', 'vehicle-list.component.css'],
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
  vendors: string[];
  selected_mo_id: string;

  constructor(private http: Http) {
    this.numRecInPage = 15;
    this.pageNumber = 1;
    this.hasNext = false;
    this.isWorkingWithVehicle = false;
    this.workingVehicle = new Vehicle({});
    this.errorMessage = "";
    this.selected_mo_id = null;
  }

  ngOnInit() {
    this.selected_mo_id = null;
    this._updateVehicleList(1);
  }

  onOrderBy(key) {
    this.ascendingOrder = (key === this.orderByKey) ? !this.ascendingOrder : true;
    this.orderByKey = key;
  }

  // refresh table
  onReload(event) {
    this._updateVehicleList(1);
  }

  onNumPageChanged(num: number) {
    this.numRecInPage = num;
    this._updateVehicleList(1);
  }

  onShowPrev(event) {
      if (this.pageNumber > 1) {
        this._updateVehicleList(this.pageNumber - 1);
      }
  }

  onShowNext(event) {
    if (this.hasNext) {
      this._updateVehicleList(this.pageNumber + 1);
    }
  }

  // Open a vehicle dialog for creating
  onCreate() {
    this.requestSending = true;
    this.errorMessage = null;
    this._getVendors()
    .subscribe((vendors: Array<string>) => {
      vendors.unshift("");
      this.vendors = vendors;
      this.requestSending = false;
      this.workingVehicle = new Vehicle({});
      this.isWorkingWithVehicle = true;
    }, (error: any) => {
        this.requestSending = false;
    });
  }

  // Open a vehicle dialog for updating
  onUpdate(mo_id: string) {
    this.requestSending = true;
    this.errorMessage = null;
    this._getVendors()
    .subscribe((vendors: Array<string>) => {
      vendors.unshift("");
      this.vendors = vendors;
      this.requestSending = false;
      this.workingVehicle = new Vehicle(this._getVehicle(mo_id));
      this.isWorkingWithVehicle = true;
    }, (error: any) => {
        this.requestSending = false;
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
      .map((response: any) => {
        let resJson = response.json();
        return resJson && resJson.data.map(function(v) {
            return new Vehicle(v);
        });
    });
  }

  // Create a vehicle with given data
  private _createNewVehicle(vehicle: Vehicle) {
    // remove internally used property
    let url = "/user/vehicle";
    let body = JSON.stringify({vehicle: vehicle.getData()});
    let headers = new Headers({"Content-Type": "application/json"});
    let options = new RequestOptions({headers: headers});

    let isRequestOwner = !this.requestSending;
    this.requestSending = true;
    this.errorMessage = null;
    this.http.post(url, body, options)
    .subscribe((response: Response) => {
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
    let headers = new Headers({"Content-Type": "application/json"});
    let options = new RequestOptions({headers: headers});

    let isRequestOwner = !this.requestSending;
    this.requestSending = true;
    this.errorMessage = null;
    this.http.put(url, body, options)
    .subscribe((response: Response) => {
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
    .subscribe((response: Response) => {
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

  // Get vendor list
  private _getVendors() {
    let isRequestOwner = !this.requestSending;
    this.requestSending = true;
    this.errorMessage = null;
    let url = "/user/vendor?num_rec_in_page=50&num_page=1";
    return this.http.get(url)
    .map((response: Response) => {
      let resJson = response.json();
      return resJson && resJson.data.map(function(v) {
          return v.vendor;
      });
    });
  }
}

// Vehicle definition
class Vehicle {
  __id: string;
  mo_id: string; // The ID of the vehicle that is automatically generated by the system.
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

  constructor(props) {
    for (let key in props) {
      this[key] = props[key];
    }
    this.__id = this.serial_number || this.mo_id;
  }

  getData() {
    let data = {};
    for (let key in this) {
      if (key.lastIndexOf("__", 0) !== 0) {
        data[key] = this[key];
      }
    }
    return data;
  }
}
