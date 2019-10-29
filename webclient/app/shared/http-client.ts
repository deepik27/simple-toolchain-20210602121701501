/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
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
import { Http, Headers, RequestOptions } from '@angular/http';

@Injectable()
export class HttpClient {
  constructor(private http: Http) {
  }

  public get(url: string, options: RequestOptions = undefined) {
    // to prevent caching issue on IE
    options = options || new RequestOptions();
    if (options.headers) {
      options.headers.append("If-Modified-Since", (new Date(0)).toUTCString());
    } else {
      options.headers = new Headers({ "If-Modified-Since": (new Date(0)).toUTCString() });
    }
    return this.http.get(url, options);
  }

  public post(url: string, body: any, options: RequestOptions = undefined) {
    return this.http.post(url, body, options);
  }

  public put(url: string, body: any, options: RequestOptions = undefined) {
    return this.http.put(url, body, options);
  }

  public delete(url: string, options: RequestOptions = undefined) {
    return this.http.delete(url, options);
  }
}