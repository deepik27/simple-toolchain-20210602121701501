import { Injectable } from '@angular/core';

import { AnimatedDeviceManager } from './animated-device';

@Injectable()
export class AnimatedDeviceManagerService {
  manager = new AnimatedDeviceManager();

  constructor() {  }

  getManager(){
    return this.manager;
  }
}
