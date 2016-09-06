import { Component, OnInit, OnChanges, SimpleChange, Input } from '@angular/core';
import { ROUTER_DIRECTIVES } from '@angular/router';

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import { CarStatusDataService } from './car-status-data.service';

@Component({
  moduleId: module.id,
  selector: 'fmdash-car-list',
  templateUrl: 'car-list.component.html',
  directives: [ROUTER_DIRECTIVES]
})
export class CarListComponent implements OnInit, OnChanges {
  @Input() groupProp: string;
  @Input() selectGroup: string;
  private selectionSubject = new Subject<any>();
  public selectedDevies$: Observable<any[]>;
  public devices = [];

  constructor(private carStatusDataService: CarStatusDataService) {  }

  ngOnInit() {
     this.selectionSubject.map(x => { console.log(x); return x; })
//      .debounceTime(500)
//      .distinctUntilChanged()
      .switchMap(sel => {
          console.log('Switching to ' , sel);
          if(sel.value){
            return this.carStatusDataService.getDevices(sel.prop, sel.value);
          }
          return Observable.of([]);
        }
      )
      .catch(error => {
        console.log(error);
        return Observable.of([]);
      })
      .subscribe(devices => {
        this.devices = devices;
        console.log('Setting devices to; ', devices);
      });
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
