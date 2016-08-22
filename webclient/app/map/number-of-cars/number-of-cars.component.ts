import { Component, OnInit, OnDestroy, Input, Output, OnChanges, SimpleChanges } from '@angular/core';

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import { NumberOfCarsService } from './number-of-cars.service';

import '../../shared/rxjs-extensions';

@Component({
  moduleId: module.id,
  selector: 'fmdash-number-of-cars',
  templateUrl: 'number-of-cars.component.html',
  providers: [NumberOfCarsService],
})
export class NumberOfCarsComponent implements OnInit, OnDestroy, OnChanges {

  @Input() region: any;
  @Input() regions: any[];

  // For "region"
  public regionSubject = new Subject<any>();
  public regionCounts$: Observable<CountData>;

  // For "regions"
  public regionsSubject = new Subject<any[]>();
  public regionsCounts$: Observable<CountData[]>;


  constructor(private numberOfCarsService: NumberOfCarsService) {  }

  ngOnInit() {
    // initialize Observable for single

    if(this.region){
       this.regionCounts$ = this.regionSubject
        .debounceTime(500)
        .distinctUntilChanged()
        .switchMap(region => this.numberOfCarsService.getNumberOfCars(region, 10))
        .catch(error => {
          console.log(error);
          return <any>{};
        })
        .map(v => [v]); // CAUTION: convert to an array so that we can use ngFor in template
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
      //       return <CountData[]>values;
      //     });
      //   })
      //   .catch(error => {
      //     console.log(error);
      //     return Observable.of(<CountData[]>{});
      //   });
      var obss = this.regions.map(region => {
        return this.numberOfCarsService.getNumberOfCars(region, 15);
      });
      this.regionsCounts$ = Observable.combineLatest(obss, function(...values){
        return <CountData[]>values;
      });
    }
  }

  ngOnDestroy(){

  }

  ngOnChanges(changes: SimpleChanges) {
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

interface CountData {
  all?: number;
  in_use?: number;
  available?: number;
  unavailable?: number;

  troubled?: number;
  critical?: number;
}
