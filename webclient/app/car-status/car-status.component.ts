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
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

import { Subject, of } from 'rxjs'
import { switchMap } from 'rxjs/operators';

import { RealtimeDeviceData } from '../shared/realtime-device';
import { RealtimeDeviceDataProviderService } from '../shared/realtime-device-manager.service';
import { CarStatusDataService } from './summary/car-status-data.service';
import { DriverBehaviorService } from '../shared/iota-driver-behavior.service';

import * as _ from 'underscore';

@Component({
  moduleId: module.id,
  selector: 'fmdash-car-status',
  templateUrl: 'car-status.component.html',
  styleUrls: ['car-status.component.css'],
})
export class CarStatusComponent implements OnInit {
  private mo_id: string;
  private moIdSubject = new Subject<string>();
  private proveDataSubscription;

  private device: RealtimeDeviceData;
  private probeData: any; // probe data to show
  private isAnalysisAvailable: boolean = false;
  private realtimeMode: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private carStatusDataService: CarStatusDataService,
    private realtimeDataProviderService: RealtimeDeviceDataProviderService,
    private driverBehaviorService: DriverBehaviorService
  ) {
  }

  ngOnInit() {
    var self = this;
    this.driverBehaviorService.isAvailable().subscribe(data => {
      if (data) {
        this.isAnalysisAvailable = true;
      }
    });
    this.proveDataSubscription = this.moIdSubject.pipe(switchMap(mo_id => {
      // Start watching car probe of the vehicle. This method will monitor the car probe of the vehicle from whole world.
      // It may result slow performance of querying car probe as the searching area is too large.
      this.realtimeDataProviderService.startTracking(mo_id);
        return mo_id ? this.carStatusDataService.getProbe(mo_id) : of([]);
      })).subscribe(probe => {
      // update data
      this.device = probe && this.realtimeDataProviderService.getProvider().getDevice(probe.mo_id);
      this.probeData = probe;

      // update overlay
      var cardOverlay = document.getElementById('cardOverlay');
      if (cardOverlay) {
        if (probe == null && cardOverlay.style.opacity != '1') {
          cardOverlay.style.opacity = '1';
          cardOverlay.style.display = 'block';
        } else if (probe != null && cardOverlay.style.opacity != '0') {
          cardOverlay.style.opacity = '0';
          cardOverlay.style.display = 'none';
        }
      }
    });

    var mo_id: any;
    this.route.params.forEach((params: Params) => {
      mo_id = mo_id || params['mo_id'];
    });
    this.mo_id = <string>mo_id;
    this.moIdSubject.next(mo_id);

    var modalCallsArray = Array.prototype.slice.call(document.querySelectorAll('.numCounter'), 0);

    modalCallsArray.forEach(function (el) {
      console.log(el.innerHTML);

      var number = parseInt(el.innerHTML);
      var delay = number;

      // 1500 is animation duration in milliseconds (1.5s)
      var delayAccum = 1500 / el.innerHTML;
      var accum = 1;

      for (var i = 0; i < number; ++i) {
        doSetTimeout(delay, el, accum);

        accum += 1;
        delay = delay + delayAccum;
      }
    });

    function doSetTimeout(delay, el, accum) {
      setTimeout(function () {
        el.innerHTML = accum;
      }, delay);
    }
  }

  ngOnDestroy() {
    if (this.proveDataSubscription) {
      this.proveDataSubscription.unsubscribe();
      this.proveDataSubscription = null;
    }
  }

  setRealtimeMode(mode: boolean) {
    this.realtimeMode = mode;
  }
}
