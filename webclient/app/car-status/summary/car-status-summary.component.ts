import { Component, OnInit } from '@angular/core';
import { ROUTER_PROVIDERS, Routes, ROUTER_DIRECTIVES, Router } from '@angular/router';

import { ChartItemComponent } from './chart-item.component'
import { CarListComponent } from './car-list.component'
import { CarStatusDataService } from './car-status-data.service';

@Component({
  moduleId: module.id,
  selector: 'fmdash-car-status-summary',
  templateUrl: 'car-status-summary.component.html',
  directives: [ROUTER_DIRECTIVES, ChartItemComponent, CarListComponent],
  providers: [CarStatusDataService],
})
export class CarStatusSummaryComponent implements OnInit {
  private selectedGroupingProp: string;
  private selectedGroupingLabel: string;

  constructor() {  }

  ngOnInit() {}

  chartSelectionChanged($event) {
    this.selectedGroupingProp = $event.key;
    this.selectedGroupingLabel = $event.value;
  }
}
