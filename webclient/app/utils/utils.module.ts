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

import { AreaSelectComponent } from './area-select.component';

import { OrderByPipe } from './order-by.pipe';
import { MomentPipe } from './moment.pipe';

@NgModule({
  imports: [BrowserModule, FormsModule],
  providers: [],
  declarations: [AreaSelectComponent, OrderByPipe, MomentPipe],
  exports: [AreaSelectComponent, OrderByPipe, MomentPipe]
})
export class UtilsModule { }
