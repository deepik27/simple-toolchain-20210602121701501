/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 *
 * Data Privacy Disclaimer
 * 
 * This Program has been developed for demonstration purposes only to illustrate the technical
 * capabilities and potential business uses of the IBM IoT for Automotive
 * 
 * The components included in this Program may involve the processing of personal information
 * (for example location tracking and behavior analytics). When implemented in practice such
 * processing may be subject to specific legal and regulatory requirements imposed by country
 * specific data protection and privacy laws. Any such requirements are not addressed in
 * this Program.
 * 
 * Licensee is responsible for the ensuring Licensee's use of this Program and any deployed
 * solution meets applicable legal and regulatory requirements. This may require the implementation
 * of additional features and functions not included in the Program.
 * 
 * Apple License issue
 * 
 * This Program is intended solely for use with an Apple iOS product and intended to be used
 * in conjunction with officially licensed Apple development tools and further customized
 * and distributed under the terms and conditions of Licensee's licensed Apple iOS Developer
 * Program or Licensee's licensed Apple iOS Enterprise Program.
 * 
 * Licensee agrees to use the Program to customize and build the application for Licensee's own
 * purpose and distribute in accordance with the terms of Licensee's Apple developer program
 * 
 * Risk Mitigation / Product Liability Issues
 * 
 * The Program and any resulting application is not intended for design, construction, control,
 * or maintenance of automotive control systems where failure of such sample code or resulting
 * application could give rise to a material threat of death or serious personal injury.
 * 
 * IBM shall have no responsibility regarding the Program's or resulting application's compliance
 * with laws and regulations applicable to Licensee's business and content. Licensee is responsible
 * for use of the Program and any resulting application.
 * 
 * As with any development process, Licensee is responsible for developing, sufficiently testing
 * and remediating Licensee's products and applications and Licensee is solely responsible for any
 * foreseen or unforeseen consequences or failures of Licensee's products or applications.
 * 
 * REDISTRIBUTABLES
 * 
 * If the Program includes components that are Redistributable, they will be identified 
 * in the REDIST file that accompanies the Program. In addition to the license rights granted
 * in the Agreement, Licensee may distribute the Redistributables subject to the following terms:
 * 
 * 1) Redistribution must be in source code form only and must conform to all directions,
 *    instruction and specifications in the Program's accompanying REDIST or documentation;
 * 2) If the Program's accompanying documentation expressly allows Licensee to modify
 *    the Redistributables, such modification must conform to all directions, instruction and
 *    specifications in that documentation and these modifications, if any, must be treated
 *    as Redistributables;
 * 3) Redistributables may be distributed only as part of Licensee's application that was developed
 *    using the Program ("Licensee's Application") and only to support Licensee's customers
 *    in connection with their use of Licensee's Application. Licensee's application must constitute
 *    significant value add such that the Redistributables are not a substantial motivation
 *    for the acquisition by end users of Licensee's software product;
 * 4) If the Redistributables include a Java Runtime Environment, Licensee must also include other
 *    non-Java Redistributables with Licensee's Application, unless the Application is designed to
 *    run only on general computer devices (e.g., laptops, desktops and servers) and not on handheld
 *    or other pervasive devices (i.e., devices that contain a microprocessor but do not have
 *    computing as their primary purpose);
 * 5) Licensee may not remove any copyright or notice files contained in the Redistributables;
 * 6) Licensee must hold IBM, its suppliers or distributors harmless from and against any claim
 *    arising out of the use or distribution of Licensee's Application;
 * 7) Licensee may not use the same path name as the original Redistributable files/modules;
 * 8) Licensee may not use IBM's, its suppliers or distributors names or trademarks in connection
 *    with the marketing of Licensee's Application without IBM's or that supplier's
 *    or distributor's prior written consent;
 * 9) IBM, its suppliers and distributors provide the Redistributables and related documentation
 *    without obligation of support and "AS IS", WITH NO WARRANTY OF ANY KIND, EITHER EXPRESS
 *    OR IMPLIED, INCLUDING THE WARRANTY OF TITLE, NON-INFRINGEMENT OR NON-INTERFERENCE AND THE
 *    IMPLIED WARRANTIES AND CONDITIONS OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.;
 * 10) Licensee is responsible for all technical assistance for Licensee's Application and any
 *     modifications to the Redistributables; and
 * 11) Licensee's license agreement with the end user of Licensee's Application must notify the end
 *     user that the Redistributables or their modifications may not be i) used for any purpose
 *     other than to enable Licensee's Application, ii) copied (except for backup purposes),
 *     iii) further distributed or transferred without Licensee's Application or 
 *     iv) reverse assembled, reverse compiled, or otherwise translated except as specifically
 *     permitted by law and without the possibility of a contractual waiver. Furthermore, Licensee's
 *     license agreement must be at least as protective of IBM as the terms of this Agreement.
 * 
 * Feedback License
 * 
 * In the event Licensee provides feedback to IBM regarding the Program, Licensee agrees to assign
 * to IBM all right, title, and interest (including ownership of copyright) in any data, suggestions,
 * or written materials that 1) are related to the Program and 2) that Licensee provides to IBM.
 */
var $stateProviderRef = null;
 
