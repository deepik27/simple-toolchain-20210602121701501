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
import * as Chance from 'chance';
import { Injectable, Inject, Output, EventEmitter } from '@angular/core';
import { AppHttpClient } from "../shared/http-client";
import { LocationService } from '../shared/location.service';
import { HttpHeaders } from "@angular/common/http";
import { map, retry } from 'rxjs/operators';
import { webSocket } from 'rxjs/webSocket';
import { APP_CONFIG, AppConfig } from '../app-config';

@Injectable()
export class SimulatorVehicleService {
  @Output() private emitter = new EventEmitter();
  private simulatorVehicles: SimulatorVehicle[];
  private selectedVehilce: SimulatorVehicle;
  private appConfig;
  private clientId;
  private chance = new Chance();

  constructor(
    @Inject(APP_CONFIG) appConfig: AppConfig, 
    private http: AppHttpClient, 
    private locationService: LocationService) {
      this.appConfig = appConfig;
      this.clientId = localStorage["iota-simulator-uuid"];
      if (!this.clientId) {
        this.clientId = this.chance.floating({min: 0, max: 1}).toString(36).substring(2, 15) + this.chance.floating({min: 0, max: 1}).toString(36).substring(2, 15);
        localStorage["iota-simulator-uuid"] = encodeURIComponent(this.clientId);
      }
    }

  init() {
    return new Promise((resolve, reject) => {
      this.updateSimulatorVehicles([]).then((data:any) => {
        resolve(true);
      }, (error:any) => {
        reject(error);
      });
    });
  }

  destory(immediate: boolean) {
    return new Promise((resolve, reject) => {
      const param = immediate ? '' : '?timeoutInMinutes=1'
      const url = "/user/simulator" + param;
      const options = this._createRequestOptions();

      this.http.delete(url, options).subscribe((d: any) => {
        resolve(true);
      }, (error: any) => reject(error));
    });
  }

  getEmitter() {
    return this.emitter;
  }

  isVehicleSelected(): boolean {
    return (this.simulatorVehicles || []).length > 0;
  }

  getSimulatorVehicles(activeOnly:boolean = false): SimulatorVehicle[] {
    if (activeOnly) {
      return _.filter(this.simulatorVehicles, (vehicle:SimulatorVehicle) => vehicle.initialized);
    }
    return this.simulatorVehicles || [];
  }

  createSimulatorVehicle(props: any, initialize:boolean = false): SimulatorVehicle {
    const vehicle = new SimulatorVehicle(props);
    if (initialize)
      vehicle.init(this.appConfig, this.clientId, this.http, this._createRequestOptions());
    return vehicle;
  }

  setSimulatorVehicles(vehicles: SimulatorVehicle[]) {
    let selected: SimulatorVehicle = null;
    let vMap = _.object(_.map(this.simulatorVehicles, v => [v.id, v]));
    let newList: SimulatorVehicle[] = [];
    if (vehicles.length > 0) {
      const mo_id = this.selectedVehilce ? this.selectedVehilce.mo_id : null;
      _.forEach(vehicles, (v: SimulatorVehicle) => {
        if (vMap[v.mo_id]) {
          newList.push(vMap[v.model]);
        } else {
          newList.push(v);
          v.init(this.appConfig, this.clientId, this.http, this._createRequestOptions());
        }
        if (v.mo_id == mo_id) {
          selected = v;
        }
      });
      if (!selected) {
        selected = vehicles[0];
      }
    }

    this.simulatorVehicles = newList;
    this.emitter.emit({type: 'selection', state: 'updateList', data: this.simulatorVehicles});

    this.selectSimulatorVehicle(selected);
  }

  getSelectedSimulatorVehicle(): SimulatorVehicle {
    return this.selectedVehilce;
  }

  selectSimulatorVehicle(vehicle: SimulatorVehicle) {
    if (this.selectedVehilce != vehicle) {
      if (this.selectedVehilce) {
        this.selectedVehilce.monitorVehicle(null);
      }
      this.selectedVehilce = vehicle;
      this.emitter.emit({type: 'selection', state: 'updateSelection', data: this.selectedVehilce});
      if (this.selectedVehilce) {
        this.selectedVehilce.monitorVehicle(this.emitter);
      }
    }
  }

