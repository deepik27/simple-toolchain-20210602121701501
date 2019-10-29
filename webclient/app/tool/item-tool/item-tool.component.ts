/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
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
import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChange } from '@angular/core';
import { Router } from '@angular/router';

import { EventService } from '../../shared/iota-event.service';
import { GeofenceService } from '../../shared/iota-geofence.service';
import { POIService } from '../../shared/iota-poi.service';
import { AssetService } from '../../shared/iota-asset.service';

import * as ol from 'openlayers';

declare var $; // jQuery from <script> tag in the index.html
// as bootstrap type definitoin doesn't extend jQuery $'s type definition

@Component({
  moduleId: module.id,
  selector: 'fmdash-item-tool',
  templateUrl: 'item-tool.component.html',
  styleUrls: ['item-tool.component.css']
})
export class ItemToolComponent implements OnInit {
  itemMap = null;
  supportedItems = ["event"];
  eventTypes = [];
  selectedEventType = null;
  eventDirections = [{ label: "North", value: 0 }, { label: "North East", value: 45 }, { label: "East", value: 90 }, { label: "South East", value: 135 },
  { label: "South", value: 180 }, { label: "South West", value: 225 }, { label: "West", value: 270 }, { label: "North West", value: 315 }];
  eventDirection: number = 0;
  geofenceTypes = [{ label: "Rectangle", value: "rectangle" }, { label: "Circle", value: "circle" }];
  geofenceType: string = "rectangle";
  geofenceDirections = [{ label: "OUT", value: "out" }, { label: "IN", value: "in" }];
  geofenceDirection: string = "out";
  geofenceUseTargetArea: boolean = false;
  dummyVehicle: Vehicle = new Vehicle({});
  targetVehicles: Vehicle[] = [this.dummyVehicle];
  targetVehicle: Vehicle = this.dummyVehicle;
  poiName: string;
  pageNumber: number;
  hasNext: boolean;
  numRecInPage: number = 10;
  requestSending: boolean;
  creationMode: string = "event";
  itemLatitude: number;
  itemLongitude: number;
  isActive: boolean = false;
  inputPOIFile: string = null;

  constructor(
    private router: Router,
    private eventService: EventService,
    private geofenceService: GeofenceService,
    private poiService: POIService,
    private assetService: AssetService
  ) { }

  ngOnInit() {
    this.eventService.getEventTypes().subscribe(data => {
      if (data.length > 0) {
        data.sort(function (a, b) {
          return a.description && b.description && a.description.localeCompare(b.description);
        });
        this.eventTypes = data;
        this.selectedEventType = data[0];
      }
    });
    this.geofenceService.getCapability().subscribe(data => {
      if (data) {
        if (data.available) {
          this.supportedItems.push("geofence");
          this.creationMode = this.supportedItems[0];
        }
        this.geofenceUseTargetArea = data.useTargetArea;
      }
    });
    this.poiService.getCapability().subscribe(data => {
      if (data) {
        if (data.available) {
          this.supportedItems.splice(0, 0, "poi");
          this.creationMode = this.supportedItems[0];
        }
        this.geofenceUseTargetArea = data.useTargetArea;
        this._updateVehicleList(1);
      }
    });
  }

  setActive(active: boolean) {
    this.isActive = active;
    this.onChangeMode();
  }

  onChangeMode() {
    if (this.isActive && (this.creationMode === "event" || this.creationMode === "poi")) {
      this.itemMap.map.getViewport().style.cursor = "pointer";
    } else {
      this.itemMap.map.getViewport().style.cursor = "default";
    }
  }

  onShowPrev(event) {
    if (this.pageNumber > 1) {
      this._updateVehicleList(this.pageNumber - 1);
    }
  }

  onShowNext(event) {
    if (this.hasNext) {
      this._updateVehicleList(this.pageNumber + 1);
    }
  }

  uploadPOIFile(event) {
    if (!event.target.files || event.target.files.length == 0) {
      return;
    }
    let mo_id = this.targetVehicle ? this.targetVehicle.__mo_id : null;
    let serialnumber = this.targetVehicle ? this.targetVehicle.serial_number : null;
    let targetname = serialnumber || mo_id;

    this.inputPOIFile = null;
    this.poiService.uploadPOIFile(event.target.files[0], mo_id, serialnumber)
      .subscribe((result: any) => {
        if (result.created > 0) {
          let helper = this.itemMap.mapItemHelpers["poi"];
          helper.updateView();

          alert("POIs " + (targetname ? (" for " + targetname + " ") : "") + "were created.");
        } else {
          alert("No POI was included.");
        }
      }, (error: any) => {
        alert("Failed to crate POIs.")
      });
  }

