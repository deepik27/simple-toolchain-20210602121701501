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
import { RouterModule } from '@angular/router';
import { HttpModule } from '@angular/http';

import { UtilsModule } from '../utils/utils.module';

import { AlertListComponent } from './alert-list/alert-list.component';
import { AlertPageComponent } from './alert-page.component';
import { routing } from './alert-page.routing';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    RouterModule,
    UtilsModule,
    routing
  ],
  declarations: [
    AlertListComponent,
    AlertPageComponent,
  ],
  exports: [
    AlertPageComponent,
  ],
  providers: []
})
export class AlertPageModule { }
