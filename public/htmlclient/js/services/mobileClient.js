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

/*
 * Generate and get mobile client uuid that is substitute for mobile user id
 */
angular.module('htmlClient')
.factory('mobileClientService', function($q, $timeout, settingsService) {
    return {
		settings: null,
		
		/*
		 * get client uuid
		 */
		getMobileDeviceId: function() {
			var settings = this.getSettings();
			return settings.mobileClientUuid;
		},

		uuid: function() {
			return chance.guid();
		},
		
		/*
		 * add client uuid to http request option. call this for any request that requires authentication
		 */
		makeRequestOption: function(request) {
			if (!request.headers)
				request.headers = {};
			request.headers["iota-starter-uuid"] = this.getMobileDeviceId();
			if (!request.dataType)
				request.dataType = "json";
			return request;
		},
		
		getSettings: function() {
			if (this.settings)
				return this.settings;
			var settings = settingsService.loadSettings("mobileClientService", {});
			if (!settings.mobileClientUuid) {
				settings.mobileClientUuid = this.uuid();
				this.updateSettings(settings);
			} else {
				this.settings = settings;
			}
			return settings;
		},
		
		updateSettings: function(settings) {
			this.settings = settings;
			settingsService.saveSettings("mobileClientService", settings);
		}
	};
})
;