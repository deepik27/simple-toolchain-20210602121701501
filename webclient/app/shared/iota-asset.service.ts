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
import { Injectable } from "@angular/core";
import { AppHttpClient } from "./http-client";
import { HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs/index.js";
import { map } from 'rxjs/operators';

@Injectable()
export class AssetService {
  constructor (private http: AppHttpClient) {
  }

  // vehicles
  public getVehicles(page: number = -1, limit: number = -1): Observable<any> {
    return this.getAssets("vehicle", page, limit);
  }

  public getVehicle(id: string): Observable<any> {
    return this.getAsset("vehicle", id);
  }

  public createVehicle(params): Observable<any> {
    return this.getAsset("vehicle", params);
  }

  public updateVehicle(id: string, params): Observable<any> {
    return this.updateAsset("vehicle", id, params);
  }

  public deleteVehicle(id: string): Observable<any> {
    return this.deleteAsset("vehicle", id);
  }

  // drivers
  public getDrivers(page: number = -1, limit: number = -1): Observable<any> {
    return this.getAssets("driver", page, limit);
  }

  public getDriver(id: string): Observable<any> {
    return this.getAsset("driver", id);
  }

  public createDriver(params): Observable<any> {
    return this.getAsset("driver", params);
  }

  public updateDriver(id: string, params): Observable<any> {
    return this.updateAsset("driver", id, params);
  }

  public deleteDriver(id: string): Observable<any> {
    return this.deleteAsset("driver", id);
  }

  // vendors
  public getVendors(page: number = -1, limit: number = -1): Observable<any> {
    return this.getAssets("vendor", page, limit);
  }

  public getVendor(id: string): Observable<any> {
    return this.getAsset("vendor", id);
  }

  public createVendor(params): Observable<any> {
    return this.getAsset("vendor", params);
  }

  public updateVendor(id: string, params): Observable<any> {
    return this.updateAsset("vendor", id, params);
  }

  public deleteVendor(id: string): Observable<any> {
    return this.deleteAsset("vendor", id);
  }

  // asset APIs
  public getAssets(asset: string, page: number = -1, limit: number = -1): Observable<any> {
    let url = "/user/" + asset;
    if (page > 0 || limit > 0) {
      url += "?num_page=" + page + "&num_rec_in_page=" + limit;
    } else if (page > 0) {
      url += "?num_page=" + page;
    } else if (limit > 0) {
      url += "?num_rec_in_page=" + limit;
    }

    console.log("query: type=" + asset + "url=" + url);

    return this.http.get(url).pipe(map((data: any) => {
        return data.data;
    }));
  }

  public getAsset(asset: string, id: string) {
    let url = "/user/" + asset + "/" + id;

    console.log("get: type=" + asset + "url=" + url);

    return this.http.get(url);
  }

  public cerateAsset(asset: string, params) {
    let url = "/user/" + asset;
    let body = JSON.stringify(params);
    let headers = new HttpHeaders({"Content-Type": "application/JSON;charset=utf-8"});
    let options = {headers: headers};

    console.log("create: type=" + asset + "url=" + url);

    return this.http.post(url, body, options);
  }

  public updateAsset(asset: string, id: string, params) {
    let url = "/user/" + asset + "/" + id;
    let body = JSON.stringify(params);
    let headers = new HttpHeaders({"Content-Type": "application/JSON;charset=utf-8"});
    let options = {headers: headers};

    console.log("update: type=" + asset + "url=" + url);

    return this.http.put(url, body, options);
  }

  public deleteAsset(asset: string, id) {
    let url = "/user/" + asset + "/" + id;

    console.log("delete: type=" + asset + "url=" + url);

    return this.http.delete(url);
  }
}