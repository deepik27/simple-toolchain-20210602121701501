/**
 * Copyright 2016,2020 IBM Corp. All Rights Reserved.
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
import { Injectable, Inject } from '@angular/core';
import { AppHttpClient } from './http-client';
import { retry } from 'rxjs/operators';
import { webSocket } from 'rxjs/webSocket';

import { RealtimeDeviceDataProvider } from './realtime-device';
import { APP_CONFIG, AppConfig } from '../app-config';


var CAR_PROBE_URL = '/user/carProbe';
var VEHICLE_URL = '/user/vehicle';

// internal settings
var CAR_STATUS_REFRESH_PERIOD = 0 // was 15000; now, setting 0 not to update via polling (but by WebSock)


@Injectable()
export class RealtimeDeviceDataProviderService {
	private webApiHost: string;
	private appConfig: AppConfig;
	//
	// Devices management
	//
	provider = new RealtimeDeviceDataProvider();

	//
	// Connection to server and reflecting the response to the Map
	//
	activeWsClient = null;
	activeWsSubscribe = null; // WebSocket client
	carStatusIntervalTimer: any;

	constructor(
		private $http: AppHttpClient,
		@Inject(APP_CONFIG) appConfig: AppConfig
	) {
		this.webApiHost = appConfig.webApiHost;
		this.appConfig = appConfig;
	}

	private getQs(extent: any[], vehicleId: string) {
		if (vehicleId) {
			return 'vehicleId=' + vehicleId;
		} else if (extent) {
			let min_lon = extent[0];
			let min_lat = extent[1];
			let max_lon = extent[2];
			let max_lat = extent[3];
			if (max_lon - min_lon > 180 || max_lat - min_lat > 90) {
				console.warn("Monitoring area is too large.");
				return null;
			}
			return 'min_lat='+min_lat + '&min_lng='+min_lon + '&max_lat='+max_lat + '&max_lng='+max_lon;
		}
	}

	getProbe(vehicleId: string) {
		var qs = this.getQs(null, vehicleId);
		if (!qs) {
			return;
		}
		return this.$http.get(CAR_PROBE_URL + '?' + qs).toPromise();
	}

	getVehicle(vehicleId: string) {
		return new Promise((resolve, reject) => {
			this.$http.get(VEHICLE_URL + '/' + vehicleId)
				.subscribe((data: any) => {
					resolve(data);
				}, (error: any) => {
					reject(error);
				});
		});
	}

	scheduleVehicleDataLoading(vehicleId: string) {
		var device = this.provider.getDevice(vehicleId);
		if (device && !device.vehicle) {
			device.vehicle = {};
			this.getVehicle(vehicleId)
				.then(vehicle => { device.vehicle = vehicle; })
				.catch(err => {
					if (err.status === 404) {
						console.log(err);
					} else {
						console.error(err);
						device.vehicle = undefined;
					}
				});
		}
	}

	getProvider() {
		return this.provider;
	}

	/**
	 * Start trackgin a region
	 */
	startTracking(extentOrVehicleId, mapHelper?, updateEvents?) {
		this.stopTracking(true, mapHelper);

		var qs: string;
		if (typeof extentOrVehicleId === 'string') {
			qs = this.getQs(null, extentOrVehicleId);
		} else {
			var extent = extentOrVehicleId;
			var xt = mapHelper ? mapHelper.expandExtent(extent, 0.1) : extent; // get extended extent to track for map
			qs = this.getQs(xt, null);
		}
		if (!qs) {
			return;
		}

		// handle cars
		this.refreshCarStatus(qs).then((data) => {
			// adjust animation time
			if (data.serverTime) {
				mapHelper && mapHelper.setTimeFromServerRightNow(data.serverTime);
			}

			// start websock server for real-time tracking
			this.stopWsClient();
			if (data.wssPath) {
				var startWssClient = () => {
					var wsProtocol = (location.protocol == "https:") ? "wss" : "ws";
					var wssUrl = wsProtocol + '://' + this.webApiHost + data.wssPath;
					// websock client to keep the device locations latest
					var ws = this.activeWsClient = webSocket(wssUrl);
					this.activeWsSubscribe = ws.pipe(retry(10)).subscribe((data: any) => {
						if (data.type === "region") {
							this.provider.setRegionState(data.region_id, data.state);
						} else if (data.type === "probe") {
							this.provider.addDeviceSamples(data.region_id, data.devices, false);
						}
					});
				};
				startWssClient(); // start wss
			}

			// start animation
			mapHelper && mapHelper.startAnimation();

			var events = data && data.devices;
			if (events) {
				updateEvents && updateEvents(events);
			}

			// schedule status timer
			var carStatusTimerFunc = () => {
				this.refreshCarStatus(qs);
				this.carStatusIntervalTimer = setTimeout(carStatusTimerFunc, CAR_STATUS_REFRESH_PERIOD);
			}
			if (CAR_STATUS_REFRESH_PERIOD > 0)
				this.carStatusIntervalTimer = setTimeout(carStatusTimerFunc, CAR_STATUS_REFRESH_PERIOD);
		}, (err) => {
			console.warn('it\'s fail to access the server.');
		})

		// handle driver events
		//		this.refreshDriverEvents(qs, updateEvents);
	};
	// Add/update cars with DB info
	refreshCarStatus(qs) {
		return this.$http.get(CAR_PROBE_URL + '?' + qs).toPromise().then((data: any) => {
			if (data.devices) {
				this.provider.addDeviceSamples(data.region_id, data.devices, true);
			}
			return data; // return resp so that subsequent can use the resp
		});
	};
	// Add driver events on the map
	refreshDriverEvents(qs, updateEvents: ((events: any[]) => void)) {
		return this.$http.get(CAR_PROBE_URL + '?' + qs).toPromise().then((data: any) => {
			var events = data.devices;
			if (events) {
				updateEvents && updateEvents(events);
			}
		});
	};

	/**
	 * Stop server connection
	 */
	stopTracking(intermediate, mapHelper) {
		// stop timer
		if (this.carStatusIntervalTimer) {
			clearTimeout(this.carStatusIntervalTimer);
			this.carStatusIntervalTimer = 0;
		}
		if (!intermediate) {
			// stop animation
			mapHelper && mapHelper.stopAnimation();
			// stop WebSock client
			this.stopWsClient();
		}
	};
	stopWsClient() {
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
