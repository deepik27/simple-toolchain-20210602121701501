import './shared/rxjs-extensions';

import { Component, OnInit } from '@angular/core';
import { ROUTER_PROVIDERS, Routes, ROUTER_DIRECTIVES, Router } from '@angular/router';

import { MapPageComponent } from './map/map-page.component';
import { AlertPageComponent } from './alert/alert-page.component';
import { UsersPageComponent } from './users/users-page.component';
import { VehiclePageComponent } from './vehicle/vehicle-page.component';

@Component({
  selector: 'fmdash-app',
  moduleId: module.id,
  templateUrl: 'app.component.html',
  directives: [ROUTER_DIRECTIVES],
  providers: [ROUTER_PROVIDERS]
})
@Routes([
  {path:'/',        component: MapPageComponent},
  {path:'/alert',   component: AlertPageComponent},
  {path:'/users',   component: UsersPageComponent},
  {path:'/vehicle', component: VehiclePageComponent},
])
export class AppComponent {
  title = "My App";
  sidebarItems = [
           { title: "Map", route: "/", icon: 'icon-location', active: false },
           { title: "Alert", route: "/alert", icon: "icon-idea", active: false},
//           { title: 'Users', route: '/users', icon: 'icon-user', active: false},
//           { title: "Vehicle", route: "/vehicle", icon: 'icon-car', active: false }
       ];

  constructor(public router: Router){
    this.router
  }

  isRouteActive(commands: any[]): boolean {
    //return this.router.createUrlTree(commands).contains(this.router.urlTree)
    let route = this.router.createUrlTree(commands);
    let lhs = this.router.serializeUrl(this.router.urlTree);
    let rhs = this.router.serializeUrl(route);
    if(rhs === '' || lhs === ''){
      return lhs === rhs;
    }
    return lhs.startsWith(rhs);
  }
}
