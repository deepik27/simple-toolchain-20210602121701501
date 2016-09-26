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
var $stateProviderRef = null;
 
angular.module('fleetManagementSimulator', ['ui.router', 'ngAnimate'])
	.config(['$locationProvider', '$stateProvider', function($locationProvider, $stateProvider) {
		$locationProvider.html5Mode(true); 
		$stateProviderRef = $stateProvider;
	}])
 
	/* === GENERAL CONTROLLERS === */
	.controller('mainCtrl', ['$scope', '$state', '$http', '$sce', '$location', '$window', '$timeout', function($scope, $state, $http, $sce, $location, $window, $timeout) {
		$window.onbeforeunload = function (e) {
			// inactivate when user closes simulator window
			$scope.vehicles.forEach(function(v){
				$http({
					method: "PUT",
					url: "/user/vehicle/" + v.mo_id + "?addition=true",
					headers: {
						"Content-Type": "application/JSON;charset=utf-8"
					},
					data: {mo_id: v.mo_id, status: "inactive"}
				});
			});
			$timeout(function(){}, 3000);
			return "Top simultors?";
		};
		// Get simulation vehicles
		$http({
			method: "GET",
			url: "/user/simulatedVehicles"
		}).success(function(data, status){					
			var vehicles = data.data; 
			if(vehicles.length > 5){
				vehicles = vehicles.slice(0, 5);
			}
			$http({
				method: "GET",
				url: "/user/simulatedDriver"
			}).success(function(drivers, status){
				var loc = $location.search()["loc"];
				vehicles.forEach(function(vehicle, i){
					var url = "../htmlclient/#/home" 
						+ "?vehicleId=" + vehicle.mo_id 
						+ "&driverId=" + drivers.data[0].driver_id; 
					if(vehicle.vendor){
						url += "&vendor=" + vehicle.vendor;
					}
					if(vehicle.serial_number){
						url += "&serial_number=" + vehicle.serial_number;
					}
					if(loc){
						url += "&loc=" + loc;
					}
					vehicle.url = $sce.trustAsResourceUrl(url);
					vehicle.display = i == 0 ? "" : "none";		
				});
				$scope.vehicles = vehicles;

				// dynamic state
				if(vehicles.length > 0){
					for (i=0; i < vehicles.length; i++) {
						$stateProviderRef.state(vehicles[i].mo_id, {
							url: "/fleet.html#" + vehicles[i].mo_id,
							views: {
								'vehicle': {
									templateUrl: '/htmlclient/vehicle.html',
									persist: true
								}
							}
						});
					}
					$scope.selectedIndex = 0;
					$state.go(vehicles[0].mo_id);
				}
			
			}).error(function(error, status){
				console.error("Cannot get simulated driver");
			});
		}).error(function(error, status){
			console.error("Cannot get simulated vehicles");
		});
		
		$scope.selectItem = function(index) {
			var vehicles = $scope.vehicles;	    	 
			vehicles.forEach(function(vehicle, i){
				vehicle.display = i == index ? "" : "none";		
			});
			$scope.selectedIndex = index;
		};
    }])
