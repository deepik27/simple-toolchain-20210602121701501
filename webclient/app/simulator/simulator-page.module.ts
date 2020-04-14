/**
 * Copyright 2020 IBM Corp. All Rights Reserved.
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
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { UtilsModule } from '../utils/utils.module';

import { SimulatorPageRoutingModule } from './simulator-page-routing.module';
import { SimulatorControlComponent } from './simulator-control/simulator-control.component';
import { SimulatorNavigationComponent } from './simulator-navigation/simulator-navigation.component';
import { SimulatorVehicleListComponent } from './simulator-vehicle-list/simulator-vehicle-list.component';
import { SimulatorPageComponent } from './simulator-page.component';


@NgModule({
  declarations: [SimulatorControlComponent, SimulatorNavigationComponent, SimulatorVehicleListComponent, SimulatorPageComponent],
  imports: [
    CommonModule,
    BrowserModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
    UtilsModule,
    SimulatorPageRoutingModule
  ]
})
export class SimulatorPageModule { }
