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

(function(scriptBaseUrl){
	angular.module('htmlClient').
	component('clientSettings', {
		templateUrl: scriptBaseUrl + 'html-client-settings.html',
		controller: function ClientTop($scope, $http, mobileUtilityService, carProbeService) {
			var updateUIHandle = null;
			
			var settingProviders = [
				 	{title: "Device", name: "mobileUtilityService", provider: mobileUtilityService},
				 	{title: "Car Probe", name: "carProbeService", provider: carProbeService}
			];
		
			//////////////////////////////////////////////////////////////////
			// Settings
			//////////////////////////////////////////////////////////////////
		    function copySettings(settings) {
		    	if (!settings)
		    		return null;
		    	
		    	var newSettings = {};
		        for (var i in settings) {
		        	newSettings[i] = settings[i];
		        }
		        return newSettings;
		    }

		    function loadSettings() {
		    	var settings = {};
		    	var updatedSettings = {};
		    	for (var key in settingProviders) {
		    		var name = settingProviders[key].name;
		    		var provider = settingProviders[key].provider;
	    			if (provider && provider.getSettings) {
	    				settings[name] = provider.getSettings();
	    				updatedSettings[name] = copySettings(settings[name]);
		    		}
		    	}
		        $scope.settings = settings;
		        $scope.updatedSettings = updatedSettings;
		    }
		    
		    function saveSettings() {
		    	for (var key in $scope.updatedSettings) {
		    		$scope.settings[key] = copySettings($scope.updatedSettings[key]);
		    	}
		    	for (var key in settingProviders) {
		    		var name = settingProviders[key].name;
		    		var settings = $scope.settings[name];
		    		if (settings) {
			    		var provider = settingProviders[key].provider;
			    		if (provider && provider.updateSettings) {
			    			provider.updateSettings(copySettings(settings));
			    		}
		    		}
		    	}
		    }
			
		    $scope.applySettings = function() {
		    	saveSettings();
		    }

	        // Settings
	    	loadSettings();
		}
	});
})((function(){
	// tweak to use script-relative path
	var scripts = document.getElementsByTagName('script');
	var scriptUrl = scripts[scripts.length - 1].src;
	return scriptUrl.substring(0, scriptUrl.lastIndexOf('/') + 1);
})());
