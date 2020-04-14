/**
 * Copyright 2016,2020 IBM Corp. All Rights Reserved.
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
import { Component, Input, OnInit, OnDestroy, AfterContentInit, ViewChild, OnChanges, SimpleChange } from '@angular/core';

import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'status-meter',
  template: `
  <div class="row">
    <div class="column-6-med">
      <div class="row noOffsetRow">
        <div class="column-6-med">{{title}}</div>
        <div class="column-6-med">
          <strong class="carStatus-strong"
              [ngClass]="statusClassObj">
            <span class="numCounter">{{value}}</span>{{valueSuffix}}
          </strong>
          <br *ngIf="valueUnit" />{{valueUnit}}
        </div>
      </div>
    </div>
    <div class="column-6-med">
      <div class="speedometer-container" *ngIf="graphType==='gauge'">
        <div class="speedometer">
          <div class="pointer" id="speedometer-pointer" #speedometerDiv
              [ngClass]="statusClassObj"
              [style.transform]="'rotate(' + speedometerDeg + 'deg)'">
          </div>
          <div class="speedometer bottom-bar"></div>
        </div>
      </div>
      <div class="thermometer-container" *ngIf="graphType==='bar' || graphType==='temp-bar'">
          <ul class="thermometer">
              <li *ngFor="let i of thermometerTicks">
<!--                  <p class="frnh"><span *ngIf="graphType==='temp-bar'">{{(i * 1.8 + 32) | number}}</span></p>-->
                  <p class="cent">{{i}}</p>
              </li>
          </ul>
          <div class="thermometer-range" id="thermometer-range" #thermometerDiv
            [ngClass]="statusClassObj"
            [style.width]="thermometerPercent + '%'">
          </div>
      </div>
    </div>
  </div><!--end row-->
  `,
  providers: [],
})
export class StatusMeterComponent implements OnInit, OnDestroy, AfterContentInit, OnChanges {
  @Input() minValue: number;
  @Input() maxValue: number;
  @Input() tickStep = 30;
  @Input() title: string;
  @Input() valueSuffix: string;
  @Input() valueUnit: string;
  @Input() graphType = 'gauge'; // gauge or temp-bar

  @Input() value: number;
  @Input() alertLevel: string; // either 'critical', 'troubled', or 'normal'

  private barMinMaxAdjust = 2;
  private subject = new Subject<any>();
  private subscription;
  statusClassObj = {};
  speedometerDeg = -90;
  thermometerPercent = 10;
  thermometerTicks = [];

  @ViewChild('speedometerDiv', {static: false}) speedometerDiv;
  @ViewChild('thermometerDiv', {static: false}) thermometerDiv;

  constructor() {
  }

  ngOnInit() {
    // prepare ticks
    for (let i = this.minValue; i <= this.maxValue; i += this.tickStep) {
      this.thermometerTicks.push(i);
    }
  }

  ngAfterContentInit() {
    this.subscription = this.subject.pipe(debounceTime(100), distinctUntilChanged()).subscribe(value => {
      var gaugeDiv = (this.speedometerDiv && this.speedometerDiv.nativeElement);
      var barDiv = (this.thermometerDiv && this.thermometerDiv.nativeElement);
      if (gaugeDiv) {
        let ratio = (value.value - this.minValue) / (this.maxValue - this.minValue);
        ratio = Math.max(0, Math.min(1, ratio));
        this.speedometerDeg = Math.floor(ratio * 180 - 90);
        //gaugeDiv.style.transform = `rotate(${(ratio * 180 - 90).toFixed(0)}deg) !important`;
      }
      if (barDiv) {
        let ratio = (value.value - (this.minValue - this.barMinMaxAdjust)) / ((this.maxValue + this.barMinMaxAdjust) - (this.minValue - this.barMinMaxAdjust));
        ratio = Math.max(0, Math.min(1, ratio));
        this.thermometerPercent = Math.floor(ratio * 100);
        //barDiv.style.width = `${(ratio * 100).toFixed(0)}% !important`;
      }
      var alertLevel = value.alertLevel;
      var obj = { red: alertLevel === 'critical', orange: alertLevel === 'troubled', green: alertLevel === 'normal', blue: undefined };
      obj.blue = (!obj.red && !obj.orange && !obj.green);
      this.statusClassObj = obj;
    });
    this.fireChange();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  ngOnChanges(changes: { [key: string]: SimpleChange }) {
    // translates @Input(s) to observable subjects
    let newValueChange = changes['value'];
    let newStatusChange = changes['alertLevel'];
    if (newValueChange || newStatusChange) {
      this.fireChange();
    }
  }

  private fireChange() {
    this.subject.next({ value: this.value, alertLevel: this.alertLevel });
  }
}
