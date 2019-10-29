/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Component, OnInit } from '@angular/core';

import { HttpClient } from './shared/http-client';
import { LocationService } from './shared/location.service';
import { RealtimeDeviceDataProviderService } from './shared/realtime-device-manager.service';
import { DriverBehaviorService } from './shared/iota-driver-behavior.service';
import { EventService } from './shared/iota-event.service';
import { GeofenceService } from './shared/iota-geofence.service';
import { POIService } from './shared/iota-poi.service';
import { AssetService } from './shared/iota-asset.service';
import { AlertService } from './shared/alert.service';

@Component({
  selector: 'fmdash-app',
  moduleId: module.id,
  templateUrl: 'app.component.html',
  providers: [HttpClient, RealtimeDeviceDataProviderService, LocationService, EventService, GeofenceService, POIService, AssetService, DriverBehaviorService, AlertService]
})
export class AppComponent {
  title = "IBM IoT Connected Vehicle Insights - Fleet Management Starter Application - Monitoring";
  sidebarItems = [
    { title: "Map", route: "map", icon: 'icon-location', active: false },
    { title: "Car Status", route: "carStatus", icon: "icon-car", active: false },
    { title: "Alert", route: "alert", icon: "icon-idea", active: false },
    { title: "Vehicle", route: "vehicle", icon: 'icon-car', active: false },
    { title: "Control", route: "tool", icon: 'icon-location', active: false },
    { title: "Settings", route: "settings", icon: "icon-manage", active: false }
  ];
  menuOpened = false;

  constructor() {
  }

  ngOnInit() {
    /*   ===   Navigation on smaller screens   ===   */
    var menuButton = document.getElementById('menuButton');
    var sidebar = document.getElementById('sidebar');
    var mainContent = document.getElementById('mainContent');

    var self = this;
    menuButton.onclick = function (e) {
      e.preventDefault();

      if (!self.menuOpened) {
        menuButton.classList.add('hamburgerClicked');
        sidebar.classList.add('menu-open');
        mainContent.classList.add('menu-open');

        self.menuOpened = true;
      } else {
        menuButton.classList.remove('hamburgerClicked');
        sidebar.classList.remove('menu-open');
        mainContent.classList.remove('menu-open');

        self.menuOpened = false;
      }
    };

    var modalCalls = document.querySelectorAll('.em-Modal-Call');
    var modalCallsArray = Array.prototype.slice.call(modalCalls, 0);

    modalCallsArray.forEach(function (el) {
      if (document.getElementById(el.rel)) {
        el.onclick = function (e) {
          e.preventDefault();

          document.body.style.overflowY = "hidden";

          document.getElementById(el.rel).classList.add('em-Modal-show');
          document.getElementById(el.rel).querySelector('.em-Modal-Content').classList.add('em-Modal-Content-show');
          document.getElementById(el.rel).querySelector('.em-Modal-Close').classList.add('em-Modal-Close-show');

          var close = function (event?) {
            if (event) {
              event.preventDefault();
            }

            document.body.style.overflowY = "scroll";

            document.getElementById(el.rel).querySelector('.em-Modal-Close').classList.remove('em-Modal-Close-show');
            document.getElementById(el.rel).classList.remove('em-Modal-show');
            document.getElementById(el.rel).querySelector('.em-Modal-Content').classList.remove('em-Modal-Content-show');
          };

          document.onkeydown = function (event: any) {
            event = event || window.event;
            if (event.keyCode == 27) {
              close();
            }
          };

          document.getElementById(el.rel).querySelector('.em-Modal-Content .em-Modal-Close').addEventListener("click", close);

          Array.prototype.slice.call(document.querySelectorAll('.em-Modal-Content ul.modalMenu a'), 0).forEach(function (modalLink) {
            modalLink.addEventListener("click", close);
          });
        };
      }
    });
  }
}
