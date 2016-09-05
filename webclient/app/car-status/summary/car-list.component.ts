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

  constructor(private carStatusDataService: CarStatusDataService) {  }

  ngOnInit() {
    this.selectedDevies$ = this.selectionSubject
      .debounceTime(500)
//      .distinctUntilChanged()
      .switchMap(sel => {
        if(sel.value)
          return this.carStatusDataService.getDevices(sel.prop, sel.value, 2);
        return Observable.of([]);
        }
      )
      .catch(error => {
        console.log(error);
        return Observable.of([]);
      });
  }

  ngOnChanges(changes: { [key: string]: SimpleChange} ) {
    // translates @Input(s) to observable subjects
    let newGroupPropChange = changes['groupProp'];
    let newSelectGroupChange = changes['selectGroup'];
    if(newGroupPropChange || newSelectGroupChange){
      this.selectionSubject.next({prop: this.groupProp, value: this.selectGroup});
    }
  }
}
