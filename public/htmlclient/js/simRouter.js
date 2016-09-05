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
 
angular.module('fleetManagementSimulator', ['ngAnimate'])
	.config(["$locationProvider", function($locationProvider) {
		$locationProvider.html5Mode(true); 
	}])
	/* === GENERAL CONTROLLERS === */
	.controller('mainCtrl', ['$scope', '$http', '$sce', '$location', function($scope, $http, $sce, $location) {
		// Get simulation vehicles
		$http({
			method: "GET",
			url: "/user/simulatedVehicle"
		}).success(function(data, status){
			var vehicles = data.data; 
			if(vehicles.length > 5){
				vehicles = vehicles.slice(0, 5);		
			}
			var loc = $location.search()["loc"];
			vehicles.forEach(function(vehicle, i){
				var url = "../htmlclient/#/home" 
					+ "?vehicleId=" + vehicle.mo_id + 
					+ "&driverId=19f8b8bb-8dc7-4064-9295-4323c4092723" 
				if(loc){
					url += "&loc=" + loc;
				}
				vehicle.url = $sce.trustAsResourceUrl(url);
				vehicle.display = i == 0 ? "" : "none";		
			});
			$scope.vehicles = vehicles;
		}).error(function(error, status){
			console.error("Cannot get route for simulation");
		});

		$scope.selectItem = function(index) {
			var vehicles = $scope.vehicles;	    	 
			vehicles.forEach(function(vehicle, i){
				vehicle.display = i == index ? "" : "none";		
			});
		};
    }])
