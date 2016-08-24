import { Component } from '@angular/core';
import { Http, Request, Response } from '@angular/http';
import { OrderByPipe } from '../../utils/order-by.pipe';

@Component({
  moduleId: module.id,
  selector: 'alert-list',
  templateUrl: 'alert-list.component.html',
  inputs: ['prop', 'value'],
  pipes: [OrderByPipe]
})

export class AlertListComponent{
  alertProps = Object.values(AlertProp.values);
  alertValues:PropValue[];
  propDiv: HTMLDivElement;
  propSelect: HTMLSelectElement;
  propValueSelect: HTMLSelectElement;

  prop: string;
  value: string;
  showInput = true;
  fleetalerts: Alert[];

  constructor(private http: Http) {  }

  ngOnInit(){
    if(this.prop){
      if(this.value){
        // this.propDiv.style.display = "none";
        this._getAlert(this.prop, this.value);
        this.showInput = false;
      }else{
        var prop = AlertProp.values[this.prop];
        if(prop){
          this.alertValues = prop.getValues();
        }
      }
    }
  }
  onPropChanged(event){
    var prop = this.alertProps[event.target.selectedIndex];
    this.prop = prop.getId();
    this.alertValues = prop.getValues();
  }
  onValueChanged(event){
    var value = this.alertValues[event.target.selectedIndex];
    this.value = value.getId();
    this._getAlert(this.prop, this.value);
  }

  orderByKey: string;
  orderByOrder: boolean;
  onOrderBy(key){
    this.orderByOrder = (key === this.orderByKey) ? !this.orderByOrder : true;
    this.orderByKey = key;
  }
  _getAlert = function(prop:string, value:string){
    this.http.get("/user/alert?" + prop + "=" + value + "&limit=100")
    .subscribe((response: Response) => {
      if(response.status == 200){
        var fleetalerts = response.json();
        this.fleetalerts = fleetalerts && fleetalerts.alerts;
      }
    });
  }
}
class Alert {
  timestamp: string;
  mo_id: string;
  type: string;
  severity: string;
  description: string;
}
class PropValue {
  constructor(private id:string, private label:string){}
  getId(){
    return this.id;
  }
  getLabel(){
    return this.label;
  }
}
export class AlertProp {
  static values = {};
  static Type = new AlertProp("type", "Type", [
    new PropValue("low_fuel", "Low Fuel"),
    new PropValue("half_fuel", "Half Fuel"),
    new PropValue("high_engine_temp", "High Engine Temperature")
  ]);
  static Severity = new AlertProp("severity", "Severity", [
    new PropValue("Critical", "Critical"),
    new PropValue("High", "High"),
    new PropValue("Medium", "Medium"),
    new PropValue("Low", "Low"),
  ]);
  static MoId = new AlertProp("mo_id", "Vehicle ID", []);

  constructor(private id:string, private label:string, private values:PropValue[]){
    AlertProp.values[id] = this;
  }
  getId(){
    return this.id;
  }
  getLabel(){
    return this.label;
  }
  getValues(){
    return this.values;
  }
}
