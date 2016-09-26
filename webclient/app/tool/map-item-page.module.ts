import { NgModule }       from '@angular/core';
import { BrowserModule }  from '@angular/platform-browser';
import { FormsModule }    from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpModule }    from '@angular/http';
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
export class MapItemPageModule {}
