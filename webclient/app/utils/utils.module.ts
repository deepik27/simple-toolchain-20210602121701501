import { NgModule }      from '@angular/core';
import { BrowserModule }  from '@angular/platform-browser';
import { FormsModule }    from '@angular/forms';

import { AreaSelectComponent } from './area-select.component';

import { OrderByPipe } from './order-by.pipe';
import { MomentPipe } from './moment.pipe';

@NgModule({
  imports:      [ BrowserModule, FormsModule ],
  providers:    [  ],
  declarations: [ AreaSelectComponent, OrderByPipe, MomentPipe ],
  exports:      [ AreaSelectComponent, OrderByPipe, MomentPipe ]
})
export class UtilsModule { }
