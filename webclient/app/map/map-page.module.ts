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
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { UtilsModule } from '../utils/utils.module';

import { MapPageRoutingModule } from './map-page-routing.module';
import { RealtimeMapComponent } from './realtime-map/realtime-map.component';
import { NumberOfCarsComponent } from './number-of-cars/number-of-cars.component';
import { MapPageComponent } from './map-page.component';


@NgModule({
  declarations: [RealtimeMapComponent, NumberOfCarsComponent, MapPageComponent],
  imports: [
    CommonModule,
    BrowserModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
    UtilsModule,
    MapPageRoutingModule
  ],
  exports: [
    MapPageComponent
  ]
})
export class MapPageModule { }
