import { Injectable, Inject } from '@angular/core';
import { Http, Request, Response, URLSearchParams } from '@angular/http';
import { Observable, Subject } from 'rxjs/Rx.DOM';

import { RealtimeDeviceDataProvider } from './realtime-device';


var CAR_PROBE_URL = '/user/carProbe';

// internal settings
var CAR_STATUS_REFRESH_PERIOD = 0 // was 15000; now, setting 0 not to update via polling (but by WebSock)


@Injectable()
export class RealtimeDeviceDataProviderService {
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
    private $http: Http,
		@Inject('webApiHost') private webApiHost: string
  ) {  }

  private getQs(extent: any[], vehicleId: string){
    var xt = extent ? extent: [-180, -90, 180, 90];
    var qlist = ['min_lat='+xt[1], 'min_lng='+xt[0],
                  'max_lat='+xt[3], 'max_lng='+xt[2]];
    if(vehicleId)
        qlist.push('vehicleId=' + vehicleId);
    return qlist.join('&');
  }

  getProbe(vehicleId: string) {
    var qs = this.getQs(null, vehicleId);
    return this.$http.get(CAR_PROBE_URL + '?' + qs).toPromise();
  }

  getProvider(){
    return this.provider;
  }

	/**
	 * Start trackgin a region
	 */
	startTracking(extentOrVehicleId, mapHelper?, updateEvents?){
    this.stopTracking(true, mapHelper);

    var qs: string;
    if(typeof extentOrVehicleId === 'string'){
      qs = this.getQs(null, extentOrVehicleId);
    }else{
      var extent = extentOrVehicleId;
      var xt = mapHelper ? mapHelper.expandExtent(extent, 0.1) : extent; // get extended extent to track for map
      qs = this.getQs(xt, null);
    }

		// handle cars
		this.refreshCarStatus(qs).then((data) => {
			// adjust animation time
			if(data.serverTime){
				mapHelper && mapHelper.setTimeFromServerRightNow(data.serverTime);
			}

			// start websock server for real-time tracking
			this.stopWsClient();
			if (data.wssPath){
				var startWssClient = () => {
					var wsProtocol = (location.protocol == "https:") ? "wss" : "ws";
					var wssUrl = wsProtocol + '://' + this.webApiHost + data.wssPath;
					// websock client to keep the device locations latest
					var ws = this.activeWsClient = Observable.webSocket(wssUrl);
					this.activeWsSubscribe = ws.subscribe((data: any) => {
						this.provider.addDeviceSamples(data.devices, true);
					}, (e) => {
						if (e.type === 'close'){
							this.activeWsSubscribe = null;
							ws.socket.close(); //closeObserver(); observer.dispose();
							// handle close event
							if(ws === this.activeWsClient){ // reconnect only when this ws is active ws
								console.log('got wss socket close event. reopening...')
								this.activeWsClient = null;
								startWssClient(); // restart!
								return;
							}
						}
						// error
						console.error('Error event from WebSock: ', e);
					});
				};
				startWssClient(); // start wss
			}

			// start animation
			mapHelper && mapHelper.startAnimation();

			// schedule status timer
			var carStatusTimerFunc = () => {
				this.refreshCarStatus(qs);
				this.carStatusIntervalTimer = setTimeout(carStatusTimerFunc, CAR_STATUS_REFRESH_PERIOD);
			}
			if(CAR_STATUS_REFRESH_PERIOD > 0)
					this.carStatusIntervalTimer = setTimeout(carStatusTimerFunc, CAR_STATUS_REFRESH_PERIOD);
		}, (err) => {
			console.warn('it\'s fail to access the server.');
		})

		// handle driver events
		this.refreshDriverEvents(qs, updateEvents);
	};
	// Add/update cars with DB info
	refreshCarStatus(qs) {
		return this.$http.get(CAR_PROBE_URL + '?' + qs).toPromise().then((resp) => {
			let data = resp.json();
			if(data.devices){
				this.provider.addDeviceSamples(data.devices, true);
			}
			return data; // return resp so that subsequent can use the resp
		});
	};
	// Add driver events on the map
	refreshDriverEvents(qs, updateEvents: ((events: any[]) => void)){
		return this.$http.get(CAR_PROBE_URL + '?' + qs).toPromise().then((resp) => {
			let data = resp.json();
			var events = data.devices;
			if (events){
        updateEvents && updateEvents(events);
      }
		});
	};

	/**
	 * Stop server connection
	 */
	stopTracking(intermediate, mapHelper){
		// stop timer
		if(this.carStatusIntervalTimer){
			clearTimeout(this.carStatusIntervalTimer);
			this.carStatusIntervalTimer = 0;
		}
		if(!intermediate){
			// stop animation
			mapHelper && mapHelper.stopAnimation();
			// stop WebSock client
			this.stopWsClient();
		}
	};
	stopWsClient(){
		if (this.activeWsSubscribe){
			this.activeWsSubscribe.unsubscribe();
			this.activeWsSubscribe = null;
		}
		if (this.activeWsClient){
			if (this.activeWsClient.socket && this.activeWsClient.socket){
				this.activeWsClient.socket.close();
			}
			this.activeWsClient = null;
		}
	}


}
