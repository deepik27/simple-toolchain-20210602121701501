import { Injectable } from '@angular/core';
import { Http, Request, Response, URLSearchParams } from '@angular/http';

import { Observable } from 'rxjs/Observable';

@Injectable()
export class RealtimeCarDataService {
  constructor(private http: Http) {  }


  getCarProbes(extent){
    var url = 'https://localhost:3000/user/carProbe';
    var params = new URLSearchParams();

    this.http.request(new Request({
      method: 'Get',
      url: url,

    }))



  }


}