  updateSimulatorVehicles(vehicleIds: String[]) {
    return new Promise((resolve, reject) => {
      new Promise((resolve2) => {
        if (this.locationService.getMapRegion()) {
          let extent = this.locationService.getMapRegion().extent;
          resolve2({center: [extent[0]+(extent[2]-extent[0])/2, extent[1]+(extent[3]-extent[1])/2]});
        } else {
          this.locationService.getCurrentArea().then(area => {
            resolve2(area);
          }).catch(ex => {
            resolve2(this.locationService.getAreas()[0]);
          });
        }
      }).then((area:any) => {
        const longitude = area.center[0];
        const latitude = area.center[1];

        const data = {
          vehicleIds: vehicleIds,
          longitude: longitude,
          latitude: latitude,
          timeoutInMinutes: 30,
          distance: 100,
          noErrorOnExist: true
        }

        const url = "/user/simulator";
        const options = this._createRequestOptions();

        this.http.post(url, data, options).subscribe((d: any) => {
          this._loadSimulatorVehicles().subscribe((d2: any) => {
            resolve(d2);
          });
        }, (error:any) => reject(error));
      }).catch((error:any) => reject(error));
    });
  }

  getUsedVehicleIds() {
    const url = "/user/simulator/usedVehicles";
    const options = this._createRequestOptions();

    return new Promise((resolve, reject) => {
      return this.http.get(url, options).subscribe((data: any) => {
        resolve(data);
      }, (error:any) => {
        reject(error);
      });
    });
  }

  getSimulatableVehicles(numRecInPage: number, pageNumber: number) {
    const url = "/user/simulator/aveilableVehicles?numInPages=" + numRecInPage + "&pageIndex=" + pageNumber;
    const options = this._createRequestOptions();

    return new Promise((resolve, reject) => {
      return this.http.get(url, options).subscribe((data: any) => {
        resolve(data.data);
      }, (error:any) => {
        reject(error);
      });
    });
  }

  _loadSimulatorVehicles() {
    const url = "/user/simulator/vehicleList";
    const options = this._createRequestOptions();

    return this.http.get(url, options).pipe(map((d: any) => {
      const mo_id = this.selectedVehilce ? this.selectedVehilce.mo_id : null;
      this.selectedVehilce = null;
      let selected = null;
      this.simulatorVehicles = _.map(d.data, (v: any) => {
        let data = {};
        _.map(v.properties, (v, k) => {
          data[k] = new VehicleData(v);
        });
        let vehicle = this.createSimulatorVehicle({
          id: v.vehicle.serial_number || v.vehicle.internal_mo_id,
          vehicleId: v.vehicle.mo_id,
          mo_id: v.vehicle.siteid + ":" + v.vehicle.mo_id,
          model: v.vehicle.model,
          serial_number: v.vehicle.serial_number,
          properties: v.vehicle.properties,
          position: new Position(v.position),
          options: v.options,
          vehicleData: data
        }, true);
        if (mo_id == vehicle.mo_id) {
          selected = vehicle;
        }
        return vehicle;
      });

      if (!selected && this.simulatorVehicles.length > 0) {
        selected = this.simulatorVehicles[0];
      }
      this.emitter.emit({type: 'selection', state: 'updateList', data: this.simulatorVehicles});
      this.selectSimulatorVehicle(selected);

      return this.simulatorVehicles;
    }));
  }

  _createRequestOptions() {
    const headers: HttpHeaders = new HttpHeaders()
      .append("Content-Type", "application/JSON;charset=utf-8")
      .append("iota-simulator-uuid", this.clientId);
    const options = { headers: headers };
    return options
  }
}

/****************************************************************************
  Simulator Vehicle definition
*****************************************************************************/
const MAX_TRAJECTORY_LENGTH = 300;

export class SimulatorVehicle {
  initialized: boolean = false;
  id: string;
  vehicleId: string;
  mo_id: string;
  vendor: string = "";
  model: string = "";
  serial_number: string = "";
  properties: any;
  selected: boolean = false;
  position: Position = null;
  vehicleData: VehicleData[] = null;
  alerts: Object[] = null;
  alertLevel: string = "normal";