  private _updateVehicleList(pageNumber: number) {
    let isRequestRoot = !this.requestSending;
    this.requestSending = true;
    this.assetService.getVehicles(pageNumber, this.numRecInPage)
      .subscribe((vehicles: any) => {
        this.targetVehicles = vehicles.map(v => {
          return new Vehicle(v);
        });
        if (pageNumber == 1) {
          this.targetVehicles.splice(0, 0, this.dummyVehicle);
        }
        this.pageNumber = pageNumber;
        this.hasNext = this.numRecInPage <= this.targetVehicles.length;
        if (isRequestRoot) {
          this.requestSending = false;
        }
      }, (error: any) => {
        if (error.status === 400) {
          alert("Thre are no more vehicles.");
        } else if (pageNumber === 1 && error.status === 404) {
          this.targetVehicles = [];
        }
        this.hasNext = false;
        if (isRequestRoot) {
          this.requestSending = false;
        }
      });
  }

  onDeletePOI(event) {
    let mo_id = this.targetVehicle && this.targetVehicle.__mo_id;
    let serialnumber = this.targetVehicle && this.targetVehicle.serial_number;
    if (!mo_id) {
      if (!confirm("No vehicle is selected. Do you want to delete all POIs?")) {
        return;
      }
    }
    let targetname = serialnumber || mo_id;

    let size = this.itemMap.map.getSize();
    if (!size || isNaN(size[0]) || isNaN(size[1])) {
      return;
    }
    let ext = this.itemMap.map.getView().calculateExtent(size);
    let extent = ol.proj.transformExtent(ext, 'EPSG:3857', 'EPSG:4326');

    let center_latitude = (extent[1] + extent[3]) / 2;
    let center_longitude = (extent[0] + extent[2]) / 2;
    let radius = Math.ceil(this.poiService.calcDistance([center_longitude, center_latitude], [extent[2], extent[3]]) / 1000);
    radius += 10; // search larger area

    let properties;
    if (mo_id) properties = { mo_id: mo_id };

    return this.poiService.queryPOIs({
      latitude: center_latitude,
      longitude: center_longitude,
      radius: radius,
      properties: properties
    }).subscribe((data: any) => {
      if (!data || data.length == 0) {
        alert("No POI was found.")
        return;
      }
      let poi_ids = data.map(function (poi) {
        return poi.id;
      }).join(",");
      this.poiService.deletePOI(poi_ids).subscribe((data: any) => {
        let helper = this.itemMap.mapItemHelpers["poi"];
        helper.updateView();

        alert("POIs " + (targetname ? (" for " + targetname + " ") : "") + "were deleted.");
      });
    }, (error: any) => {
      console.error(error);
    });
  }

  onCreateItem() {
    if (isNaN(this.itemLongitude) || isNaN(this.itemLongitude)) {
      alert("Valid latitude and longitude must be specified or click on a map to create.");
      return;
    }

    let helper = this.itemMap.mapItemHelpers[this.creationMode];
    let extent = this.itemMap.getMapExtent();
    let loc = { longitude: Number(this.itemLongitude), latitude: Number(this.itemLatitude) };

    let command = this.getLocationCommand(extent, loc);
    if (!helper || !command) {
      alert("The action cannot be executed.");
      return;
    }

    let commandId = helper.addTentativeItem(loc);

    return new Promise((resolve, reject) => {
      return this.execute(command).then(function (result: any) {
        helper.setTentativeItemId(commandId, result.data.id, false);
        resolve(result);
      }, function (error) {
        helper.removeTentativeItem(commandId);
        reject(error);
      });
    });
  }

  onCreateGeofence() {
    let helper = this.itemMap.mapItemHelpers["geofence"];
    let extent = this.itemMap.getMapExtent();
    let offset_x = (extent.max_longitude - extent.min_longitude) / 4;
    let offset_y = (extent.max_latitude - extent.min_latitude) / 4;

    let range = null;
    if (this.geofenceType === "circle") {
      let center_x = (extent.max_longitude + extent.min_longitude) / 2;
      let center_y = (extent.max_latitude + extent.min_latitude) / 2;
      let r1 = helper.calcDistance([center_x, center_y], [center_x + offset_x, center_y]);
      let r2 = helper.calcDistance([center_x, center_y], [center_x, center_y + offset_y]);
      let radius = Math.min(r1, r2);
      range = { longitude: center_x, latitude: center_y, radius: radius };
    } else if (this.geofenceType === "rectangle") {
      range = {
        min_latitude: extent.min_latitude + offset_y,
        min_longitude: extent.min_longitude + offset_x,
        max_latitude: extent.max_latitude - offset_y,
        max_longitude: extent.max_longitude - offset_x
      };
    }
    let commandId = helper.addTentativeItem({ geometry_type: this.geofenceType, geometry: range });

    return new Promise((resolve, reject) => {
      let target = this.geofenceUseTargetArea ? { area: helper.createTargetArea(this.geofenceType, range, this.geofenceDirection) } : null;
      return this.execute(new CreateGeofenceCommand(this.geofenceService, range, this.geofenceDirection, target)).then(function (result: any) {
        helper.setTentativeItemId(commandId, result.data.id, false);
        resolve(result);
      }, function (error) {
        helper.removeTentativeItem(commandId);
        reject(error);
      });
    });
  }

