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
var htmlClient = angular.module('htmlClient',['ui.router']);

htmlClient.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
		$stateProvider
			.state('home', {
				url: '/home?loc&vehicleId&serial_number&vendor&driverId',
				template: '<client-drive></client-drive>',
				controller: function($stateParams, virtualGeoLocation, assetService){
					if($stateParams.loc){
						var coord = $stateParams.loc.split(','); // --> [lat,lng]
						if(coord.length === 2){
							virtualGeoLocation.setCurrentPosition({lat: coord[0], lon: coord[1]});
						}
					}
					if($stateParams.vehicleId){
						assetService.setVehicleId($stateParams.vehicleId);
					}
					if($stateParams.driverId){
						assetService.setDriverId($stateParams.driverId);
					}
					assetService.serial_number = $stateParams.serial_number; 
					assetService.vendor = $stateParams.vendor; 
				}
			})
			.state('profile', {
				url: '/profile',
				template: '<client-profile></client-profile>',
			})
			.state('trips', {
				url: '/trips',
				template: '<client-trip></client-trip>',  // need to show trip list before showing particular trip
			})
			.state('settings', {
				url: '/settings',
				template: '<client-settings></client-settings>',
			});
	      $urlRouterProvider.otherwise('/home');
	}])
;
htmlClient.controller('header', ['$scope', function($scope){
    $scope.hideHeader = "none";
}]);

htmlClient.controller('footer', ['$scope', function($scope){
    $scope.hideFooter = "none";
}]);