angular.module('fleetManagementSimulator', ['ui.router', 'ngAnimate'])
	.config(['$locationProvider', '$stateProvider', function($locationProvider, $stateProvider) {
		$locationProvider.html5Mode(true); 
		$stateProviderRef = $stateProvider;
	}])
 
	/* === GENERAL CONTROLLERS === */
	.controller('mainCtrl', ['$scope', '$state', '$http', '$sce', '$location', '$window', '$timeout', function($scope, $state, $http, $sce, $location, $window, $timeout) {
		$scope.pageLoaded = false;

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
		
		$scope.busy = true;
		$scope.vehicleStatus = {};
		$scope.requestIds = {};
		$scope.vehiclesToBeInitialzed = [];

		function _updateVehicleStatus(id, key, value) {
			if (!$scope.vehicleStatus[id]) {
				return;
			}
			var busy = false;
			$scope.vehicleStatus[id][key] = value;
			for (var k in $scope.vehicleStatus) {
				if ($scope.vehicleStatus[k].busy) {
					busy = true;
					break;
				}
			}
			$scope.busy = busy;
		}
		
		function _postMessageToVehicle(message, vehicle) {
			var id = vehicle.mo_id;
			var vehicle_node = document.getElementById(id);
			if (vehicle_node && vehicle_node.contentWindow) {
				if (!$scope.requestIds[message]) {
					$scope.requestIds[message] = [id];
				} else if ($scope.requestIds[message].indexOf(id) < 0) {
					$scope.requestIds[message].push(id);
				}
				_updateVehicleStatus(id, "busy", true);
				var messageObj = {message: message, requestId: id};
				var messageStr = JSON.stringify(messageObj);
				vehicle_node.contentWindow.postMessage(messageStr, "*");
			}
		}
		
		function _postMessageToVehicles(message) {
			$scope.vehicles.forEach(function(vehicle) {
				_postMessageToVehicle(message, vehicle);
			});
		}
		
		$window.addEventListener('message', function(e) {
        	if ($window.location.origin !== e.origin, 0) {
        		return;
        	}
        	var message = JSON.parse(e.data);
        	if (message.requestId) {
        		if (message.requestMessage === "simulator-set-message-target") {
        			var index = $scope.vehiclesToBeInitialzed.indexOf(message.requestId);
        			if (index >= 0) {
        				$scope.vehiclesToBeInitialzed.splice(index, 1);
        				$scope.busy = $scope.requestIds.length > 0;
        			}
        		} else {
            		var requestIds = $scope.requestIds[message.requestMessage];
            		var index = requestIds.indexOf(message.requestId);
            		if (index >= 0) {
            			requestIds.splice(index, 1);
            		}
            		if (requestIds.length === 0) {
            			if (message.requestMessage === "simulator-start-all") {
                			$scope.requestingStarting = false;
                    		$scope.$apply();
            			} else if (message.requestMessage === "simulator-stop-all") {
                			$scope.requestingStopping = false;
                    		$scope.$apply();
            			}
            		}
            	}
       		}
        	if (message.message === "status") {
				_updateVehicleStatus(message.mo_id, "busy", message.busy);
				_updateVehicleStatus(message.mo_id, "driving", message.driving);
	    		$scope.$apply();
       	}
        });
		
		function _checkStarted() {
			if ($scope.vehiclesToBeInitialzed.length == 0) {
				$scope.busy = $scope.requestIds.length > 0;
				return;
			}
			$scope.busy = true;
			$scope.vehiclesToBeInitialzed.forEach(function(id) {
				var vehicle_node = document.getElementById(id);
				if (vehicle_node && vehicle_node.contentWindow) {
					var messageObj = {message: "simulator-set-message-target", requestId: id};
					var messageStr = JSON.stringify(messageObj);
					vehicle_node.contentWindow.postMessage(messageStr, "*");
				}
			});
			setTimeout(_checkStarted, 1000);
		}
		
		window.onFrameLoaded = function(id) {
			if (this.initialMessageTimeout) {
				clearTimeout(this.initialMessageTimeout);
				this.initialMessageTimeout = null;
			}
			var self = this;
			this.initialMessageTimeout = setTimeout(function(){
				self.initialMessageTimeout = null;
				_checkStarted();
			}, 1000);
		};
		
		// Get simulation vehicles
		$http({
			method: "GET",
			url: "/user/simulatedVehicles"
		}).success(function(data, status){					
			var vehicles = data.data || []; 
			if(vehicles.length > 5){
				vehicles = vehicles.slice(0, 5);
			}
			$scope.vehiclesToBeInitialzed = vehicles.map(function(vehicle) {
				return vehicle.mo_id;
			});
			$http({
				method: "GET",
				url: "/user/simulatedDriver"
			}).success(function(drivers, status){
				var loc = $location.search()["loc"];
				vehicles.forEach(function(vehicle, i){
					$scope.vehicleStatus[vehicle.mo_id] = {busy: true, driving: false};

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
					vehicle.display = i === 0;		
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

					$scope.pageLoaded = true;
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
				vehicle.display = i == index;		
			});
			$scope.selectedIndex = index;
		};
	
		$scope.onStartAll = function() {
			if (!$scope.busy) {
				$scope.requestingStarting = true;
				_postMessageToVehicles("simulator-start-all");
			}
		};
		
		$scope.onStopAll = function() {
			if (!$scope.busy) {
				$scope.requestingStopping = true;
				_postMessageToVehicles("simulator-stop-all");
			}
		};
		
    }]);