  setItemMap(itemMap) {
    this.itemMap = itemMap;
  }

  locationClicked(loc) {
    if (!this.isActive || (this.creationMode !== "event" && this.creationMode !== "poi")) {
      return;
    }
    let extent = this.itemMap.getMapExtent();
    let helper = this.itemMap.mapItemHelpers[this.creationMode];
    let commandId = helper.addTentativeItem(loc);
    return new Promise((resolve, reject) => {
      return this.execute(this.getLocationCommand(extent, loc)).then(function (result: any) {
        helper.setTentativeItemId(commandId, result.data.id, true);
        resolve(result);
      }, function (error) {
        helper.removeTentativeItem(commandId);
        reject(error);
      });
    });
  }

  moveItem(item, delta) {
    return this.execute(this.getMoveCommand(item, delta));
  }

  resizeItem(item, delta, handleIndex) {
    return this.execute(this.getResizeCommand(item, delta, handleIndex));
  }

  deleteItem(item) {
    let extent = this.itemMap.getMapExtent();
    return this.execute(this.getDeleteItemCommand(item));
  }

  execute(command) {
    return new Promise((resolve, reject) => {
      if (!command) {
        return resolve({ type: this.creationMode, data: null });
      }
      command.execute().subscribe(data => {
        this.itemMap.updateMapItems(command.getCommandTarget());
        let result = { type: this.creationMode, data: data };
        resolve(result);
      }, error => {
        reject(error);
      });
    });
  }

  getCommandExecutor() {
    return this;
  }

  getLocationCommand(range, loc): ToolCommand {
    if (this.creationMode === "event") {
      return new CreateEventCommand(this.eventService, range, loc, this.selectedEventType, this.eventDirection);
    } else if (this.creationMode === "poi") {
      return new CreatePOICommand(this.poiService, range, loc, this.poiName, this.targetVehicle);
    }
  }

  getMoveCommand(item, delta): ToolCommand {
    if (item.getItemType() === "geofence") {
      let geometry = item.geometry;
      if (item.geometry_type === "circle") {
        geometry.longitude += delta[0];
        geometry.latitude += delta[1];
      } else if (this.geofenceType === "rectangle") {
        geometry.min_longitude += delta[0];
        geometry.max_longitude += delta[0];
        geometry.min_latitude += delta[1];
        geometry.max_latitude += delta[1];
      }
      let target = item.target;
      if (target && target.area) {
        target.area.min_longitude += delta[0];
        target.area.max_longitude += delta[0];
        target.area.min_latitude += delta[1];
        target.area.max_latitude += delta[1];
      }
      return new UpdateGeofenceCommand(this.geofenceService, item.getId(), geometry, item.direction, target);
    }
  }

  getResizeCommand(item, delta, handleIndex) {
    if (item.getItemType() === "geofence") {
      let helper = this.itemMap.mapItemHelpers["geofence"];
      let geometry = item.geometry;
      let target = item.target;
      if (item.geometry_type === "circle") {
        let radius = geometry.radius;
        let center = [geometry.longitude, geometry.latitude];
        let edgeLonLat = helper.calcPosition(center, radius, 90);
        if (handleIndex === 0 || handleIndex === 1) {
          edgeLonLat[0] -= delta[0];
        } else {
          edgeLonLat[0] += delta[0];
        }
        geometry.radius = helper.calcDistance(center, edgeLonLat);
      } else if (item.geometry_type === "rectangle") {
        if (handleIndex === 0) {
          geometry.min_longitude += delta[0];
          geometry.min_latitude += delta[1];
        } else if (handleIndex === 1) {
          geometry.min_longitude += delta[0];
          geometry.max_latitude += delta[1];
        } else if (handleIndex === 2) {
          geometry.max_longitude += delta[0];
          geometry.max_latitude += delta[1];
        } else if (handleIndex === 3) {
          geometry.max_longitude += delta[0];
          geometry.min_latitude += delta[1];
        }
        if (geometry.min_longitude > geometry.max_longitude) {
          let lon = geometry.min_longitude;
          geometry.min_longitude = geometry.max_longitude;
          geometry.max_longitude = lon;
        }
        if (geometry.min_latitude > geometry.max_latitude) {
          let lat = geometry.min_latitude;
          geometry.min_latitude = geometry.max_latitude;
          geometry.max_latitude = lat;
        }
      }
      if (target && target.area) {
        target.area = helper.createTargetArea(item.geometry_type, geometry, item.direction);
      }
      return new UpdateGeofenceCommand(this.geofenceService, item.getId(), geometry, item.direction, target);
    }
  }

