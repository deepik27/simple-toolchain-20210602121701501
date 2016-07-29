import { Component, OnInit } from '@angular/core';
import { ROUTER_DIRECTIVES } from '@angular/router';

@Component({
  selector: 'fmdash-app',
  moduleId: module.id,
  templateUrl: 'app.component.html',
  directives: [ROUTER_DIRECTIVES],
  providers: []
})
export class AppComponent  {
  title = "My App";
  sidebarItems = [
           { title: "Map", route: "/map", icon: 'icon-location', active: false },
           { title: 'Users', route: '/users', icon: 'icon-user', active: false},
           { title: "Vehicle", route: "/vehicle", icon: 'icon-car', active: false }
       ];
}
