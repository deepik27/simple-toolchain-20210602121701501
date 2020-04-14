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
import { Observable } from "rxjs/index.js";

@Injectable()
export class AlertService {
  constructor(private http: AppHttpClient) {
  }

  public getAlert(conditions): Observable<any> {
    var condition = Object.keys(conditions).map(key => { return key + "=" + conditions[key]; }).join("&");
    let url = "/user/alert?" + condition;
    console.log("get alert: " + url);

    return this.http.get(url);
  }
}