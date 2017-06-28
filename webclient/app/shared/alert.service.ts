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
export class AlertService {
  constructor (private http: HttpClient) {
  }

  public getAlert(conditions): Observable<any> {
		var condition = Object.keys(conditions).map(key => {return key + "=" + conditions[key];}).join("&");
    let url = "/user/alert?" + condition;
    console.log("get alert: " + url);

    return this.http.get(url).map(data => {
      let resJson = data.json();
      return resJson;
    });
  }
}