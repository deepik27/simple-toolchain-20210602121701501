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
 * Service to manage asset ids
 */
angular.module('htmlClient')
.factory('assetService', function($q, $timeout, settingsService, mobileClientService) {
	var isAnomymous = false;
	var match = location.search.match(/anonymous=(.*?)(&|$)/);
	if(match) {
		isAnomymous = decodeURIComponent(match[1]) === "true";
	}
	
    return {
		settings: null,
		getVehicleId: function() {
			var settings = this.getSettings();
			return settings.iotaStarterVehicleId;
		},
		setVehicleId: function(vehicleId){
			var settings = this.getSettings();
			if (vehicleId)
				settings.iotaStarterVehicleId = vehicleId;
			else
				delete settings.iotaStarterVehicleId;
			this.updateSettings(settings);
		},
		getDriverId: function(){
			var settings = this.getSettings();
			return settings.iotaStarterDriverId;
		},
		setDriverId: function(driverId){
			var settings = this.getSettings();
			if (driverId)
				settings.iotaStarterDriverId = driverId;
			else
				delete settings.iotaStarterDriverId;
			this.updateSettings(settings);
		},
		isAutoManagedAsset: function(){
			if (this.isAnonymousAsset())
				return false;
			var settings = this.getSettings();
			return settings.isAutoManagedAsset;
		},
		setAutoManagedAsset: function(isAutoManagedAsset) {
			var settings = this.getSettings();
			if (isAutoManagedAsset)
				settings.isAutoManagedAsset = isAutoManagedAsset;
			else
				delete settings.isAutoManagedAsset;
			this.updateSettings(settings);
		},
		isAnonymousAsset: function(){
			return isAnomymous;
		},
    	
    	generateIds: function() {
    		if (this.getVehicleId()) {
    			var confirmMsg = this.isAutoManagedAsset() ? 
    					"Vehicle ID and Driver ID already exist. Are you sure you want to override them?" : 
    					"IDs managed by the IoT Automotive service already exist. Are you sure you want to override them?";
    			if (!confirm(confirmMsg))
    				return false;
    		}
    		this.setVehicleId(mobileClientService.uuid());
    		this.setDriverId(mobileClientService.uuid());
    		this.setAutoManagedAsset(false);
    		return true;
    	},
    	
    	clearIds: function() {
    		if (this.getVehicleId()) {
    			if (!confirm("Vehicle ID and Driver ID already exist. Are you sure you want to clear them?"))
    				return false;
    		}
    		this.setVehicleId();
    		this.setDriverId();
    		this.setAutoManagedAsset(false);
    		return true;
    	},
		
		getSettings: function() {
			if (this.settings)
				return this.settings;
			this.settings = settingsService.loadSettings("assetService", {});
			return this.settings;
		},
		
		updateSettings: function(settings) {
			if (this.settings.iotaStarterVehicleId !== settings.iotaStarterVehicleId || this.settings.iotaStarterDriverId !== settings.iotaStarterDriverId) {
	    		settings.isAutoManagedAsset = false;
			}
			this.settings = settings;
			settingsService.saveSettings("assetService", settings);
		}
	};
})
;