  appConfig: AppConfig;
  clientId: string;
  http: AppHttpClient;
  httpOptions: any;
  activeWsClient: any;
  activeWsSubscribe: any;
  emitter: EventEmitter<Object>;

  vehicle: any;
  state: any = "stop";
  routeData: any;
  trajectoryData: TrajectoryData[] = [];
  probe: any;
  destination: any;
  options: any = {};
  mode: string = "time";
  waypoints: any = [];

  isSearchingRoute: boolean = false;
  busy: boolean = false;

  constructor(props) {
    for (let key in props) {
      this[key] = props[key];
    }
    if (!this.properties) {
      this.properties = {};
    }
  }

  getClientId() {
    return this.clientId;
  }

  getVehicleId() {
    return this.vehicleId;
  }

  getMoId() {
    return this.mo_id;
  }

  getVehicle() {
    return this.vehicle;
  }

  init(appConfig: AppConfig, clientId: string, http: AppHttpClient, httpOptions: any) {
    if (this.initialized) {
      return;
    }
    this.appConfig = appConfig;
    this.clientId = clientId;
    this.http = http;
    this.httpOptions = httpOptions;
    this.initialized = true;

    const url = '/user/simulator/vehicle/' + this.vehicleId + '?properties=vehicle,position,state,options,properties';
    return new Promise((resolve, reject) => {
      this.http.get(url, httpOptions).subscribe((result: any) => {
        var data = result.data || {};
        this.vehicle = data.vehicle;
        this.updateVehicleData(data);
        this.getRouteData().then((result) => {
          if (!this.routeData) {
            this.searchRoute().then((data: any) => {
            }, (error) => {
              console.error("failed to search new route.");
            });
          }
        });
        resolve(data);
      }, (error:any) => {
        this.initialized = false;
        reject(error);
      });
    });
  }

  isBusy() {
    return this.isSearchingRoute || this.busy;
  }

  isDriving() {
    return this.state === 'driving';
  }

  startDriving() {
    if (this.isDriving()) {
      return new Promise((resolve, reject) => {
        resolve(false);
      });
    }
    const url = '/user/simulator/vehicle/' + this.vehicleId + '?command=start';
    const data = { parameters: { interval: 1000, mode: this.mode||'time', successWhenAlready: true }};

    return new Promise((resolve, reject) => {
      this.trajectoryData = [];
      this.busy = true;
      return this.http.put(url, data, this.httpOptions).pipe(map((result:any) => {
        var data = result.data && result.data[this.vehicleId];
        return this._updateState(data && data.state);
      })).subscribe((data:any) => {
        resolve(data);
      }, (error:any) => {
        reject(error);
      }, () => {
        this.busy = false;
      });
    });
  }

  stopDriving() {
    if (!this.isDriving()) {
      return new Promise((resolve, reject) => {
        resolve(false);
      });
    }
    const url = '/user/simulator/vehicle/' + this.vehicleId + '?command=stop';
    const data = { parameters: { successWhenAlready: true }};

    return new Promise((resolve, reject) => {
      this.busy = true;
      return this.http.put(url, data, this.httpOptions).pipe(map((result:any) => {
        var data = result.data && result.data[this.vehicleId];
        return this._updateState(data && data.state);
      })).subscribe((data:any) => {
        resolve(data);
      }, (error:any) => {
        reject(error);
        this.busy = false;
      }, () => {
        this.busy = false;
      });
    });
}

  searchRoute() {
    if (this.isDriving()) {
      return new Promise((resolve, reject) => {
        resolve(false);
      });
    }
    const url = "/user/simulator/vehicle/" + this.vehicleId + "/route";
    return new Promise((resolve, reject) => {
      this.busy = true;
      this.isSearchingRoute = true;
      return this.http.get(url, this.httpOptions).pipe(map((result:any) => {
        return this._updateRoute(result.data && result.data[this.vehicleId]);
      })).subscribe((data:any) => {
        resolve(data);
      }, (error:any) => {
        reject(error);
        this.busy = false;
        this.isSearchingRoute = false;
      }, () => {
        this.busy = false;
        this.isSearchingRoute = false;
      });
    });
  }

