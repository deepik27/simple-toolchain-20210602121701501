import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CarStatusSummaryComponent } from './summary/car-status-summary.component';
import { CarStatusComponent } from './car-status.component';
import { CarStatusPageComponent } from './car-status-page.component';

const carStatusRoutes: Routes = [
  {
    path: 'carStatus',
    component: CarStatusPageComponent,
    children: [
      { path: '',  component: CarStatusSummaryComponent },
      { path: ':mo_id', component: CarStatusComponent }
    ]
  }
];

export const carStatusRouting: ModuleWithProviders = RouterModule.forChild(carStatusRoutes);
