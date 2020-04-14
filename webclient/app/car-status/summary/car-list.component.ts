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
import { Component, OnInit, OnDestroy, OnChanges, SimpleChange, Input } from '@angular/core';

import { Subject, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { CarStatusDataService } from './car-status-data.service';

import * as _ from 'underscore';

@Component({
  selector: 'fmdash-car-list',
  templateUrl: 'car-list.component.html',
})
export class CarListComponent implements OnInit, OnDestroy, OnChanges {
  @Input() groupProp: string;
  @Input() selectGroup: string;
  get groupPropName() { return this.groupProp === 'fuel' ? 'Fuel' : (this.groupProp === 'engineTemp' ? 'Engine Oil Temperature': this.groupProp); }
  get selectGroupName() { return this.selectGroup; }
  private selectionSubject = new Subject<any>();
  private selectedDeviesSubscription;
  public devices = [];

  constructor(private carStatusDataService: CarStatusDataService) {  }

  ngOnInit() {
    this.selectedDeviesSubscription = this.selectionSubject
      .pipe(map(x => { console.log(x); return x; }),
//      .debounceTime(500)
//      .distinctUntilChanged()
      switchMap(sel => {
          console.log('Switching to ' , sel);
          if(sel.value){
            return this.carStatusDataService.getDevices(sel.prop, sel.value, 5);
          }
          return of([]);
        }
      ),
      catchError(error => {
        console.log(error);
        return of([]);
      }))
      .subscribe(devices => {
        this.devices = devices.map(device => device);
        console.log('Setting probes to; ', this.devices);
      });
  }
  ngOnDestroy() {
    if(this.selectedDeviesSubscription){
      this.selectedDeviesSubscription.unsubscribe();
      this.selectedDeviesSubscription = null;
    }
  }

  ngOnChanges(changes: { [key: string]: SimpleChange} ) {
    // translates @Input(s) to observable subjects
    let newGroupPropChange = changes['groupProp'];
    let newSelectGroupChange = changes['selectGroup'];
    if(newGroupPropChange || newSelectGroupChange){
      this.selectionSubject.next({prop: this.groupProp, value: this.selectGroup});
      console.log('Sent to subject: [' + this.groupProp + '] => [' + this.selectGroup + ']');
    }
  }
}
