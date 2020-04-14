/**
 * Copyright 2016,2020 IBM Corp. All Rights Reserved.
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
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { MapPageModule } from './map/map-page.module';
import { CarStatusPageModule } from './car-status/car-status-page.module';
import { AlertPageModule } from './alert/alert-page.module';
import { VehiclePageModule } from './vehicle/vehicle-page.module';
import { ControlPageModule } from './control/control-page.module';
import { SettingsPageModule } from './settings/settings-page.module';
import { SimulatorPageModule } from './simulator/simulator-page.module';

import { routing, appRoutingProviders } from './app.routing';

import { APP_CONFIG, DEFAULT_APP_CONFIG } from './app-config';

import { LocationService } from './shared/location.service';
import { RealtimeDeviceDataProviderService } from './shared/realtime-device-manager.service';
import { CarStatusDataService } from './car-status/summary/car-status-data.service';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    routing,
    MapPageModule, CarStatusPageModule, AlertPageModule, VehiclePageModule, ControlPageModule, SettingsPageModule, SimulatorPageModule
  ],
  declarations: [
    AppComponent,
  ],
  providers: [
    appRoutingProviders,
    { provide: APP_CONFIG, useValue: DEFAULT_APP_CONFIG },
    LocationService, RealtimeDeviceDataProviderService, CarStatusDataService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
