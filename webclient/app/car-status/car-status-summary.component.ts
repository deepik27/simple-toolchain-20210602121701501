import { Component, OnInit } from '@angular/core';
import { ROUTER_PROVIDERS, Routes, ROUTER_DIRECTIVES, Router } from '@angular/router';

@Component({
  moduleId: module.id,
  selector: 'fmdash-car-status-summary',
  templateUrl: 'car-status-summary.component.html',
  directives: [ROUTER_DIRECTIVES],
})
export class CarStatusSummaryComponent implements OnInit {
  constructor() {  }

  ngOnInit() {}
}
