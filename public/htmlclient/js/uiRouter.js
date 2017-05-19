/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var htmlClient = angular.module('htmlClient',['ui.router']);

htmlClient.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
		$stateProvider
			.state('home', {
				url: '/home?vehicleId&serial_number&vendor&driverId&siteId&clientId',
				template: '<client-drive></client-drive>',
				controller: function($stateParams, $q, simulatedVehicle){
					simulatedVehicle.init($stateParams.clientId, $stateParams.vehicleId);
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
    $scope.hideHeader = true;
}]);

htmlClient.controller('footer', ['$scope', function($scope){
    $scope.hideFooter = true;
}]);