import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AlertPageComponent } from './alert-page.component';

const routes: Routes = [
  {
    path: 'alert',
    component: AlertPageComponent
  }
];

export const routing: ModuleWithProviders = RouterModule.forChild(routes);
