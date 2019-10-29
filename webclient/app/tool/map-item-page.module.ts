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
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpModule } from '@angular/http';
import { UtilsModule } from '../utils/utils.module';

import { ItemMapComponent } from './item-map/item-map.component';
import { ItemToolComponent } from './item-tool/item-tool.component';
import { MapItemPageComponent } from './map-item-page.component';

import { routing } from './map-item-page.routing';

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
    ItemMapComponent,
    ItemToolComponent,
    MapItemPageComponent
  ],
  exports: [
    MapItemPageComponent,
  ],
  providers: []
})
export class MapItemPageModule { }
