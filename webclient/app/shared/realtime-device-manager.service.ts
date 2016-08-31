import { Injectable } from '@angular/core';

import { RealtimeDeviceDataProvider } from './realtime-device';

@Injectable()
export class RealtimeDeviceDataProviderService {
  provider = new RealtimeDeviceDataProvider();

  constructor() {  }

  getProvider(){
    return this.provider;
  }
}
