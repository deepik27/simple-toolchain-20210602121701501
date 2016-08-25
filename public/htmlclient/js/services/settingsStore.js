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
 * Save and load setting values
 */
angular.module('htmlClient')
.factory('settingsService', function($q, $timeout) {
	return {
		category: "iot_auto_settings",
		settingsCache: {},
		loadSettings: function(componentName, defaultValues) {
			if (!componentName)
				return null;
			
			if (this.settingsCache[componentName]) {
				return this.settingsCache[componentName];
			}
			
	        var settings = $.cookie(this.category + '.' + componentName);
	        if (settings) {
	        	try {
	            	settings = JSON.parse(settings);
	        	} catch(e) {
					console.error(e);
	        	}
	        }
            settings = _.extend({}, defaultValues, settings||{});
	        this.settingsCache[componentName] = settings;
	        return settings;
		},
    
	    saveSettings: function(componentName, settings, expires) {
			if (!componentName)
				return;
	        this.settingsCache[componentName] = settings;
	        if (!expires) expires = 365 * 20;
	        $.cookie(this.category + '.' + componentName, settings ? JSON.stringify(settings) : null, {expires: expires});
	    }
	};
})
;