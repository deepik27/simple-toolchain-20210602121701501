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
var selectedItem = 0;

angular.module('fleetManagementSimulator', ['ui.router', 'ngAnimate'])

    /* === APP CONFIG === */
    .config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {      
      $stateProviderRef = $stateProvider;
    }])

    .run(function ($rootScope, $state, $stateParams) {
        $rootScope.$on('$stateChangeStart', function(evt, to, params) {
          if (to.redirectTo) {
            evt.preventDefault();
            $state.go(to.redirectTo, params, {location: 'replace'})
          }
        });
    })
    
    /* === GENERAL CONTROLLERS === */
    .controller('mainCtrl', ['$scope', '$state', '$rootScope', '$http', '$sce', function($scope, $state, $rootScope, $http, $sce) {
    	// Get simulation vehicles
		$http({
			method: "GET",
			url: "/user/simulatedVehicle"
		}).success(function(data, status){
			var vehicles = data.data; 
			if(vehicles.length > 5){
				vehicles = vehicles.slice(0, 5);		
			}
       		vehicles.forEach(function(vehicle, i){
       			vehicle.url = $sce.trustAsResourceUrl("../htmlclient/#/home?driverId=19f8b8bb-8dc7-4064-9295-4323c4092723&vehicleId=" + vehicle.mo_id);
				vehicle.display = i == 0 ? "" : "none";		
       		});
			$rootScope.vehicles = vehicles;
		}).error(function(error, status){
			console.error("Cannot get route for simulation");
		});
        
        // Make dynamic states for each vehicle
        $stateProviderRef
          .state('index', {
            url: '',
            templateUrl: 'vehicle.html'
          })

    }])
    
    .controller('vehiclesCtrl', ['$scope', '$state', '$rootScope', function($scope, $state, $rootScope) {
       $rootScope.selectItem = function(index) {
	    	var vehicles = $rootScope.vehicles;	    	 
       		vehicles.forEach(function(vehicle, i){
				vehicle.display = i == index ? "" : "none";		
       		});
       };       
    }])