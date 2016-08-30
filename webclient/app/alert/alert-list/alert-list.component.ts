import { Component, Input } from '@angular/core';
import { Http, Request, Response } from '@angular/http';
import { OrderByPipe } from '../../utils/order-by.pipe';
import { MomentPipe } from '../../utils/moment.pipe';

@Component({
  moduleId: module.id,
  selector: 'alert-list',
  templateUrl: 'alert-list.component.html',
  pipes: [OrderByPipe, MomentPipe]
})

export class AlertListComponent{
  alertProps = Object.values(AlertProp.values);
  alertValues:PropValue[];

  @Input() min_lat: string;
  @Input() min_lng: string;
  @Input() max_lat: string;
  @Input() max_lng: string;
  @Input() prop: string;
  @Input() value: string;
  @Input() includeClosed: boolean;
  @Input() showInput = true;
  fleetalerts: Alert[];

  constructor(private http: Http) {  }

  ngOnInit(){
    if(this.prop){
      if(this.value){
        this._getAlert(this.prop, this.value, this.includeClosed, this._getArea());
      }else{
        var prop = AlertProp.values[this.prop];
        if(prop){
          this.alertValues = prop.getValues();
        }
      }
    }else{
      this._getAlert("dummy", "dummy", this.includeClosed, this._getArea());
    }
  }

  onClearArea(event){
    this.min_lat = "";
    this.min_lng = "";
    this.max_lat = "";
    this.max_lng = "";
  }
  onPropChanged(event){
    var prop = this.alertProps[event.target.selectedIndex];
    this.prop = prop.getId();
    this.alertValues = prop.getValues();
    this.value = "";
  }
  onValueChanged(event){
    var value = this.alertValues[event.target.selectedIndex];
    this.value = value.getId();
    this._getAlert(this.prop, this.value, this.includeClosed, this._getArea());
  }
  onIncludeClosedChanged(event){
    this.includeClosed = event.target.checked;
    this._getAlert(this.prop, this.value, this.includeClosed, this._getArea());
  }

  orderByKey: string;
  orderByOrder: boolean;
  onOrderBy(key){
    this.orderByOrder = (key === this.orderByKey) ? !this.orderByOrder : true;
    this.orderByKey = key;
  }
  _getAlert = function(prop:string, value:string, includeClosed?:boolean, area?:Object){
    var url = "/user/alert?" + prop + "=" + value + "&includeClosed=" + includeClosed + "&limit=100";
    if(area){
      url += Object.keys(area).map(function(key){return "&" + key + "=" + area[key];}).join();
    }
    this.http.get(url)
    .subscribe((response: Response) => {
      if(response.status == 200){
        var fleetalerts = response.json();
        this.fleetalerts = fleetalerts && fleetalerts.alerts;
      }
    });
  }
  _getArea = function(){
    if(this.min_lat === "" || this.min_lng === "" || this.max_lat === "" || this.max_lng === ""
    || isNaN(this.min_lat) || isNaN(this.min_lng) || isNaN(this.max_lat) || isNaN(this.max_lng)){
      return null;
    }
    return {
      min_lat: this.min_lat,
      min_lng: this.min_lng,
      max_lat: this.max_lat,
      max_lng: this.max_lng
    }
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
