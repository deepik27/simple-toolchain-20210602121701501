/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
import { Injectable } from '@angular/core';
import { Observable, interval } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';

import { Counts } from './counts';
import { RealtimeDeviceDataProvider } from '../../shared/realtime-device';
import { RealtimeDeviceDataProviderService } from '../../shared/realtime-device-manager.service';

import * as _ from 'underscore';

@Injectable()
export class NumberOfCarsService {
  // user animatedDeviceManager as the data source
  private animatedDeviceManager: RealtimeDeviceDataProvider;

  constructor(animatedDeviceManagerService: RealtimeDeviceDataProviderService) {
    this.animatedDeviceManager = animatedDeviceManagerService.getProvider();
  }

  getNumberOfCars(region: any, nInterval: number = 3): Observable<Counts> {
    var debugKey = Math.floor(Math.random() * 100);
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
