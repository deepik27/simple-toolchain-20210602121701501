/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
import { Component } from '@angular/core';

import { CarStatusDataService } from './summary/car-status-data.service';
import { LocationService, MapArea } from '../shared/location.service';

import { RealtimeDeviceDataProviderService } from '../shared/realtime-device-manager.service';

@Component({
  moduleId: module.id,
  selector: 'fmdash-car-status-page',
  templateUrl: 'car-status-page.component.html',
  providers: [CarStatusDataService],
})
export class CarStatusPageComponent {
}
