import { NgModule }       from '@angular/core';
import { BrowserModule }  from '@angular/platform-browser';
import { FormsModule }    from '@angular/forms';
import { HttpModule }    from '@angular/http';
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
export class MapPageModule {}
