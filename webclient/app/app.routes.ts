import { provideRouter, RouterConfig } from '@angular/router';

import { MapPageComponent } from './map/map-page.component';
import { UsersPageComponent } from './users/users-page.component';
import { VehiclePageComponent } from './vehicle/vehicle-page.component';

//xxx
//

const routes: RouterConfig = [
  {
    path: '',
    redirectTo: '/map',
    pathMatch: 'full'
  },
  {
    path: 'map',
    component: MapPageComponent
  },
  {
    path: 'users',
    component: UsersPageComponent
  },
  {
    path: 'vehicle',
    component: VehiclePageComponent
  },
];

export const appRouterProviders = [
  provideRouter(routes)
];
