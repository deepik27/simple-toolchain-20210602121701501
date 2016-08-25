import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import { Counts } from './counts';
import { AnimatedDevice, AnimatedDeviceManager } from '../shared/animated-device';
import { AnimatedDeviceManagerService } from '../shared/animated-device-manager.service';

import * as _ from 'underscore';

@Injectable()
export class NumberOfCarsService {
  // user animatedDeviceManager as the data source
  private animatedDeviceManager: AnimatedDeviceManager;

  constructor(animatedDeviceManagerService: AnimatedDeviceManagerService) {
    this.animatedDeviceManager = animatedDeviceManagerService.getManager();
  }

  getNumberOfCars(region: any, interval = 3): Observable<Counts>{
    var debugKey = Math.floor(Math.random()*100);
    return Observable.interval(interval * 1000)
      .map(x => {
        let devices = this.animatedDeviceManager.getDevices();
        var all = devices.length;
        var troubled = devices.filter(device => (device.latestInfo && device.latestInfo.alerts)).length;
        var critical = devices.filter(device => (device.latestInfo && device.latestInfo.alerts && (device.latestInfo.alerts.Critical || device.latestInfo.alerts.High))).length;
        return <Counts>{ _region: region, all: all, troubled: troubled, critical: critical };
      })
      .startWith(loadingData)
      .do(counts => this.log('getNumberOfCars(%s) item: %s', debugKey, counts.all));
  }

  private log(...vargs){
    // console.log.call(vargs);
  }
}

const loadingData: Counts = {
  _region: undefined,
  all: -1,
  troubled: -1,
  critical: -1,
};

const sampleData: Counts = {
  _region: undefined,
  all: 25,
  troubled: 10,
  critical: 2,
};
