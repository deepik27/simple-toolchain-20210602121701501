/**
 * Copyright 2020 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Component, ViewChild } from '@angular/core';
import { SimulatorVehicleListComponent } from './simulator-vehicle-list/simulator-vehicle-list.component';
import { SimulatorVehicleService, SimulatorVehicle } from './simulator-vehicle.service'

import * as _ from 'underscore';

@Component({
  selector: 'fmdash-simulator-page',
  templateUrl: 'simulator-page.component.html',
  styleUrls: ['simulator-page.component.css'],
  providers: [],
})
export class SimulatorPageComponent {
  @ViewChild(SimulatorVehicleListComponent, { static: false }) vehicleList: SimulatorVehicleListComponent;

  simulatorVehicle: SimulatorVehicle;
  simulatorVehicles: SimulatorVehicle[];
  viewMode: string = "uninitialized";
  viewModeSwitchText: string = "Unknown";
  requestSending: boolean = false;
  errorMessage: string;

  constructor(
    private simulatorVehicleService: SimulatorVehicleService,
  ) {
  }

  ngOnInit() {
    this.simulatorVehicleService.getEmitter().subscribe((data) => {
      if (data.type == "selection") {
        if (data.state == "updateSelection") {
          this.simulatorVehicle = data.data;
        } else if (data.state == "updateList") {
          this.simulatorVehicles = data.data;
        }
      }
    });

    this.errorMessage = null;
    this.viewMode = "uninitialized"
    this.requestSending = true;
    this.simulatorVehicleService.init().then(() => {
      this.setViewMode(!this.simulatorVehicleService.isVehicleSelected());
      this.requestSending = false;
    }, (error: any) => {
      this.requestSending = false;
      this.errorMessage = error.message;
      this.viewMode = "initializationFailed";
    });

    window.onbeforeunload = () => {
      this.simulatorVehicleService.destory(false);      
    }
  }

  onVehicleChanged(vehicle: SimulatorVehicle) {
    this.simulatorVehicleService.selectSimulatorVehicle(vehicle);
  }

  onChangeViewMode(selectionMode: boolean) {
    if (!selectionMode) {
      this.requestSending = true;
      this.vehicleList.setSimulatedVehicles().then((data: Number) => {
        if (data > 0) {
          this.setViewMode(selectionMode);
        }
      }).finally(() => {
        this.requestSending = false;
      });
    } else {
      this.setViewMode(selectionMode);
    }
  }

  setViewMode(selectionMode: boolean) {
    if (selectionMode) {
      this.viewMode = "selection";
      this.viewModeSwitchText = "Simulate Vehilce Data";
    } else {
      this.viewMode = "navigation";
      this.viewModeSwitchText = "Select Vehilces";
    }
  }
}

