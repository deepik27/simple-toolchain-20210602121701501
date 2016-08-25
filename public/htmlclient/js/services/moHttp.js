/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
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

/**
 * Provide shortcut method to make HTTP request as an mobile client
 * e.g.: `moHttp.get('/path')`, `moHttp({method: 'GET', url: '/path', ...})`
 */
angular.module('htmlClient')
.factory('moHttp', function ($http, mobileClientService, carProbeService, assetService){
	var moHttp = function moHttp(config, withVehicleId){
		var config_ = mobileClientService.makeRequestOption(config);
		if(withVehicleId){
			var vehicleId = carProbeService.vehicleId || assetService.getVehicleId();
			if(config_.url.indexOf('?') !== -1){
				config_.url = config_.url + '&mo_id=' + vehicleId;
			}else{
				config_.url = config_.url + '?mo_id=' + vehicleId;
			}
		}
		return $http(config_);
	};
	moHttp.get = function(url, config){
		config = config || {};
		config.method = 'GET';
		config.url = url;
		return moHttp(config);
	};
	moHttp.getWithVehicleId = function(url, config){
		config = config || {};
		config.method = 'GET';
		config.url = url;
		return moHttp(config, true);
	};
	return moHttp;
})
;