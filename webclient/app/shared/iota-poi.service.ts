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
import { Response, Headers, RequestOptions } from "@angular/http";
import { Observable } from "rxjs/Observable";

@Injectable()
export class POIService {
  constructor (private http: HttpClient) {
  }

  public getCapability() {
    return this.http.get("/user/capability/poi").map(data => {
        let resJson = data.json();
        return resJson;
    });
   }

  public queryPOIs(params): Observable<any> {
    let url = "/user/poi/query";
    console.log("query poi: " + url);

    let headers = new Headers({"Content-Type": "application/JSON;charset=utf-8"});
    let options = new RequestOptions({headers: headers});

    return this.http.post(url, params, options).map(data => {
        let resJson = data.json();
        return resJson;
    });
  }

  public getPOI(poi_id: string) {
    let url = "/user/poi?poi_id=" + poi_id;
    console.log("get poi: " + url);

    return this.http.get(url).map(data => {
        let resJson = data.json();
        return resJson;
    });
  }

  public createPOI(poi) {
    let url = "/user/poi";
    let body = JSON.stringify(poi);
    let headers = new Headers({"Content-Type": "application/JSON;charset=utf-8"});
    let options = new RequestOptions({headers: headers});

    return this.http.post(url, body, options).map(data => {
      let resJson = data.json();
      return resJson;
    });
  }

  public uploadPOIFile(file, mo_id, serialnumber) {
    let formData: FormData = new FormData();
    formData.append("mo_id", mo_id);
    formData.append("serialnumber", serialnumber);
    formData.append("file", file, file.name);
    let headers = new Headers();
    headers.set("Accept", "application/json");
    let options = new RequestOptions({ headers: headers });

    return this.http.post("/user/poi/upload", formData, options).map(data => {
      let resJson = data.json();
      return resJson;
    });
  }

  public deletePOI(poi_id) {
    return this.http.delete("/user/poi?poi_id=" + poi_id).map(data => {
      let resJson = data.json();
      return resJson;
    });
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
