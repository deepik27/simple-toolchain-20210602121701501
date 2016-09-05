import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import { RealtimeDeviceData, RealtimeDeviceDataProvider } from '../../shared/realtime-device';
import { RealtimeDeviceDataProviderService } from '../../shared/realtime-device-manager.service';

import * as _ from 'underscore';

export interface StatusGroup {
  label: string,
  predicate: (RealtimeDeviceData) => boolean,
}

var fuelStatusGroups = [
  {label: 'Low', predicate: (device => (device.latestSample.props.fuel < 5))},
  {label: 'Less than half', predicate: (device => (device.latestSample.props.fuel < 25))},
  {label: 'No issue', predicate: (device => true)}
];

var engineTempStatusGroups = [
  {label: 'Over heated', predicate: (device => (device.latestSample.props.engineTemp >= 310))},
  {label: 'High', predicate: (device => (device.latestSample.props.engineTemp >= 300))},
  {label: 'No issue', predicate: (device => true)}
];

@Injectable()
export class CarStatusDataService {
  realtimeDeviceDataProvider: RealtimeDeviceDataProvider;

  constructor(realtimeDataProviderService: RealtimeDeviceDataProviderService ) {
    this.realtimeDeviceDataProvider = realtimeDataProviderService.getProvider();
  }

  private getDevicesByConds(conds: StatusGroup[], interval = 1): Observable<any> {
    return Observable.interval(interval * 1000).startWith(0)
      .map(x => {
        let devices = this.realtimeDeviceDataProvider.getDevices();
        let devicesByLabel  = _.groupBy(this.realtimeDeviceDataProvider.getDevices(), device => {
              for(var i=0; i<conds.length; i++){
                if (!conds[i].predicate || conds[i].predicate(device)){
                    return conds[i].label;
                }
              }
              return undefined;
            });
        return devicesByLabel;
      });
  }

  private getCondsFromType(type: string){
    if(type === 'fuel'){
      return fuelStatusGroups;
    }else if (type === 'engineTemp'){
      return engineTempStatusGroups;
    }
    return null;
  }

  getColumns(type: string, interval = 1): Observable<any[][]>{
    let conds = this.getCondsFromType(type);
    return this.getDevicesByConds(conds, interval)
    .map(devicesByLabel => {
      var result = [];
      for (var i=0; i<conds.length; i++){
        let label = conds[i].label;
        let devices = devicesByLabel[label];
        result.push([label, (devices ? devices.length : 0) + 0]);
      }
      return result;
    });
  }

  getDevices(type: string, selection: string, interval = 1): Observable<RealtimeDeviceData[]> {
    let conds = this.getCondsFromType(type);
    return this.getDevicesByConds(conds, interval)
      .map(devicesByLabel => {
        let r = devicesByLabel[selection];
        return r ? r : [];
      });
  }
}