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
import { map } from 'rxjs/operators';

@Injectable()
export class EventService {
  constructor(private http: AppHttpClient) {
  }

  public getEventTypes() {
    return this.http.get("/user/eventtype").pipe(map((data: any) => {
      return data.data;
    }));
  }

  public queryEvents(params): Observable<any> {
    let url = "/user/event/query";
    let prefix = "?";
    for (let key in params) {
      url += (prefix + key + "=" + params[key]);
      prefix = "&";
    }
    console.log("query event: " + url);

    return this.http.get(url);
  }

  public getEvent(event_id: string) {
    let url = "/user/event?event_id=" + event_id;
    console.log("get event: " + url);

    return this.http.get(url);
  }

  public createEvent(event) {
    let url = "/user/event";
    let body = JSON.stringify(event);
    let headers = new HttpHeaders({ "Content-Type": "application/JSON;charset=utf-8" });
    let options = { headers: headers };

    return this.http.post(url, body, options);
  }

  public deleteEvent(event_id) {
    return this.http.delete("/user/event?event_id=" + event_id);
  }

  public isActiveEvent(event) {
    if (!event.start_time && !event.end_time) {
      return true;
    }
    let current = Date.now();
    if (event.start_time) {
      try {
        let t = Date.parse(event.start_time);
        if (current < t) {
          return false;
        }
      } catch (e) {
        return false;
      }
    }
    if (event.end_time) {
      try {
        let t = Date.parse(event.end_time);
        if (t < current) {
          return false;
        }
      } catch (e) {
        return false;
      }
    }
    return true;
  }
}
