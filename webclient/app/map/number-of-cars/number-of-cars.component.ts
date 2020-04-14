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
import { Component, OnInit, OnDestroy, Input, Output, OnChanges, SimpleChange } from '@angular/core';

import { Observable, Subject, of, combineLatest,  } from 'rxjs';
import { map, switchMap, debounceTime, distinctUntilChanged, catchError } from 'rxjs/operators';

import { Counts } from './counts';
import { NumberOfCarsService } from './number-of-cars.service';


@Component({
  selector: 'fmdash-number-of-cars',
  templateUrl: 'number-of-cars.component.html',
  styles: [`
  .carStatsColumn a {
    display: block;
    width: 100%;
    height: 100%;
  }
  `],
  providers: [NumberOfCarsService],
})
export class NumberOfCarsComponent implements OnInit, OnDestroy, OnChanges {

  @Input() region: any;
  @Input() regions: any[];

  // For "region"
  public regionSubject = new Subject<any>();
  public regionCounts$: Observable<Counts[]>;

  // For "regions"
  public regionsSubject = new Subject<any[]>();
  public regionsCounts$: Observable<Counts[]>;


  constructor(private numberOfCarsService: NumberOfCarsService) { }

  ngOnInit() {
    // initialize Observable for single

    if(this.region){
       this.regionCounts$ = this.regionSubject
        .pipe(debounceTime(500),
        distinctUntilChanged(),
        switchMap(region => this.numberOfCarsService.getNumberOfCars(region, 2)),
        catchError(error => {
          console.log(error);
          return of(<Counts>{});
        }),
        map(v => <Counts[]>[v])); // CAUTION: convert to an array so that we can use ngFor in template
    }

    // initialize Obserbable for multiple
    if(this.regions){
      // FIXME: not sure, but the following logic which track changes to "regions" does NOT work. Fix later
      // this.regionsCounts$ = this.regionsSubject
      //   // .debounceTime(500)
      //   // .distinctUntilChanged()
      //   .switchMap(regions => {
      //     let obss = regions.map(region => {
      //       return this.numberOfCarsService.getNumberOfCars(region, 15);
      //     });
      //     return Observable.combineLatest(obss, function(...values){
      //       return <Counts[]>values;
      //     });
      //   })
      //   .catch(error => {
      //     console.log(error);
      //     return of(<Counts[]>{});
      //   });
      var obss = this.regions.map(region => {
        return this.numberOfCarsService.getNumberOfCars(region, 2);
      });
      this.regionsCounts$ = combineLatest(obss, function(...values){
        return <Counts[]>values;
      });
    }
  }

  ngOnDestroy(){

  }

  ngOnChanges(changes: { [key: string]: SimpleChange} ) {
    // translates @Input(s) to observable subjects
    let newRegionChange = changes['region'];
    if(newRegionChange){
      this.regionSubject.next(newRegionChange.currentValue);
      console.log('The region @Input attribute is changed!');
    }
    let newRegionsChange = changes['regions'];
    if(newRegionsChange){
      this.regionsSubject.next(newRegionsChange.currentValue);
      this.regionsSubject.complete();
      console.log('The regions @Input attribute is changed!');
    }
  }
}
