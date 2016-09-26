import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MapPageComponent } from './map/map-page.component';
import { CarStatusPageComponent } from './car-status/car-status-page.component';
import { AlertPageComponent } from './alert/alert-page.component';
import { VehiclePageComponent } from './vehicle/vehicle-page.component';
import { MapItemPageComponent } from './tool/map-item-page.component';

const appRoutes: Routes = [
  {
    path: '',
    redirectTo: '/map',
    pathMatch: 'full'
  },
];

export const appRoutingProviders: any[] = [
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);
