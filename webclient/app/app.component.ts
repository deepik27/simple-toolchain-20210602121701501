import './shared/rxjs-extensions';

import { Component, OnInit } from '@angular/core';
import { ROUTER_PROVIDERS, Routes, ROUTER_DIRECTIVES, Router } from '@angular/router';

import { MapPageComponent } from './map/map-page.component';
import { CarStatusPageComponent } from './car-status/car-status-page.component';
import { AlertPageComponent } from './alert/alert-page.component';
import { UsersPageComponent } from './users/users-page.component';
import { VehiclePageComponent } from './vehicle/vehicle-page.component';

import { LocationService } from './shared/location.service';
import { RealtimeDeviceDataProviderService } from './shared/realtime-device-manager.service';

@Component({
  selector: 'fmdash-app',
  moduleId: module.id,
  templateUrl: 'app.component.html',
  directives: [ROUTER_DIRECTIVES],
  providers: [ROUTER_PROVIDERS, RealtimeDeviceDataProviderService, LocationService]
})
@Routes([
  {path:'/',          component: MapPageComponent},
  {path:'/map',       component: MapPageComponent},
  {path:'/carStatus', component: CarStatusPageComponent},
  {path:'/alert',     component: AlertPageComponent},
  {path:'/users',     component: UsersPageComponent},
  {path:'/vehicle',   component: VehiclePageComponent},
])
export class AppComponent {
  title = "My App";
  sidebarItems = [
           { title: "Map", route: "/", icon: 'icon-location', active: false },
           { title: "Car Status", route: "/carStatus", icon: "icon-car", active: false},
           { title: "Alert", route: "/alert", icon: "icon-idea", active: false},
//           { title: 'Users', route: '/users', icon: 'icon-user', active: false},
           { title: "Vehicle", route: "/vehicle", icon: 'icon-car', active: false }
       ];

  constructor(public router: Router){
  }

  isRouteActive(commands: any[]): boolean {
    //return this.router.createUrlTree(commands).contains(this.router.urlTree)
    let route = this.router.createUrlTree(commands);
    let lhs = this.router.serializeUrl(this.router.urlTree);
    let rhs = this.router.serializeUrl(route);
    if(rhs === '' || lhs === ''){
      return lhs === rhs || (rhs === '' && lhs.indexOf('/map') === 0);
    }
    return lhs.startsWith(rhs);
  }

  ngOnInit() {
    /*   ===   Navigation on smaller screens   ===   */
    var modalCalls = document.querySelectorAll('.em-Modal-Call');
    var modalCallsArray = Array.prototype.slice.call(modalCalls, 0);

    modalCallsArray.forEach(function(el) {
        if (document.getElementById(el.rel)) {
            el.onclick=function(e){
                e.preventDefault();

                document.body.style.overflowY = "hidden";

                document.getElementById(el.rel).classList.add('em-Modal-show');
                document.getElementById(el.rel).querySelector('.em-Modal-Content').classList.add('em-Modal-Content-show');
                document.getElementById(el.rel).querySelector('.em-Modal-Close').classList.add('em-Modal-Close-show');

                var close = function(event?) {
                    if (event) {
                        event.preventDefault();
                    }

                    document.body.style.overflowY = "scroll";

                    document.getElementById(el.rel).querySelector('.em-Modal-Close').classList.remove('em-Modal-Close-show');
                    document.getElementById(el.rel).classList.remove('em-Modal-show');
                    document.getElementById(el.rel).querySelector('.em-Modal-Content').classList.remove('em-Modal-Content-show');
                    
                    document.querySelector('header').classList.remove('blur');
                    document.querySelector('.content').classList.remove('blur');
                };

                document.onkeydown = function(event: any) {
                    event = event || window.event;
                    if (event.keyCode == 27) {
                        close();
                    }
                };

                document.getElementById(el.rel).querySelector('.em-Modal-Content .em-Modal-Close').addEventListener("click", close);
                
                Array.prototype.slice.call(document.querySelectorAll('.em-Modal-Content ul.modalMenu a'), 0).forEach(function(modalLink) {
                    modalLink.addEventListener("click", close);
                });
                
                document.querySelector('header').classList.add('blur');
                document.querySelector('.content').classList.add('blur');
            };
        }
    });
  }
}
