import { Injectable } from "@angular/core";
import { Http, Response, Headers, RequestOptions } from "@angular/http";
import { Observable } from "rxjs/Observable";

@Injectable()
export class GeofenceService {
  constructor (private http: Http) {
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
	 * 		}
	 * }
	 */

   public queryGeofences(params): Observable<any> {
     let url = "/user/geofence";
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

   public getGeofence(event_id: string) {
     let url = "/user/geofence?geofence_id=" + event_id;
     console.log("get geofence: " + url);

     return this.http.get(url);
   }

   public createGeofence(geofence) {
     let url = "/user/geofence";
     let body = JSON.stringify(geofence);
     let headers = new Headers({"Content-Type": "application/JSON;charset=utf-8"});
     let options = new RequestOptions({headers: headers});

     return this.http.post(url, body, options).map(data => {
        let resJson = data.json();
        return resJson;
      });
  }

   public updateGeofence(geofence_id, geofence) {
     let url = "/user/geofence/" + geofence_id;
     let body = JSON.stringify(geofence);
     let headers = new Headers({"Content-Type": "application/JSON;charset=utf-8"});
     let options = new RequestOptions({headers: headers});

     return this.http.put(url, body, options).map(data => {
        let resJson = data.json();
        return resJson;
      });
  }

  public deleteGeofence(id) {
    return this.http.delete("/user/geofence/" + id).map(data => {
        let resJson = data.json();
        return resJson;
    });
  }
}
