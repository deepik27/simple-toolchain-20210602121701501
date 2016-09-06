import { Component, Input, OnInit } from '@angular/core';
import { Http, Request, Response } from '@angular/http';
import { ROUTER_DIRECTIVES } from '@angular/router';
import { OrderByPipe } from '../../utils/order-by.pipe';
import { MomentPipe } from '../../utils/moment.pipe';
import { AreaSelectComponent } from '../../shared/area-select.component';

@Component({
  moduleId: module.id,
  selector: 'alert-list',
  templateUrl: 'alert-list.component.html',
  styleUrls: ['../../../css/table.css'],
  pipes: [OrderByPipe, MomentPipe],
  directives: [AreaSelectComponent, ROUTER_DIRECTIVES]
})

export class AlertListComponent{
  alertProps = Object.values(AlertProp.values);
  alertValues:PropValue[];

  @Input() prop = "dummy";
  @Input() value = "dummy";
  @Input() includeClosed:boolean;
  @Input() extent: number[];
  @Input() showInput = true;
  fleetalerts: Alert[];
  requestSending = false;
  selected_row_index:string;

  constructor(private http: Http) {  }

  ngOnInit(){
    if(this.prop){
      if(this.value){
        this.getAlert(this.prop, this.value, this.includeClosed, this.getArea());
      }else{
        var prop = AlertProp.values[this.prop];
        if(prop){
          this.alertValues = prop.getValues();
        }
      }
    }else{
      this.getAlert("dummy", "dummy", this.includeClosed, this.getArea());
    }
  }

  onAreaChanged(extent){
    this.extent = extent;
    this.getAlert(this.prop, this.value, this.includeClosed, this.getArea());
  }
  onPropChanged(event){
    var prop = this.alertProps[event.target.selectedIndex];
    this.prop = prop.getId();
    this.alertValues = prop.getValues();
    this.value = "";
  }
  onValueChanged(event){
    if(event.target.tagName.toUpperCase() === "SELECT"){
      var value = this.alertValues[event.target.selectedIndex];
      this.value = value.getId();
    }else if(event.target.tagName.toUpperCae() === "INPUT"){
      this.value = event.target.value;
    }else{
      return;
    }
    this.getAlert(this.prop, this.value, this.includeClosed, this.getArea());
  }
  onIncludeClosedChanged(event){
    this.includeClosed = event.target.checked;
    this.getAlert(this.prop, this.value, this.includeClosed, this.getArea());
  }

  orderByKey: string;
  ascendingOrder: boolean;
  onOrderBy(key){
    this.ascendingOrder = (key === this.orderByKey) ? !this.ascendingOrder : true;
    this.orderByKey = key;
  }
  onMoIdClicked(event, mo_id){
    event.stopPropagation();
    this.prop = AlertProp.MoId.getId();
    this.alertValues = AlertProp.MoId.getValues();
    this.value = mo_id;
    this.includeClosed = true;
    this.getAlert(this.prop, this.value, this.includeClosed, this.getArea());
  }
  private getAlert = function(prop:string, value:string, includeClosed?:boolean, area?:Object){
    var url = "/user/alert?" + prop + "=" + value + "&includeClosed=" + includeClosed + "&limit=100";
    if(area){
      url += Object.keys(area).map(function(key){return "&" + key + "=" + area[key];}).join();
    }
    this.requestSending = true;
    this.http.get(url)
    .subscribe((response: Response) => {
      this.requestSending = false;
      if(response.status == 200){
        var fleetalerts = response.json();
        this.fleetalerts = fleetalerts && fleetalerts.alerts;
        this.updateVehicleInfo();
      }
    }, (error: any) => {
      this.requestSending = false;
    });
  }
  private updateVehicleInfo(){
    var self = this;
    var moid2alerts:{key?:Alert[]} = {};
    this.fleetalerts.forEach((fleetalert, index) => {
      var alerts = moid2alerts[fleetalert.mo_id];
      if(alerts){
        alerts.push(fleetalert);
      }else{
        moid2alerts[fleetalert.mo_id] = alerts = Array<Alert>();
        alerts.push(fleetalert);
        self.http.get("/user/vehicle/" + fleetalert.mo_id)
        .subscribe((vehicleResponse:Response) => {
          var vehicle = vehicleResponse.json();
          alerts = moid2alerts[vehicle.mo_id];
          if(vehicle.serial_number){
            alerts.forEach((alert) => {
              alert.serial_number = vehicle.serial_number;
            })
          }
          delete moid2alerts[fleetalert.mo_id];
        })
      }
    });
  }
  private getArea = function(){
    if(!this.extent || this.extent.length !== 4
    || this.extent[0] === "" || this.extent[1] === "" || this.extent[2] === "" || this.extent[3] === ""
    || isNaN(this.extent[0]) || isNaN(this.extent[1]) || isNaN(this.extent[2]) || isNaN(this.extent[3])){
      return null;
    }
    return {
      min_lng: this.extent[0],
      min_lat: this.extent[1],
      max_lng: this.extent[2],
      max_lat: this.extent[3]
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
