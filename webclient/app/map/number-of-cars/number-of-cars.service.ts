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
import { Injectable } from '@angular/core';
import { Observable, interval } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';

import { Counts } from './counts';
import { RealtimeDeviceDataProvider } from '../../shared/realtime-device';
import { RealtimeDeviceDataProviderService } from '../../shared/realtime-device-manager.service';

import * as _ from 'underscore';
import * as Chance from 'chance';

@Injectable()
export class NumberOfCarsService {
  // user animatedDeviceManager as the data source
  private animatedDeviceManager: RealtimeDeviceDataProvider;
  private chance = new Chance();

  constructor(animatedDeviceManagerService: RealtimeDeviceDataProviderService) {
    this.animatedDeviceManager = animatedDeviceManagerService.getProvider();
  }

  getNumberOfCars(region: any, nInterval: number = 3): Observable<Counts> {
    var debugKey = Math.floor(this.chance.floating({min: 0, max: 1}) * 100);
    return interval(nInterval * 1000)
      .pipe(map(x => {
        let devices = this.animatedDeviceManager.getDevices();
        let all = -1;
        let all_anbiguous = false;
        let troubled = -1;
        let critical = -1;
        if (devices.length > 0 && devices[0].latestSample && devices[0].latestSample.aggregated) {
          all = 0;
          devices.forEach(function (device) {
            if (device.latestSample.count < 0) {
              all_anbiguous = true;
            } else if (all >= 0) {
              all += device.latestSample.count;
            }
          });
        } else {
          all = devices.length;
          troubled = devices.filter(device => (device.latestSample && device.latestSample.alertLevel === 'troubled')).length;
          critical = devices.filter(device => (device.latestSample && device.latestSample.alertLevel === 'critical')).length;
        }
        return <Counts>{ _region: region, all: all, all_anbiguous: all_anbiguous, troubled: troubled, critical: critical };
      }),
      startWith(loadingData),
      tap(counts => this.log('getNumberOfCars(%s) item: %s', debugKey, counts.all)));
  }

  private log(...vargs) {
    // console.log.call(vargs);
  }
}

const loadingData: Counts = {
  _region: undefined,
  all: -1,
  all_anbiguous: false,
  troubled: -1,
  critical: -1,
};

const sampleData: Counts = {
  _region: undefined,
  all: 25,
  all_anbiguous: false,
  troubled: 10,
  critical: 2,
};
