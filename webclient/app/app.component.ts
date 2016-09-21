import './shared/rxjs-extensions';

import { Component, OnInit } from '@angular/core';

import { LocationService } from './shared/location.service';
import { RealtimeDeviceDataProviderService } from './shared/realtime-device-manager.service';
import { EventService } from './shared/iota-event.service';
import { GeofenceService } from './shared/iota-geofence.service';

@Component({
  selector: 'fmdash-app',
  moduleId: module.id,
  templateUrl: 'app.component.html',
  providers: [RealtimeDeviceDataProviderService, LocationService, EventService, GeofenceService]
})
export class AppComponent {
  title = "IoT for Automotive Starter - Monitoring";
  sidebarItems = [
           { title: "Map", route: "map", icon: 'icon-location', active: false },
           { title: "Car Status", route: "carStatus", icon: "icon-car", active: false},
           { title: "Alert", route: "alert", icon: "icon-idea", active: false},
           { title: "Vehicle", route: "vehicle", icon: 'icon-car', active: false }
       ];

  constructor(){
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