  setRouteMode(mode) {
    this.mode = mode;
  }

  setCurrentPosition(loc, donotResetRoute) {
    if (this.isDriving()) {
      return new Promise((resolve, reject) => {
        resolve(false);
      });
    }
    this.position = loc;

    const url = '/user/simulator/vehicle/' + this.vehicleId + '?command=position';
    const data = { parameters: { latitude: loc.latitude, longitude: loc.longitude, heading: loc.heading, doNotResetRoute: donotResetRoute } };

    return new Promise((resolve, reject) => {
      this.busy = true;
      this.isSearchingRoute = true;
      return this.http.put(url, data, this.httpOptions).pipe(map((result:any) => {
        return this._updateRoute(result.data && result.data[this.vehicleId]);
      })).subscribe((data:any) => {
        resolve(true);
      }, (error:any) => {
        reject(error);
        this.busy = false;
        this.isSearchingRoute = false;
      }, () => {
        this.busy = false;
        this.isSearchingRoute = false;
      });
    });
  }

  getCurrentPosition() {
    return this.position;
  }

  setDestination(loc) {
    if (this.isDriving()) {
      return new Promise((resolve, reject) => {
        resolve(false);
      });
    }
    this.destination = loc;

    const url = '/user/simulator/vehicle/' + this.vehicleId + '?command=route';
    const data = { parameters: { destination: { latitude: loc.latitude, longitude: loc.longitude, heading: loc.heading } } };

    return new Promise((resolve, reject) => {
      this.busy = true;
      this.isSearchingRoute = true;
      return this.http.put(url, data, this.httpOptions).pipe(map((result:any) => {
        return this._updateRoute(result.data && result.data[this.vehicleId]);
      })).subscribe((data:any) => {
        resolve(data);
      }, (error:any) => {
        reject(error);
        this.busy = false;
        this.isSearchingRoute = false;
     }, () => {
        this.busy = false;
        this.isSearchingRoute = false;
      });
    });
  }

  getDestination() {
    return this.destination;
  }

  setRouteOption(key, value) {
    if (this.isDriving()) {
      return new Promise((resolve, reject) => {
        resolve(false);
      });
    }
    this.options[key] = value;
    const url = '/user/simulator/vehicle/' + this.vehicleId + '?command=route';
    const data = { parameters: { options: this.options }};

    return new Promise((resolve, reject) => {
      this.busy = true;
      this.isSearchingRoute = true;
      return this.http.put(url, data, this.httpOptions).pipe(map((result:any) => {
        return this._updateRoute(result.data && result.data[this.vehicleId]);
      })).subscribe((data:any) => {
        resolve(data);
      }, (error:any) => {
        reject(error);
        this.busy = false;
        this.isSearchingRoute = false;
      }, () => {
        this.busy = false;
        this.isSearchingRoute = false;
      });
    });
  }

  getRouteOption(key) {
    return this.options[key];
  }

  getRouteData() {
    if (this.isDriving()) {
      return new Promise((resolve, reject) => {
        resolve(false);
      });
    }
    const url = '/user/simulator/vehicle/' + this.vehicleId + '/route';
    return new Promise((resolve, reject) => {
      this.busy = true;
      return this.http.get(url, this.httpOptions).pipe(map((result:any) => {
        return this._updateRoute(result.data);
      })).subscribe((data:any) => {
        resolve(data);
      }, (error:any) => {
        reject(error);
        this.busy = false;
      }, () => {
        this.busy = false;
      });
    });
  }

  getTrajectoryData() {
    return this.trajectoryData;
  }

  setWaypoints(waypoints) {
    if (this.isDriving() || this.waypoints === waypoints) {
      return new Promise((resolve, reject) => {
        resolve(false);
      });
    }

    if (this.waypoints && waypoints && this.waypoints.length == waypoints.length) {
      let same = true;
      for (let i = 0; i < waypoints.length; i++) {
        if (waypoints[i].latitude !== this.waypoints[i].latitude || waypoints[i].longitude !== this.waypoints[i].longitude) {
          same = false;
          break;
        }
      }
      if (same) {
        return new Promise((resolve, reject) => {
          resolve(false);
        });
      }
    }
    
    const url = '/user/simulator/vehicle/' + this.vehicleId + '?command=waypoints';
    const data = { parameters: waypoints };

    return new Promise((resolve, reject) => {
      return this.http.put(url, data, this.httpOptions).pipe(map((result:any) => {
        this.busy = true;
        return this._updateRoute(result.data && result.data[this.vehicleId]);
      })).subscribe((data:any) => {
        this.waypoints = waypoints;
        resolve(data);
      }, (error:any) => {
        reject(error);
        this.busy = false;
      }, () => {
        this.busy = false;
      });
    });
  }

