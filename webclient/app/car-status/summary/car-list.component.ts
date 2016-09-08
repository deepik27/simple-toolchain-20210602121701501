import { Component, OnInit, OnDestroy, OnChanges, SimpleChange, Input } from '@angular/core';
import { ROUTER_DIRECTIVES } from '@angular/router';

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { CarStatusDataService } from './car-status-data.service';

@Component({
  moduleId: module.id,
  selector: 'fmdash-car-list',
  templateUrl: 'car-list.component.html',
  styleUrls: ['../../../css/table.css'],
  directives: [ROUTER_DIRECTIVES]
})
export class CarListComponent implements OnInit, OnDestroy, OnChanges {
  @Input() groupProp: string;
  @Input() selectGroup: string;
  get groupPropName() { return this.groupProp === 'fuel' ? 'Fuel' : (this.groupProp === 'engineTemp' ? 'Engine Temperature': this.groupProp); }
  get selectGroupName() { return this.selectGroup; }
  private selectionSubject = new Subject<any>();
  private selectedDeviesSubscription;
  public probes = [];

  constructor(private carStatusDataService: CarStatusDataService) {  }

  ngOnInit() {
    this.selectedDeviesSubscription = this.selectionSubject
      .map(x => { console.log(x); return x; })
//      .debounceTime(500)
//      .distinctUntilChanged()
      .switchMap(sel => {
          console.log('Switching to ' , sel);
          if(sel.value){
            return this.carStatusDataService.getDevices(sel.prop, sel.value, 5);
          }
          return Observable.of([]);
        }
      )
      .catch(error => {
        console.log(error);
        return Observable.of([]);
      })
      .subscribe(devices => {
        this.probes = devices.map(device => device.latestSample);
        console.log('Setting probes to; ', this.probes);
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
