/**
 * Copyright 2016,2020 IBM Corp. All Rights Reserved.
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
import { Observable } from 'rxjs'

@Injectable()
export class GeofenceService {
  constructor(private http: AppHttpClient) {
  }

	/*
	 * geofence json
	 * {
	 * 		direction: "in" or "out", "out" by default
	 * 		geometry_type: "rectangle" or "circle", "rectangle" by default
	 * 		geometry: {
	 * 			min_latitude: start latitude of geo fence, valid when area_type is rectangle
	 * 			min_longitude: start logitude of geo fence, valid when area_type is rectangle
	 * 			max_latitude:  end latitude of geo fence, valid when area_type is rectangle
	 * 			max_longitude:  start logitude of geo fence, valid when area_type is rectangle
	 * 			latitude: center latitude of geo fence, valid when area_type is circle
	 * 			longitude: center logitude of geo fence, valid when area_type is circle
	 * 			radius: radius of geo fence, valid when area_type is circle
	 * 		},
   *    target: {
   *      area {
   * 	  		min_latitude: start latitude of geo fence target, valid when direction is out
	 * 		  	min_longitude: start logitude of geo fence target, valid when direction is out
	 * 		  	max_latitude:  end latitude of geo fence target, valid when direction is out
	 * 			  max_longitude:  start logitude of geo fence target, valid when direction is out
   *      }
   *    }
	 * }
	 */

  public getCapability() {
    return this.http.get("/user/capability/geofence");
  }

  public queryGeofences(params): Observable<any> {
    let url = "/user/geofence";
    let prefix = "?";
    for (let key in params) {
      url += (prefix + key + "=" + params[key]);
      prefix = "&";
    }
    console.log("query event: " + url);

     return this.http.get(url);
  }

  public getGeofence(geofence_id: string) {
    let url = "/user/geofence/" + geofence_id;
    console.log("get geofence: " + url);

     return this.http.get(url);
  }

  public createGeofence(geofence) {
    let url = "/user/geofence";
    let body = JSON.stringify(geofence);
    let headers = new HttpHeaders({ "Content-Type": "application/JSON;charset=utf-8" });
    let options = { headers: headers };

     return this.http.post(url, body, options);
  }

  public updateGeofence(geofence_id, geofence) {
    let url = "/user/geofence/" + geofence_id;
    let body = JSON.stringify(geofence);
    let headers = new HttpHeaders({ "Content-Type": "application/JSON;charset=utf-8" });
    let options = { headers: headers };

     return this.http.put(url, body, options);
  }

  public deleteGeofence(id) {
    return this.http.delete("/user/geofence/" + id);
  }
}
