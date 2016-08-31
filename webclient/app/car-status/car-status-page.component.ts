import { Component, OnInit } from '@angular/core';
import { ROUTER_PROVIDERS, Routes, ROUTER_DIRECTIVES, Router } from '@angular/router';

import { CarStatusSummaryComponent } from './summary/car-status-summary.component';
import { CarStatusComponent } from './car-status.component';

@Component({
  moduleId: module.id,
  selector: 'fmdash-car-status-page',
  template: `
    <div class="container-50 noTopPadding">
      <h4>Car Status</h4>
      <router-outlet></router-outlet>
    </div>`,
    directives: [ROUTER_DIRECTIVES],
})
@Routes([
  {path:'/',       component: CarStatusSummaryComponent},
  {path:'/:mo_id', component: CarStatusComponent},
])
export class CarStatusPageComponent implements OnInit {
  constructor() {  }

  ngOnInit() {}
}
