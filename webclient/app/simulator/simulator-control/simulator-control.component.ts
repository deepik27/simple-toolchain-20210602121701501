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
import * as _ from 'underscore';
import { Component, Input } from '@angular/core';
import {SimulatorVehicle} from '../../simulator/simulator-vehicle.service'

@Component({
  selector: 'simulator-control',
  templateUrl: 'simulator-control.component.html',
  styleUrls: ['simulator-control.component.css'],
})

export class SimulatorControlComponent {
  @Input() simulatorVehicle: SimulatorVehicle;
  @Input() simulatorVehicles: SimulatorVehicle[];
  
  requestingStarting: boolean = false;
  requestingStopping: boolean = false;

  constructor() {
  }

  onStartOrStopVehicle() {
    if (!this.simulatorVehicle) {
      return;
    }
    if (this.simulatorVehicle.isDriving()) {
      this.simulatorVehicle.stopDriving();
    } else {
      this.simulatorVehicle.startDriving();      
    }
  }

  onStartAllVehicles() {
    this.requestingStarting = true;
    Promise.all(_.map(this.simulatorVehicles, (vehicle:SimulatorVehicle) => vehicle.startDriving())).then((data:any) => {
      console.info("Started all vehicles");
    }).catch((error) => {
      console.error("Failed to start all vehicles");
    }).finally(() => {
      this.requestingStarting = false;
    });
  }

  onStopAllVehicles() {
    this.requestingStopping = true;
    Promise.all(_.map(this.simulatorVehicles, (vehicle:SimulatorVehicle) => vehicle.stopDriving())).then((data:any) => {
      console.info("Stopped all vehicles");
    }).catch((error) => {
      console.error("Failed to stop all vehicles");
    }).finally(() => {
      this.requestingStopping = false;
    });
  }

  isBusy() {
    return this.requestingStarting || this.requestingStopping || _.some(this.simulatorVehicles, (vehicle: SimulatorVehicle) => vehicle.isSearchingRoute);
  }
}