  getDeleteItemCommand(item): ToolCommand {
    if (item.getItemType() === "event") {
      return new DeleteEventCommand(this.eventService, item.event_id);
    } else if (item.getItemType() === "geofence") {
      return new DeleteGeofenceCommand(this.geofenceService, item.id);
    } else if (item.getItemType() === "poi") {
      return new DeletePOICommand(this.poiService, item.id);
    }
  }
}

/*
* Commands pattern to create, update and delete items
*/
export class ToolCommand {
  constructor(private commandType: string = "unknown") {
  }
  public getCommandTarget() {
    return this.commandType;
  }
  public execute() { };
}

export class CreateEventCommand extends ToolCommand {
  constructor(private eventService, private extent, private loc, private eventType, private direction) {
    super("event");
  }
  execute() {
    let date = new Date();
    let currentTime = date.toISOString();
    let params: any = {
      event_type: this.eventType.event_type,
      s_latitude: this.loc.latitude,
      s_longitude: this.loc.longitude,
      event_time: currentTime,
      start_time: currentTime,
      heading: this.direction
    };
    if (this.eventType.description) {
      params.event_name = this.eventType.description;
    }
    if (this.eventType.category) {
      params.event_category = this.eventType.category;
    }
    return this.eventService.createEvent(params);
  }
}

export class DeleteEventCommand extends ToolCommand {
  constructor(private eventService, private event_id) {
    super("event");
  }
  public execute() {
    return this.eventService.deleteEvent(this.event_id);
  }
}

export class CreateGeofenceCommand extends ToolCommand {
  constructor(private geofenceService, private geometry, private direction, private target) {
    super("geofence");
  }
  public execute() {
    let geometry_type = (!isNaN(this.geometry.radius) && !isNaN(this.geometry.latitude) && !isNaN(this.geometry.longitude)) ? "circle" : "rectangle";
    let geofence = {
      direction: this.direction,
      geometry_type: geometry_type,
      geometry: this.geometry,
    };
    if (this.target) {
      geofence["target"] = this.target;
    }
    return this.geofenceService.createGeofence(geofence);
  }
}

export class UpdateGeofenceCommand extends ToolCommand {
  constructor(private geofenceService, private geofence_id, private geometry, private direction, private target) {
    super("geofence");
  }
  public execute() {
    let geometry_type = (!isNaN(this.geometry.radius) && !isNaN(this.geometry.latitude) && !isNaN(this.geometry.longitude)) ? "circle" : "rectangle";
    let geofence = {
      direction: this.direction,
      geometry_type: geometry_type,
      geometry: this.geometry
    };
    if (this.target) {
      geofence["target"] = this.target;
    }
    return this.geofenceService.updateGeofence(this.geofence_id, geofence);
  }
}

export class DeleteGeofenceCommand extends ToolCommand {
  constructor(private geofenceService, private geofence_id) {
    super("geofence");
  }
  public execute() {
    return this.geofenceService.deleteGeofence(this.geofence_id);
  }
}

export class CreatePOICommand extends ToolCommand {
  constructor(private poiService, private extent, private loc, private name, private vehicle) {
    super("poi");
  }
  execute() {
    let date = new Date();
    let currentTime = date.toISOString();
    let params: any = {
      latitude: this.loc.latitude,
      longitude: this.loc.longitude,
      properties: {
        mo_id: this.vehicle.__mo_id,
        serialnumber: this.vehicle ? this.vehicle.serial_number : undefined,
        name: this.name
      }
    };
    return this.poiService.createPOI(params);
  }
}

export class DeletePOICommand extends ToolCommand {
  constructor(private poiService, private poi_id) {
    super("poi");
  }
  public execute() {
    return this.poiService.deletePOI(this.poi_id);
  }
}

// Vehicle definition
class Vehicle {
  __id: string;
  __mo_id: string;
  mo_id: string; // The ID of the vehicle that is automatically generated by the system.
  siteid: string; // site id only for SaaS environment
  iotcvaltmoid: string; // An alternative alias of the vehicle
  internal_mo_id: number; // The numerical ID of the vehicle that is automatically generated by the system.
  vendor: string = ""; // The vendor ID of the vehicle that is created from within the vendor's system.
  serial_number: string = ""; // The serial number of the vehicle.
  description: string = ""; // Description of the vehicle.
  driver_id: string; // The driver ID that is created by the driver interface from within the vehicle.
  properties: any;

  constructor(props) {
    for (let key in props) {
      this[key] = props[key];
    }
    this.__id = this.serial_number || this.mo_id;
    if (this.mo_id) {
      this.__mo_id = this.iotcvaltmoid || (this.siteid ? (this.siteid + ':' + this.mo_id) : this.mo_id);
    }
  }
}