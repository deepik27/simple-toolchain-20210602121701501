import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MapPageComponent } from './map-page.component';

const routes: Routes = [
  {
    path: 'map',
    component: MapPageComponent
  }
];

export const routing: ModuleWithProviders = RouterModule.forChild(routes);
