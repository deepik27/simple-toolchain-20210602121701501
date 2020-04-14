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
import { Component, Input, OnInit, OnDestroy } from '@angular/core';

import { interval } from 'rxjs';
import { map, startWith, delay } from 'rxjs/operators';

@Component({
  selector: 'status-hist-graph',
  template: `
  <div class="row noOffsetRow">
    <div class="column-4-med">
      <div class="value-container">
        <div class="value-item">{{title}}</div>
        <div class="value-item"><strong class="carStatus-strong" [ngClass]="lastStatusClass">{{lastValue}}{{valueSuffix}}</strong>{{valueUnit}}</div>
      </div>
    </div>
    <div class="column-8-med">
      <div class="graph-container">
        <div *ngFor="let item of items; let i = index;"
          class="graph-bar"
          [ngClass]="item.statusClass"
          [style.left]="(100 * (i - 1) / historyCount) + '%'"
          [style.width]="(100 / historyCount) + '%'">
          <div [style.height]="(item.ratio*100 + 1) + '%'"></div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .value-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      /* safari */
      display: -webkit-flex;
      -webkit-flex-direction: column;
      -webkit-justify-content: space-between;
    }
    .value-container .value-item {
      margin-bottom: 20px;
    }
    .graph-container {
      background-color: #f8f8f8;
      position: relative;
      overflow: hidden;
      overflow-x: hidden;
      width: 100%;
      height: 150px;
    }
    .graph-container .graph-bar {
      position: absolute;
      top: 0px;
      bottom: 0px;
      align: center;
      -moz-transition:    all 0.5s linear;
      -webkit-transition: all 0.5s linear;
      transition:         all 0.5s linear;
    }
    .graph-container .graph-bar div {
      position: absolute;
      bottom: 0px;
      width: 50%;
      margin-left: 25%;
      background: #666666;
    }
    .graph-container .graph-bar.blue div {
      background: #3774ba;
    }
    .graph-container .graph-bar.green div {
      background: #58a946;
    }
    .graph-container .graph-bar.orange div {
      background: #f67734;
    }
    .graph-container .graph-bar.red div {
      background: #f05153;
    }
    .graph-container .graph-bar.inactive {
      width: 0px;
    }
    .graph-container .graph-bar.inactive div {
      width: 0px;
      height: 0px;
    }
  `],
  providers: [],
})
export class StatusHistoryGrahpComponent implements OnInit, OnDestroy {
  @Input() minValue = 0;
  @Input() maxValue = 100;
  @Input() interval = 2000;
  @Input() title: string;
  @Input() valueSuffix: string;
  @Input() valueUnit: string;
  @Input() historyCount = 20;

  @Input() value: number;
  @Input() alertLevel: string; // either 'critical', 'troubled', or 'normal'

  items: BarItem[] = null;
  lastValue: any = '-';
  lastStatusClass = {};

  private subscription;

  ngOnInit() {
    // initialize items
    this.items = [];
    let now = Date.now();
    for (let i = 0; i <= this.historyCount + 1; i++) {
      this.items.push({ ts: now - this.historyCount + i - 1, ratio: 0, value: '-', statusClass: {}, active: i !== 0 });
    }

    this.subscription = interval(this.interval).pipe(startWith(-1), map(() => {
      var ratio = Math.max(0, Math.min(1, (this.value - this.minValue) / (this.maxValue - this.minValue)));
      var alertLevel = this.alertLevel;
      var statusClass = { red: alertLevel === 'critical', orange: alertLevel === 'troubled', green: alertLevel === 'normal', blue: undefined };
      statusClass.blue = (!statusClass.red && !statusClass.orange && !statusClass.green);
      let now = Date.now();
      this.lastValue = this.value;
      this.lastStatusClass = statusClass;
      let lastItem = this.items[this.items.length - 1];
      lastItem.ratio = ratio;
      lastItem.value = this.value;
      lastItem.statusClass = statusClass;
      lastItem.active = true;
      this.items.push({ ts: now, ratio: 0, value: 0, statusClass: statusClass, active: false });
      let firstItem = this.items[0];
      firstItem.active = false;
      this.items.shift();
    }), delay(Math.min(this.interval / 2, 500))).subscribe(() => {
      // start animation
    })
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}

interface BarItem {
  ts: number;
  ratio: number;
  value: any;
  statusClass: any;
  active: boolean;
}
