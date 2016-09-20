import { NgModule }       from '@angular/core';
import { BrowserModule }  from '@angular/platform-browser';
import { FormsModule }    from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpModule }    from '@angular/http';
import { UtilsModule } from '../utils/utils.module';

import { VendorListComponent } from './vendor-list/vendor-list.component';
import { VehicleListComponent } from './vehicle-list/vehicle-list.component';
import { VehiclePageComponent } from './vehicle-page.component';

import { routing } from './vehicle-page.routing';

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
    VendorListComponent,
    VehicleListComponent,
    VehiclePageComponent
  ],
  exports: [
    VehiclePageComponent,
  ],
  providers: []
})
export class VehiclePageModule {}
