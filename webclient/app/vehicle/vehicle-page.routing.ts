import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VehiclePageComponent } from './vehicle-page.component';

const routes: Routes = [
  {
    path: 'vehicle',
    component: VehiclePageComponent
  }
];

export const routing: ModuleWithProviders = RouterModule.forChild(routes);
