import { Component, AfterContentInit, Input, ViewChild, ContentChild } from '@angular/core';

import { RealtimeDeviceData, RealtimeDeviceDataProvider } from '../../shared/realtime-device';
import { CarStatusDataService } from './car-status-data.service';

import * as c3 from 'c3';

@Component({
  moduleId: module.id,
  selector: 'fmdash-chart-item',
  templateUrl: 'chart-item.component.html',
  providers: [CarStatusDataService]
})
export class ChartItemComponent implements AfterContentInit {
  @Input() title: string;
  @Input() chartType = 'donut';
  @Input() chartRotated: string;
  @Input() aggrKey: string;
  @ViewChild('chartDiv') chartDiv;

  private chartId = 'chart_' + (Math.floor(Math.random() * 1000000000));

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
      },
      color: {
        pattern: ['#f05153','#f67734','#58a946', '#3774ba', '#01b39e']
      },
      axis: {
        rotated: (this.chartRotated === 'true'),
      },
    };
    if (this.chartType === 'donut'){
      (<any>opts).donut = {
        title: this.title,
      };
    }
    setTimeout(() => {
      this.chart = c3.generate(opts);
    }, 100);

    // keep sending data
    this.dataSubscription = this.carStatusData.getColumns(this.aggrKey)
      .distinctUntilChanged((x, y) => _.isEqual(x, y))
      .subscribe(data => {
        this.chart.load({columns: data});
      });
  }

  ngOnDestroy() {
    if(this.dataSubscription){
      this.dataSubscription.unsubscribe();
      this.dataSubscription = null;
    }
  }

  private refresh(data){

    // update chart
    this.chart.load({
      columns: data.columns,
    });

    // update title
    if (this.chartType === 'donut'){
      let sel = d3.select(this.chartSelector + ' .c3-chart-arcs-title');
      (<any>sel.node()).innerHTML = 'Avg: ' + parseFloat(data.average).toFixed(1);
      sel.attr('fill', '#3a6284');
      sel.style('padding-top', '6px');
      sel.style('font-size', '24px');
      sel.style('font-weight', '500');
    }
  }




}
