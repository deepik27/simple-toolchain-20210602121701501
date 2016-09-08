//import { Component, OnInit, OnDestroy, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { Component, OnInit, OnDestroy, Input, Output, OnChanges, SimpleChange } from '@angular/core';
import { ROUTER_DIRECTIVES } from '@angular/router';

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import { Counts } from './counts';
import { NumberOfCarsService } from './number-of-cars.service';


@Component({
  moduleId: module.id,
  selector: 'fmdash-number-of-cars',
  templateUrl: 'number-of-cars.component.html',
  styles: [`
  .carStatsColumn a {
    display: block;
    width: 100%;
    height: 100%;
  }
  `],
  directives: [ROUTER_DIRECTIVES],
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
        .debounceTime(500)
        .distinctUntilChanged()
        .switchMap(region => this.numberOfCarsService.getNumberOfCars(region, 2))
        .catch(error => {
          console.log(error);
          return Observable.of(<Counts>{});
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
      //       return <Counts[]>values;
      //     });
      //   })
      //   .catch(error => {
      //     console.log(error);
      //     return Observable.of(<Counts[]>{});
      //   });
      var obss = this.regions.map(region => {
        return this.numberOfCarsService.getNumberOfCars(region, 2);
      });
      this.regionsCounts$ = Observable.combineLatest(obss, function(...values){
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
