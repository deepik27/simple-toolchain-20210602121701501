import { ModuleWithProviders }  from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { MapItemPageComponent } from "./map-item-page.component";

const routes: Routes = [
  {
    path: "tool",
    component: MapItemPageComponent
  }
];

export const routing: ModuleWithProviders = RouterModule.forChild(routes);
