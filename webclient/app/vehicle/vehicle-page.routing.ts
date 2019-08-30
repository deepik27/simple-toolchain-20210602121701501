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

import { VehiclePageComponent } from './vehicle-page.component';

const routes: Routes = [
  {
    path: 'vehicle',
    component: VehiclePageComponent
  }
];

export const routing: ModuleWithProviders = RouterModule.forChild(routes);
