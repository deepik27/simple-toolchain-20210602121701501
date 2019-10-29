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
import { Component, Input } from '@angular/core';
import { HttpClient } from '../../shared/http-client';
import { Response, Headers, RequestOptions } from '@angular/http';
import { map } from 'rxjs/operators';

@Component({
  moduleId: module.id,
  selector: 'vendor-list',
  templateUrl: 'vendor-list.component.html',
  styleUrls: ['vendor-list.component.css']
})

export class VendorListComponent {
  vendors: Vendor[];
  requestSending: boolean;
  selectedVendor: Vendor;
  formVendor: Vendor;
  errorMessage: string;

  constructor(private http: HttpClient) {
//    this.selectedVendor = new Vendor({});
    this.formVendor = new Vendor({});
    this.errorMessage = "";
  }

  ngOnInit() {
    this._updateVendorList();
  }

  // refresh table
  onReload() {
    this.formVendor = new Vendor({});
    this._updateVendorList();
  }

      // Create or update a vendor
  onCreateVendor() {
    if (!this.formVendor.name) {
      alert("The vendor name cannot be empty.");
      return;
    } else if (this._getVendorByName(this.formVendor.name)) {
      alert("The vendor already exists.");
      return;
    }
    this.formVendor.vendor = this._generateVendorId();
    this._createNewVendor(this.formVendor);
  }

    // Create or update a vendor
  onUpdateVendor(id: string) {
    if (!this.formVendor.name) {
      alert("The vendor name cannot be empty.");
      return;
    } else if (this._getVendorByName(this.formVendor.name, this.formVendor.vendor)) {
      alert("The vendor already exists.");
      return;
    }
    this._updateVendor(id, this.formVendor);
  }

  // Delete given vendor
  onDeleteVendor(id: string) {
    this._deleteVendor(id);
  }

  onSelectionChanged(id: string) {
    this.selectedVendor = this._getVendor(id);
    this.formVendor = new Vendor(this.selectedVendor);
  }

  private _updateVendorList() {
    let isRequestRoot = !this.requestSending;
    this.requestSending = true;
    this.errorMessage = null;
    this.selectedVendor = null;
    this._getVendors()
    .subscribe((vendors: Array<Vendor>) => {
        this.vendors = vendors;
        if (isRequestRoot) {
          this.requestSending = false;
        }
    }, (error: any) => {
        if (isRequestRoot) {
          this.requestSending = false;
        }
    });
  }

  // find a vendor from list
  private _getVendor(id: string): Vendor {
    for (let i = 0; i < this.vendors.length; i++) {
      if (this.vendors[i].vendor === id) {
        return this.vendors[i];
      }
    }
    return null;
  }

  // find a vendor from list
  private _getVendorByName(name: string, excludeId: string = null): Vendor {
    for (let i = 0; i < this.vendors.length; i++) {
      if (this.vendors[i].name === name && (!excludeId || (this.vendors[i].vendor !== excludeId))) {
        return this.vendors[i];
      }
    }
    return null;
  }

  // Get vendor list
  private _getVendors() {
    let isRequestOwner = !this.requestSending;
    this.requestSending = true;
    this.errorMessage = null;
    let url = "/user/vendor?num_rec_in_page=50&num_page=1";
    return this.http.get(url)
    .pipe(map((response: Response) => {
      let resJson = response.json();
      return resJson && resJson.data.map(function(v) {
          return new Vendor(v);
      });
    }));
  }

  // Create a vendor with given data
  private _createNewVendor(vendor: Vendor) {
    // remove internally used property
    let url = "/user/vendor";
    let body = JSON.stringify({vendor: vendor.getData()});
    let headers = new Headers({"Content-Type": "application/json"});
    let options = new RequestOptions({headers: headers});

    let isRequestOwner = !this.requestSending;
    this.requestSending = true;
    this.errorMessage = null;
    this.http.post(url, body, options)
    .subscribe((response: Response) => {
      // Update vehicle list when succeeded
      this._updateVendorList();
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

  // update a vendor with given data
  private _updateVendor(id: string, vendor: Vendor) {
    let url = "/user/vendor/" + id;
    let body = JSON.stringify(vendor.getData());
    let headers = new Headers({"Content-Type": "application/json"});
    let options = new RequestOptions({headers: headers});

    let isRequestOwner = !this.requestSending;
    this.requestSending = true;
    this.errorMessage = null;
    this.http.put(url, body, options)
    .subscribe((response: Response) => {
      // Update vendor list when succeeded
      this._updateVendorList();
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

  // delete a vendor
  private _deleteVendor(id: string) {
    let isRequestOwner = !this.requestSending;
    this.requestSending = true;
    this.errorMessage = null;
    this.http.delete("/user/vendor/" + id)
    .subscribe((response: Response) => {
      // Update vehicle list when succeeded
      this._updateVendorList();
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

  private _generateVendorId(){
    var newId = function() {
      var mac = Math.floor(Math.random() * 16).toString(16) +
      Math.floor(Math.random() * 16).toString(16) +
      Math.floor(Math.random() * 16).toString(16) +
      Math.floor(Math.random() * 16).toString(16) +
      Math.floor(Math.random() * 16).toString(16) +
      Math.floor(Math.random() * 16).toString(16) +
      Math.floor(Math.random() * 16).toString(16) +
      Math.floor(Math.random() * 16).toString(16) +
      Math.floor(Math.random() * 16).toString(16) +
      Math.floor(Math.random() * 16).toString(16) +
      Math.floor(Math.random() * 16).toString(16) +
      Math.floor(Math.random() * 16).toString(16);
      var macStr = mac[0].toUpperCase() + mac[1].toUpperCase() + mac[2].toUpperCase() + mac[3].toUpperCase() +
      mac[4].toUpperCase() + mac[5].toUpperCase() + mac[6].toUpperCase() + mac[7].toUpperCase() +
      mac[8].toUpperCase() + mac[9].toUpperCase() + mac[10].toUpperCase() + mac[11].toUpperCase();
      return macStr;
    };

    var id = null;
    while(!id) {
      id = newId();
      if (this.vendors) {
        for (let key in this.vendors) {
          if (this.vendors[key].vendor === id) {
            id = null;
            break;
          }
        }
      }
    }
    return id;
	}
}

// Vendor definition
class Vendor {
  vendor: string; // The ID of the vendor.
  name: string; // Name of the vendor.
  description: string; // Description of the vendor.
  type: string = "Manufacturer"; // Type of vendor. = [Manufacturer,Vendor,Caurier]
  website: string; // Vendors website URL.
  status: string = "Active";
  __noname: boolean = false;

  constructor(props) {
    for (let key in props) {
      this[key] = props[key];
    }
    if (!this.name) {
      this.__noname = true;
      this.name = this.vendor;
    }
  }

  getData() {
    let data:any = {};
    for (let key in this) {
      if (key.lastIndexOf("__", 0) !== 0) {
        data[key] = this[key];
      }
    }
    if (this.__noname) {
      data.vendor = data.name;
      delete data.name;
    }
    return data;
  }
}
