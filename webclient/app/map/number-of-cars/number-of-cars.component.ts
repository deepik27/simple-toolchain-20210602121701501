import { Component, OnInit, Input, Output } from '@angular/core';


@Component({
  moduleId: module.id,
  selector: 'fmdash-number-of-cars',
  templateUrl: 'number-of-cars.component.html',
})
export class NumberOfCarsComponent implements OnInit {

  @Input() region: any;
  @Input() regions: any[];

  public counts: any;//{ [key:string]: CountData };

  constructor() {  }

  ngOnInit() {

    this.counts = {};
    this.counts._selection = {
      all: 10,
      troubled: 5,
      critical: 1,
    };

    if(this.regions){
      this.regions.map(r => {
        this.counts[r.id] = {
          all: 10,
          troubled: 5,
          critical: 1,
        }
      });

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
