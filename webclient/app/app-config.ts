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
import { InjectionToken } from '@angular/core';

export let APP_CONFIG = new InjectionToken('app.config');

export interface AppConfig {
  DEBUG: boolean;
  webApiHost: string;
}

/**
 * When client is hosted at port 3123, it seems that lite-server is used for debugging.
 * So, re-target the API host to port 3000
 */
let webApiHost = (function () {
  if (window.location.port == '3123') {
    console.warn('WARNING');
    console.warn('WARNING: This client seems hosted by lite-server. Directing Web APIs to ' + window.location.hostname + ':3000' + '.');
    console.warn('WARNING');

    return window.location.hostname + ':3000';
  }
  return window.location.host;
})();

export const DEFAULT_APP_CONFIG: AppConfig = {
  DEBUG: false,
  webApiHost: webApiHost,
};
