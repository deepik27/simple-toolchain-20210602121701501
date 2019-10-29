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

import { Injectable } from "@angular/core";
import { HttpClient } from "./http-client";
import { Observable } from "rxjs/index.js";
import { map } from 'rxjs/operators';

@Injectable()
export class DriverBehaviorService {
  constructor(private http: HttpClient) {
  }

  public isAvailable() {
    return this.http.get("/user/capability/analysis").pipe(map(data => {
      let resJson = data.json();
      return resJson.available;
    }));
  }

  public getTrips(vehicleId, limit) {
    let url = "/user/analysis/trip/" + vehicleId;
    if (limit) {
      url += ('?limit=' + limit);
    }
    console.log("get trip: " + url);
    return this.http.get(url).pipe(map(data => {
      if (data && (<any>data).status === 204) {
        return [];
      }
      let resJson = data.json();
      return _.map(resJson, trip => {
        (<any>trip).trip_id = (<any>trip).trip_id || (<any>trip).tirp_id;
        return trip;
      });
    }));
  }

  public getDrivingBehavior(vehicleId, tripId) {
    let url = "/user/analysis/behaviors/" + vehicleId + "?trip_id=" + tripId;
    console.log("get driving behavior: " + url);
    return this.http.get(url).pipe(map(data => {
      if (data && (<any>data).status === 204) {
        return {};
      }
      let resJson = data.json();
      return resJson;
    }));
  }

  public getCarProbeHistory(vehicleId, tripId, offset, limit): Observable<any> {
    let url = "/user/analysis/triproutes/" + vehicleId + "?trip_id=" + tripId;
    if (!isNaN(offset)) url += "&offset=" + offset;
    if (!isNaN(limit)) url += "&limit=" + limit;
    console.log("get car probe history: " + url);

    return this.http.get(url).pipe(map(data => {
      let resJson = data.json();
      return resJson;
    }));
  }

  public getCarProbeHistoryCount(vehicleId, tripId): Observable<any> {
    let url = "/user/analysis/triplength/" + vehicleId + "?trip_id=" + tripId;
    console.log("get car probe history: " + url);

    return this.http.get(url).pipe(map(data => {
      let resJson = data.json();
      return resJson;
    }));
  }
}
