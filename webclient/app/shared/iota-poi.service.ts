/**
 * Copyright 2019,2020 IBM Corp. All Rights Reserved.
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

@Injectable()
export class POIService {
  constructor (private http: AppHttpClient) {
  }

  public getCapability() {
    return this.http.get("/user/capability/poi");
   }

  public queryPOIs(params): Observable<any> {
    let url = "/user/poi/query";
    console.log("query poi: " + url);

    let headers = new HttpHeaders({"Content-Type": "application/JSON;charset=utf-8"});
    let options = {headers: headers};

    return this.http.post(url, params, options);
  }

  public getPOI(poi_id: string) {
    let url = "/user/poi?poi_id=" + poi_id;
    console.log("get poi: " + url);

    return this.http.get(url);
  }

  public createPOI(poi) {
    let url = "/user/poi";
    let body = JSON.stringify(poi);
    let headers = new HttpHeaders({"Content-Type": "application/JSON;charset=utf-8"});
    let options = {headers: headers};

    return this.http.post(url, body, options);
  }

  public uploadPOIFile(file, mo_id, serialnumber) {
    let formData: FormData = new FormData();
    formData.append("mo_id", mo_id);
    formData.append("serialnumber", serialnumber);
    formData.append("file", file, file.name);
    let headers = new HttpHeaders();
    headers.set("Accept", "application/json");
    let options = { headers: headers };

    return this.http.post("/user/poi/upload", formData, options);
  }

  public deletePOI(poi_id) {
    return this.http.delete("/user/poi?poi_id=" + poi_id);
  }

  /*
  * Calculate a distance between point1[longitude, latitude] and point2[longitude, latitude]
  */
  public calcDistance(point1, point2) {
    let R = 6378e3;
    let lon1 = this.toRadians(point1[0]);
    let lat1 = this.toRadians(point1[1]);
    let lon2 = this.toRadians(point2[0]);
    let lat2 = this.toRadians(point2[1]);
    let delta_x = lon2 - lon1;
    let delta_y = lat2 - lat1;
    let a = Math.sin(delta_y / 2) * Math.sin(delta_y / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(delta_x / 2) * Math.sin(delta_x / 2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let distance = R * c;
    return distance;
  }

  public toRadians(n) {
    return n * (Math.PI / 180);
  }
}