  setProperties(properties) {
    this.properties = properties;

    const url = '/user/simulator/vehicle/' + this.vehicleId + '?command=properties';
    const data = { parameters: properties };

    return new Promise((resolve, reject) => {
      return this.http.put(url, data, this.httpOptions).subscribe((data:any) => {
        resolve(data);
      }, (error:any) => {
        reject(error);
      });
    });
  }

  unsetProperties(/*Array*/ propertyNames) {
    const url = '/user/simulator/vehicle/' + this.vehicleId + '?command=unsetproperties';
    const data = { parameters: propertyNames };

    return new Promise((resolve, reject) => {
      return this.http.put(url, data, this.httpOptions).subscribe((data:any) => {
        resolve(data);
      }, (error:any) => {
        reject(error);
      });
    });
  }

  setAcceleration(acceleration) {
    const url = '/user/simulator/vehicle/' + this.vehicleId + '?command=acceleration';
    const data = { parameters: acceleration };

    return new Promise((resolve, reject) => {
      return this.http.put(url, data, this.httpOptions).subscribe((data:any) => {
        resolve(data);
      }, (error:any) => {
        reject(error);
      });
    });
  }

  updateVehicleData(data) {
    this._updateOptions(data.options);
    this._updatePosition(data.position);
    this._updateProperties(data.properties);
    this._updateState(data.state);
  }

  _updatePosition(position) {
    if (position &&
      (this.position.latitude !== position.latitude || this.position.longitude !== position.longitude ||
        this.position.heading !== position.heading || this.position.speed !== position.speed)) {
      this.position = position;
      this.emitter && this.emitter.emit({type: "vehicle", state: "position", mo_id: this.mo_id, data: this.position});
    }
    return this.position;
  }

  _updateOptions(options) {
    if (options) {
      for (var key in options) {
        if (this.options[key] !== options[key]) {
          this.options = options;
          this.emitter && this.emitter.emit({type: "vehicle", state: "options", mo_id: this.mo_id, data: this.options});
          break;
        }
      }
    }
    return this.options;
  }

  _updateProperties(props) {
    if (props) {
      for (var key in props) {
        if (this.properties[key] !== props[key]) {
          this.properties = props;
          this.emitter && this.emitter.emit({type: "vehicle", state: "properties", mo_id: this.mo_id, data: this.properties});
          break;
        }
      }
    }
    return this.properties;
  }

  _updateState(state) {
    this.alertLevel = "normal";
    this.alerts = [];
    if (state && this.state !== state) {
      this.state = state;
      if (this.isDriving()) {
        this.watchChanges(['probe']);
      } else {
        this.clearWatch();
      }
      this.emitter && this.emitter.emit({type: "vehicle", state: "state", mo_id: this.mo_id, data: this.state});
    }
    return this.state;
  }

  _updateRoute(route) {
    this.alertLevel = "normal";
    this.alerts = [];
    this.trajectoryData = [];
    if (this.routeData !== route) {
      this.routeData = route || [];
      this.emitter && this.emitter.emit({type: "vehicle", state: "route", mo_id: this.mo_id, data: this.routeData});
    }
    if (this.routeData && this.routeData.length > 0) {
      var first = this.routeData[0];
      if (first.length > 0)
        this._updatePosition({ latitude: first[0].lat, longitude: first[0].lon, heading: first[0].heading, speed: first[0].speed });
    }
    return this.routeData;
  }

