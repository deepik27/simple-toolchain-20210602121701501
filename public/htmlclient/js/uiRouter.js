/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
var htmlClient = angular.module('htmlClient', ['ui.router']);

htmlClient.config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {
	$stateProvider
		.state('home', {
			url: '/home?vehicleId&serial_number&vendor&driverId&siteId&clientId',
			template: '<client-drive></client-drive>',
			controller: function ($stateParams, $q, simulatedVehicle) {
				simulatedVehicle.init($stateParams.clientId, $stateParams.vehicleId, $stateParams.siteId);
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
htmlClient.controller('header', ['$scope', function ($scope) {
	$scope.hideHeader = true;
}]);

htmlClient.controller('footer', ['$scope', function ($scope) {
	$scope.hideFooter = true;
}]);