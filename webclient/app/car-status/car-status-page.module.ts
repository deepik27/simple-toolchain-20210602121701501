import { NgModule }       from '@angular/core';
import { CommonModule }   from '@angular/common';
import { BrowserModule }  from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { FormsModule }    from '@angular/forms';

import { HttpModule }    from '@angular/http';
import { UtilsModule } from '../utils/utils.module';

import { CarStatusSummaryComponent } from './summary/car-status-summary.component';
import { CarListComponent } from './summary/car-list.component';
import { ChartItemComponent } from './summary/chart-item.component';
import { StatusMeterComponent } from './cards/status-meter.component';
import { StatusHistoryGrahpComponent } from './cards/status-hist-graph.component';
import { CarStatusComponent } from './car-status.component';
import { CarStatusPageComponent } from './car-status-page.component';

import { CarStatusDataService } from './summary/car-status-data.service';

import { carStatusRouting } from './car-status-page.routing';

@NgModule({
  imports: [
    CommonModule, BrowserModule, RouterModule, FormsModule,
    carStatusRouting
  ],
  declarations: [
    CarStatusSummaryComponent,
    CarListComponent,
    ChartItemComponent,
    StatusMeterComponent,
    StatusHistoryGrahpComponent,
    CarStatusComponent,
    CarStatusPageComponent
  ],
  exports: [
    CarStatusPageComponent
  ],
  // providers: [
  //   CarStatusDataService
  // ]
})
export class CarStatusPageModule {}