  _updateProbe(probe, error) {
    if (this.probe !== probe) {
      this.probe = probe || {};
      if (this.trajectoryData.length > MAX_TRAJECTORY_LENGTH) {
        this.trajectoryData.shift();
      }

      if (probe && probe.info && probe.info.alerts) {
        this.alerts = probe.info.alerts.items;
        if (!probe.alertLevel) {
          let a = probe.info.alerts;
          if (a.Critical > 0 || a.High > 0) {
            probe.alertLevel = 'critical';
          } else if (a.Medium > 0 || a.Low > 0) {
            probe.alertLevel = 'troubled';
          } else {
            probe.alertLevel = 'normal';
          }
        }
        this.alertLevel = probe.alertLevel;
      } else {
        this.alerts = null;
      }

      this.trajectoryData.push(new TrajectoryData({latitude: probe.latitude, longitude: probe.longitude, matched: !error}));
      this.emitter && this.emitter.emit({type: "vehicle", state: "probe", mo_id: this.mo_id, data: this.probe, error: error});
    }
    if (probe && !isNaN(probe.latitude) && !isNaN(probe.longitude)) {
      this._updatePosition({ latitude: probe.latitude, longitude: probe.longitude, heading: probe.heading, speed: probe.speed });
    }
  }

  monitorVehicle(emitter: EventEmitter<Object>) {
    this.emitter = emitter;
    if (this.emitter) {
      this.position && this.emitter.emit({type: "vehicle", state: "position", mo_id: this.mo_id, data: this.position});
      this.options && this.emitter.emit({type: "vehicle", state: "options", mo_id: this.mo_id, data: this.options});
      this.properties && this.emitter.emit({type: "vehicle", state: "properties", mo_id: this.mo_id, data: this.properties});
      this.state && this.emitter.emit({type: "vehicle", state: "state", mo_id: this.mo_id, data: this.state});
      this.routeData && this.emitter.emit({type: "vehicle", state: "route", mo_id: this.mo_id, data: this.routeData});
    }
  }

  watchChanges(properties) {
    const url = '/user/simulator/watch?clientId=' + this.clientId + '&vehicleId=' + this.vehicleId;
    return this.http.get(url, this.httpOptions).subscribe((data:any) => {
      this._watchChanges(properties);
    }, (error:any) => {
      console.error("Failed to connect simulator.")
    });
  }

  _watchChanges(properties) {
    if (properties && properties.length === 0) {
      return;
    }

    var wsProtocol = (window.location.protocol == "https:") ? "wss" : "ws";
    var wssUrl = wsProtocol + '://' + this.appConfig.webApiHost;
    wssUrl += '/user/simulator/watch?clientId=' + this.clientId + '&vehicleId=' + this.vehicleId;
    if (properties) {
      wssUrl += '&properties=' + properties.join(',');
    }
    var ws = this.activeWsClient = webSocket(wssUrl);
    this.activeWsSubscribe = ws.pipe(retry(10)).subscribe((message: any) => {
      var messageData = message && message.data;
      if (!messageData) {
        console.error("no data contents");
        return;
      }

      messageData.forEach((data) => {
        var error = data.error;
        if (data.type === 'probe') {
          this._updateProbe(data.data, error);
        } else if (data.error) {
          console.error("data error: " + error);
        }
      });
    });
  }

  clearWatch() {
		if (this.activeWsSubscribe) {
			this.activeWsSubscribe.unsubscribe();
			this.activeWsSubscribe = null;
		}
		if (this.activeWsClient) {
			if (this.activeWsClient.socket && this.activeWsClient.socket.readyState === 1) {
				this.activeWsClient.socket.close();
			}
			this.activeWsClient = null;
		}
  }
}

export class Position {
  longitude = 0;
  latitude = 0;
  altitude = 0;
  speed = 0;
  heading = 0;

  constructor(props) {
    for (let key in props) {
      this[key] = props[key];
    }
  }
}

export class VehicleData {
  minValue = 0;
  maxValue = 0;
  defaultValue = 0;
  fixedValue = 0;
  value = 0;

  constructor(props) {
    for (let key in props) {
      this[key] = props[key];
    }
  }
}

export class TrajectoryData {
  longitude = 0;
  latitude = 0;
  matched: boolean = true;

  constructor(props) {
    for (let key in props) {
      this[key] = props[key];
    }
  }
}
