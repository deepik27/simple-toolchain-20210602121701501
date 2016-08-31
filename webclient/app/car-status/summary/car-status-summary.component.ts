import { Component, OnInit } from '@angular/core';
import { ROUTER_PROVIDERS, Routes, ROUTER_DIRECTIVES, Router } from '@angular/router';

import { ChartItemComponent } from './chart-item.component'

@Component({
  moduleId: module.id,
  selector: 'fmdash-car-status-summary',
  templateUrl: 'car-status-summary.component.html',
  directives: [ROUTER_DIRECTIVES, ChartItemComponent],
})
export class CarStatusSummaryComponent implements OnInit {
  constructor() {  }

  ngOnInit() {}
}
