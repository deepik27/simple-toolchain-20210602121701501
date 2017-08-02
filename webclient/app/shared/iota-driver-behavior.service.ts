/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AEGGZJ&popup=y&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
import { Injectable } from "@angular/core";
import { HttpClient } from "./http-client";
import { Response, Headers, RequestOptions } from "@angular/http";
import { Observable } from "rxjs/Observable";

@Injectable()
export class DriverBehaviorService {
  constructor (private http: HttpClient) {
  }

   public isAvailable() {
    return this.http.get("/user/capability/analysis").map(data => {
        let resJson = data.json();
        return resJson.available;
    });
   }

  public getTrips(vehicleId, limit) {
    let url = "/user/analysis/trip/" + vehicleId;
    if (limit) {
      url += ('?limit=' + limit);
    }
    console.log("get trip: " + url);
    return this.http.get(url).map(data => {
      if (data && (<any>data).status === 204) {
        return [];
      }
      let resJson = data.json();
      return _.map(resJson, trip => {
        (<any>trip).trip_id = (<any>trip).trip_id || (<any>trip).tirp_id;
        return trip;
      });
    });
  }

  public getDrivingBehavior(vehicleId, tripId) {
    let url = "/user/analysis/behaviors/" + vehicleId + "?trip_id=" + tripId;
    console.log("get driving behavior: " + url);
    return this.http.get(url).map(data => {
      if (data && (<any>data).status === 204) {
        return {};
      }
      let resJson = data.json();
      return resJson;
    });
  }

  public getCarProbeHistory(vehicleId, tripId): Observable<any> {
    let url = "/user/analysis/triproutes/" + vehicleId + "?trip_id=" + tripId;
    console.log("get car probe history: " + url);

    return this.http.get(url).map(data => {
      let resJson = data.json();
      return resJson;
    });
  }
}
