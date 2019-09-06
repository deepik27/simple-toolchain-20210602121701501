/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
import { Injectable } from "@angular/core";
import { HttpClient } from "./http-client";
import { Observable } from "rxjs/index.js";
import { map } from 'rxjs/operators';

@Injectable()
export class AlertService {
  constructor(private http: HttpClient) {
  }

  public getAlert(conditions): Observable<any> {
    var condition = Object.keys(conditions).map(key => { return key + "=" + conditions[key]; }).join("&");
    let url = "/user/alert?" + condition;
    console.log("get alert: " + url);

    return this.http.get(url).pipe(map(data => {
      let resJson = data.json();
      return resJson;
    }));
  }
}