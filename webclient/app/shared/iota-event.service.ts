import { Injectable } from "@angular/core";
import { Http, Response, Headers, RequestOptions } from "@angular/http";
import { Observable } from "rxjs/Observable";

@Injectable()
export class EventService {
  constructor (private http: Http) {
  }

  public getEventTypes() {
    return this.http.get("/user/eventtype").map(data => {
        let resJson = data.json();
        return resJson.data;
    });
  }

  public queryEvents(params): Observable<any> {
    let url = "/user/event/query";
    let prefix = "?";
    for (let key in params) {
       url += (prefix + key + "=" + params[key]);
       prefix = "&";
    }
    console.log("query event: " + url);

    return this.http.get(url).map(data => {
        let resJson = data.json();
        return resJson;
    });
  }

  public getEvent(event_id: string) {
    let url = "/user/event?event_id=" + event_id;
    console.log("get event: " + url);

    return this.http.get(url);
  }

  public createEvent(event) {
    let url = "/user/event";
    let body = JSON.stringify(event);
    let headers = new Headers({"Content-Type": "application/JSON;charset=utf-8"});
    let options = new RequestOptions({headers: headers});

    return this.http.post(url, event, options);
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
