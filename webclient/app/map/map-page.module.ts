/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { RouterModule } from '@angular/router';

import { UtilsModule } from '../utils/utils.module';

import { NumberOfCarsComponent } from './number-of-cars/number-of-cars.component';
import { RealtimeMapComponent } from './realtime-map/realtime-map.component';
import { MapPageComponent } from './map-page.component';

import { routing } from './map-page.routing';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    RouterModule,
    HttpModule,
    UtilsModule,
    routing,
  ],
  declarations: [
    NumberOfCarsComponent,
    RealtimeMapComponent,
    MapPageComponent
  ],
  exports: [
    MapPageComponent,
  ],
})
export class MapPageModule { }
