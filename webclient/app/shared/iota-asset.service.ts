/**
 * Copyright 2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
import { Injectable } from "@angular/core";
import { HttpClient } from "./http-client";
import { Headers, RequestOptions } from "@angular/http";
import { Observable } from "rxjs/index.js";
import { map } from 'rxjs/operators';

@Injectable()
export class AssetService {
  constructor (private http: HttpClient) {
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

    return this.http.get(url).pipe(map(data => {
        let resJson = data.json();
        return resJson.data;
    }));
  }

  public getAsset(asset: string, id: string) {
    let url = "/user/" + asset + "/" + id;

    console.log("get: type=" + asset + "url=" + url);

    return this.http.get(url).pipe(map(data => {
        let resJson = data.json();
        return resJson;
    }));
  }

  public cerateAsset(asset: string, params) {
    let url = "/user/" + asset;
    let body = JSON.stringify(params);
    let headers = new Headers({"Content-Type": "application/JSON;charset=utf-8"});
    let options = new RequestOptions({headers: headers});

    console.log("create: type=" + asset + "url=" + url);

    return this.http.post(url, body, options).pipe(map(data => {
        let resJson = data.json();
        return resJson;
    }));
  }

  public updateAsset(asset: string, id: string, params) {
    let url = "/user/" + asset + "/" + id;
    let body = JSON.stringify(params);
    let headers = new Headers({"Content-Type": "application/JSON;charset=utf-8"});
    let options = new RequestOptions({headers: headers});

    console.log("update: type=" + asset + "url=" + url);

    return this.http.put(url, body, options).pipe(map(data => {
        let resJson = data.json();
        return resJson;
    }));
  }

  public deleteAsset(asset: string, id) {
    let url = "/user/" + asset + "/" + id;

    console.log("delete: type=" + asset + "url=" + url);

    return this.http.delete(url).pipe(map(data => {
        let resJson = data.json();
        return resJson;
    }));
  }
}