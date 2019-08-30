/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
import { ModuleWithProviders } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CarStatusSummaryComponent } from './summary/car-status-summary.component';
import { CarStatusComponent } from './car-status.component';
import { CarStatusPageComponent } from './car-status-page.component';

const carStatusRoutes: Routes = [
  {
    path: 'carStatus',
    component: CarStatusPageComponent,
    children: [
      { path: '', component: CarStatusSummaryComponent },
      { path: ':mo_id', component: CarStatusComponent }
    ]
  }
];

export const carStatusRouting: ModuleWithProviders = RouterModule.forChild(carStatusRoutes);
