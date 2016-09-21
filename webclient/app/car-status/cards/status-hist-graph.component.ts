import { Component, Input, OnInit, OnDestroy } from '@angular/core';

@Component({
  moduleId: module.id,
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
        <div *ngFor="let item of items; trackBy:item?.ts"
          class="graph-bar"
          [ngClass]="item.statusClass"
          [class.inactive]="!item.active">
          <div [style.height]="(item.ratio*100 + 1) + '%'"></div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .value-container {
      height: 100%;
      display: -webkit-flex; /* Safari */
      -webkit-flex-direction: column; /* Safari */
      -webkit-justify-content: space-between; /* Safari */
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .value-container .value-item {
      margin-bottom: 20px;
    }
    .graph-container {
      background-color: #f8f8f8;
      display: table;
      table-layout: fixed;
      width: 100%;
      height: 150px;
    }
    .graph-container .graph-bar {
      display: table-cell;
      align: center;
      vertical-align: bottom;
      width: 100%;
      //-moz-transition:    all 1.5s cubic-bezier(0.455, 0.03, 0.515, 0.955);
      //-webkit-transition: all 1.5s cubic-bezier(0.455, 0.03, 0.515, 0.955);
      //transition:         all 1.5s cubic-bezier(0.455, 0.03, 0.515, 0.955);
    }
    .graph-container .graph-bar div {
      margin-left: 20%;
      margin-right: 20%;
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
  @Input() status: string; // either 'critical', 'troubled', or 'normal'

  private items: BarItem[] = null;
  private lastValue: any = '-';
  private lastStatusClass = {};

  private timer;

  private updateBarItem(ratio, value, statusClass) {
    let now = Date.now();
    if(!this.items){
      this.items = [];
      for(let i=0; i<this.historyCount; i++){
        this.items.push({ts: now - this.historyCount + i - 1, ratio: 0, value: '-', statusClass: statusClass, active: true});
      }
  //    this.items.push({ts: now - 1, ratio: 0, active: true});
    }
    this.items.shift();
//    this.items[0].active = false;
    this.items.push({ts: now, ratio: ratio, value: value, statusClass: statusClass, active: true});
  }

  ngOnInit(){
    let intervalFunc = () => {
      var ratio = Math.max(0, Math.min(1, (this.value - this.minValue) / (this.maxValue - this.minValue)));
      var status = this.status;
      var statusClass = {red: status==='critical', orange: status==='troubled', green: status==='normal', blue: undefined };
      statusClass.blue = (!statusClass.red && !statusClass.orange && !statusClass.green);
      this.updateBarItem(ratio, this.value, statusClass);
      this.lastValue = this.value;
      this.lastStatusClass = statusClass;
    };
    this.timer = setInterval(intervalFunc, this.interval);
    this.updateBarItem(0, 0, {});
    intervalFunc();
  }

  ngOnDestroy(){
    if(this.timer){
      clearInterval(this.timer);
      this.timer = null;
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
