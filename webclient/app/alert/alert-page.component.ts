import { Component } from '@angular/core';
import { Http, Request, Response } from '@angular/http';
import { AlertListComponent } from './alert-list/alert-list.component';

@Component({
  moduleId: module.id,
  selector: 'fmdash-fleet-alert',
  templateUrl: 'alert-page.component.html',
  directives: [AlertListComponent]
})

export class AlertPageComponent{
}
