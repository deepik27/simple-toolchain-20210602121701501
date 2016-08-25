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
		controller: function ClientTop($scope, $http, mobileClientService, assetService, carProbeService) {
			var updateUIHandle = null;
			
			var settingProviders = {
   				 	"mobileClientService": {title: "Mobile", provider: mobileClientService},
				 	"assetService": {title: "Device", name: "assetService", provider: assetService},
				 	"carProbeService": {title: "Car Probe", provider: carProbeService}
			};
		
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

		    function loadSettings(names) {
		    	if (!names) {
	    			if (!$scope.settings) $scope.settings = {};
	    			if (!$scope.updatedSettings) $scope.updatedSettings = {};

	    			names = [];
			    	for (var key in settingProviders) {
			    		names.push(key);
			    	}
		    	}

		    	for (var i = 0; i < names.length; i++) {
		    		var name = names[i];
		    		var provider = settingProviders[name].provider;
	    			if (provider && provider.getSettings) {
	    				var settings = provider.getSettings();
	    				var updatedSettings = copySettings(settings);
	    				$scope.settings[name] = settings;
				        $scope.updatedSettings[name] = updatedSettings;
		    		}
		    	}
		    }
		    
		    function saveSettings(names) {
		    	if (!names) {
		    		names = [];
			    	for (var key in settingProviders) {
			    		names.push(key);
			    	}
		    	}
		    	for (var i = 0; i < names.length; i++) {
		    		var name = names[i];
		    		if ($scope.updatedSettings[name]) {
		    			$scope.settings[name] = copySettings($scope.updatedSettings[name]);
		    		}

		    		var settings = $scope.settings[name];
		    		if (settings) {
			    		var provider = settingProviders[name].provider;
			    		if (provider && provider.updateSettings) {
			    			provider.updateSettings(copySettings(settings));
			    		}
		    		}
		    	}
		    }

		    // edit asset ids
		    $scope.isEditing = false;
		    $scope.editAssets = function() {
		    	if ($scope.isEditing) {
			    	saveSettings(["assetService"]);
		    	}
		    	$scope.isEditing = !$scope.isEditing;
		    }
		    $scope.cancelAssets = function() {
		    	$scope.isEditing = false;
		    	loadSettings(["assetService"]);
 		    }

		    // for test purpose when using anonymous asset ids
		    $scope.isAnonymous = assetService.isAnonymousAsset();
		    $scope.generateIds = function() {
		    	assetService.generateIds();
		    	loadSettings(["assetService"]);
		    }
			
		    // apply setting changes
		    $scope.applySettings = function() {
		    	saveSettings(["carProbeService"]);
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
