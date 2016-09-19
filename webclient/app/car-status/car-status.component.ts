import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import { RealtimeDeviceData } from '../shared/realtime-device';
import { RealtimeDeviceDataProviderService } from '../shared/realtime-device-manager.service';
import { CarStatusDataService } from './summary/car-status-data.service';

import * as _ from 'underscore';

@Component({
  moduleId: module.id,
  selector: 'fmdash-car-status',
  templateUrl: 'car-status.component.html',
})
export class CarStatusComponent implements OnInit {
  private mo_id: string;
  private moIdSubject = new Subject<string>();
  private proveDataSubscription;

  private device: RealtimeDeviceData;
  private probeData: any; // probe data to show

  constructor(
    private route: ActivatedRoute,
    private carStatusDataService: CarStatusDataService,
    private realtimeDataProviderService: RealtimeDeviceDataProviderService
  ){
  }

  ngOnInit() {
    this.proveDataSubscription = this.moIdSubject.switchMap(mo_id => {
        // in case the mo_id is not tracked, configure the service to track it
        if(!this.realtimeDataProviderService.getProvider().getDevice(mo_id)){
          this.realtimeDataProviderService.startTracking(mo_id);
        }
        return mo_id ? this.carStatusDataService.getProbe(mo_id) : Observable.of([]);
      }).subscribe(probe => {
        this.device = probe && this.realtimeDataProviderService.getProvider().getDevice(probe.mo_id);
        this.probeData = probe;

        // updat meter
        updateMeterStyle(probe);

        var cardOverlay = document.getElementById('cardOverlay');
        if (probe == null && cardOverlay.style.opacity != '1') {
            cardOverlay.style.opacity = '1';
        } else if (probe != null && cardOverlay.style.opacity != '0') {
            cardOverlay.style.opacity = '0';
        }
      });

    var mo_id: any;
    this.route.params.forEach((params: Params) => {
        mo_id = mo_id || params['mo_id'];
     });
    this.mo_id = <string>mo_id;
    this.moIdSubject.next(mo_id);

    var style;
    function updateMeterStyle(probe) {
      var createStyle = !style;
      if(createStyle){
        style = document.createElement('style');
        style.type = 'text/css';
      }

      //
      // Update style content
      //
      var fuel = (probe && probe.props.fuel) || 0;
      var engineTemp = (probe && probe.props.engineTemp) || 0;

      // set dynamic fuel level
      style.innerHTML = '.pointerTriggered { transform: rotate(' + ((fuel / 60) * 180 - 90) + 'deg) !important; }'

      // set dynamic engine oil temperature
      // - note that the "28" is 30 (the minimal gauge) - 2 (adjustment), and
      //   "152" is 150 (the maximum) + 2 (adjustment);
                      + '.thermometerTriggered { width: ' + (((engineTemp - 28) / (152 - 28)) * 100) + '% !important; }';

      if(createStyle){
        document.getElementsByTagName('head')[0].appendChild(style);
        setTimeout(function () {
            document.getElementById('speedometer-pointer').classList.add('pointerTriggered');
            document.getElementById('thermometer-range').classList.add('thermometerTriggered');
        }, 5);
      }
    }

    var modalCallsArray = Array.prototype.slice.call(document.querySelectorAll('.numCounter'), 0);

    modalCallsArray.forEach(function(el) {
            console.log(el.innerHTML);

            var number = parseInt(el.innerHTML);
            var delay = number;

            // 1500 is animation duration in milliseconds (1.5s)
            var delayAccum = 1500 / el.innerHTML;
            var accum = 1;

            for (var i=0; i < number; ++i) {
                    doSetTimeout(delay, el, accum);

                    accum += 1;
                    delay = delay + delayAccum;
            }
    });

    function doSetTimeout(delay, el, accum) {
      setTimeout(function() {
          el.innerHTML = accum;
      }, delay);
    }
  }

  ngOnDestroy(){
    if(this.proveDataSubscription){
      this.proveDataSubscription.unsubscribe();
      this.proveDataSubscription = null;
    }
  }
}
