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
import { Component, EventEmitter, AfterContentInit, Input, Output, ViewChild } from '@angular/core';

import { CarStatusDataService } from './car-status-data.service';
import { distinctUntilChanged } from 'rxjs/operators';

import * as c3 from 'c3';
import * as d3 from 'd3';
import * as _ from 'underscore';
import * as Chance from 'chance';
import { ThrowStmt } from '@angular/compiler';

@Component({
  selector: 'fmdash-chart-item',
  templateUrl: 'chart-item.component.html',
})
export class ChartItemComponent implements AfterContentInit {
  @Input() title: string;
  @Input() chartType = 'donut';
  @Input() chartRotated: string;
  @Input() aggrKey: string;
  @Output() selectionChange = new EventEmitter<any>();
  @ViewChild('chartDiv', {static: false}) chartDiv;

  private chance = new Chance();
  chartId = 'chart_' + (Math.floor(this.chance.floating({min: 0, max: 1}) * 1000000000));

  private chartSelector: string;
  private chart: c3.ChartAPI;

  private dataSubscription;

  constructor(
    private carStatusData: CarStatusDataService
  ) {
    this.chartSelector = '#' + this.chartId;
  }

  ngAfterContentInit() {
    //    var e = this.chartDiv.nativeElement
    var opts = {
      bindto: this.chartSelector,
      data: {
        columns: [],
        type: this.chartType,
        order: null,
        selection: { enabled: false },
        // onselected: (d => {
        //   // console.log(d)
        //   // var allSelected = <any>this.chart.selected();          console.log(allSelected);
        //   // var toDeselect = allSelected.filter(sel => sel !== d).map(sel => sel.id);
        //   // this.chart.unselect(toDeselect);
        //   this.selectionChange.emit({key: this.aggrKey, value: d.id});
        // }),
        // onunselected: (d => {
        //   this.selectionChange.emit({key: this.aggrKey, value: null});
        // }),
        onclick: (d => {
          this.selectionChange.emit({ key: this.aggrKey, value: d.id });
        }),
      },
      color: {
        pattern: ['#f05153', '#f67734', '#58a946', '#3774ba', '#01b39e']
      },
      axis: {
        rotated: (this.chartRotated === 'true'),
      },
    };
    if (this.chartType === 'donut') {
      (<any>opts).donut = {
        title: this.title,
      };
    }
    setTimeout(() => {
      this.chart = c3.generate(opts);
      this.chart.loaddata = this.chart.load;
      // keep sending data
      this.dataSubscription = this.carStatusData.getColumns(this.aggrKey)
        .pipe(distinctUntilChanged((x, y) => _.isEqual(x, y)))
        .subscribe(data => {
//          const array = data as Array<[string, ...c3.PrimitiveArray]>;
          const array = data as Array<[]>;
          this.chart.loaddata({ columns: array });
        });
    }, 100);

  }

  ngOnDestroy() {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
      this.dataSubscription = null;
    }
  }
}
