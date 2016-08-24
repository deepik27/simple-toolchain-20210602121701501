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
	component('clientTrip', {
		templateUrl: scriptBaseUrl + 'html-client-trip.html',
		controller: function TripController($scope) {
			$scope.setSelectedTrip = function(trip){
				$scope.selectedTrip = trip;
				// scroll down the pane
				var $detail = $('#DETAIL');
				$detail.css("min-height", $(window).height() - 50 - 42 + 50); // 50:header, 42:footer, 50: to-top height
				$('html, body').animate({ scrollTop: $detail.offset().top - 50 }, 500); // 50:header
				$('.html-client-trip .to-top').stop(true, true).fadeIn();
			};
			$scope.gotoTop = function(){
				$('html, body').animate({ scrollTop: 0 }, 500);
				$('.html-client-trip .to-top').stop(true, true).fadeOut();
			};
		}
	}).
	component('htmlClientTripList', {
		templateUrl: '/html-client-trip-list.html',
		bindings: {
			onTripSelected: '&'
		},
		controller: function TripListController($scope, moHttp) {
			var self = this;
			self.$onInit = function(){
				$scope.selectedTrip = undefined;
				if(true){
					refreshTripList(); // http
				}else{
					loadTripList(sampleTripList); //TODO mock
				}
			};
			var loadTripList = function loadTripList(data){
				$scope.tripList = data;
				$scope.tripListRaw = JSON.stringify(data, null, 2);
			};
			var refreshTripList = function(){
				$scope.loading = true;
				// mk request
				moHttp.getWithVehicleId('/user/driverInsights/behaviors?all=true').then(function(resp){
					if(resp.status != 200 || resp.data.message){
						$scope.httpError = 'Failed to load trip list - ' + resp.status + (resp.message ? ' ' + resp.message : '');
						return;
					}
					loadTripList(resp.data); // delegate to "load" method
				})['catch'](function(err){
					// display error here
					$scope.httpError = JSON.stringify(err, null, 2);
				})['finally'](function(){
					// remove loading animation
					$scope.loading = false;
				});
			};
			$scope.setSelectedTrip = function(trip){
				$scope.selectedTrip = trip;
				$scope.$ctrl.onTripSelected({trip: trip});
			};
			
			var sampleTripList = [
			                      {
			                    	    "score": 0,
			                    	    "trip_id": "94903d84-5a21-5dba-84b4-d24183001d3d",
			                    	    "start_time": 1468569461944,
			                    	    "end_time": 1468569499749,
			                    	    "start_latitude": 44.00295831821457,
			                    	    "start_longitude": -79.46669807999496,
			                    	    "end_latitude": 44.00781565,
			                    	    "end_longitude": -79.46686365
			                    	  },
			                    	  {
			                    	    "score": 11.627906976744185,
			                    	    "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
			                    	    "trip_uuid": "f4ef0eea-e3b7-4c94-b09b-822567d8c6c4",
			                    	    "mo_id": "D5BADA121FD8",
			                    	    "start_time": 1468559487000,
			                    	    "end_time": 1468559616000,
			                    	    "start_altitude": 0,
			                    	    "start_latitude": 44.0120905,
			                    	    "start_longitude": -79.4656961,
			                    	    "end_altitude": 0,
			                    	    "end_latitude": 44.0039218,
			                    	    "end_longitude": -79.4621522
			                    	  },
			                    	  {
			                    	    "score": 68.5175751400917,
			                    	    "trip_id": "d4d8f593-21ff-4521-82bf-d4e7a74d1fc2",
			                    	    "trip_uuid": "ddde0d98-cf37-471a-a19e-354520bb5620",
			                    	    "mo_id": "Sim_Car_tokyo_2",
			                    	    "start_time": 1463617244000,
			                    	    "end_time": 1463619207000,
			                    	    "start_altitude": 0,
			                    	    "start_latitude": 35.686162522821945,
			                    	    "start_longitude": 139.72012808940073,
			                    	    "end_altitude": 0,
			                    	    "end_latitude": 35.6848979085579,
			                    	    "end_longitude": 139.72322046671357
			                    	  },
			                    	  {
			                    	    "score": 68.5175751400917,
			                    	    "trip_id": "d4d8f593-21ff-4521-82bf-d4e7a74d1fc2",
			                    	    "trip_uuid": "86069621-af78-4ff0-9864-1300165dd669",
			                    	    "mo_id": "Sim_Car_tokyo_2",
			                    	    "start_time": 1463617244000,
			                    	    "end_time": 1463619207000,
			                    	    "start_altitude": 0,
			                    	    "start_latitude": 35.686162522821945,
			                    	    "start_longitude": 139.72012808940073,
			                    	    "end_altitude": 0,
			                    	    "end_latitude": 35.6848979085579,
			                    	    "end_longitude": 139.72322046671357
			                    	  }
			                    	];
		}
	}).component('htmlClientTripDetails', {
		templateUrl: '/html-client-trip-detail.html',
		bindings: {
			trip: '<',
		},
		controller: function TripDetailsController($scope, moHttp) {
			var self = this;
			
			self.$onInit = function(){
				
			};
			$scope.$watch('$ctrl.trip', function(trip){
				if(trip && $scope.trip !== trip){
					$scope.trip = trip;
					$scope.selectedBehavior = null;
					if(true){
						refreshTripRoute(trip); // http
						refreshInsights(trip); // http
					}else{
						loadTripRoute(sampleTripRoute); //TODO switch
						loadInsights(sampleTripBehavior); //TODO switch
					}
				}
			});
			$scope.setSelectedBehavior = function(behavior){
				$scope.selectedBehavior = behavior; // name, details
			};
			$scope.gotoTop = function(){
				// scroll to top
				$('html, body').animate({
					scrollTop: 0,
				}, 500);
			};
			
			var loadTripRoute = function(tripRoute){
				$scope.tripDetailsRouteRaw = JSON.stringify(tripRoute, null, 2);
				$scope.tripRoute = _.extend(_.clone($scope.trip), tripRoute);
			};
			var refreshTripRoute = function(trip){
				$scope.loading = true;
				$scope.tripRouteHttpError = undefined;
				$scope.tripRoute = trip; 
				moHttp.get('/user/triproutes/' + trip.trip_id).then(function(tripReouteRes){
					if(tripReouteRes.status != 200 || tripReouteRes.data.message){
						$scope.tripRouteHttpError = 'Failed to load trip route - ' + tripReouteRes.status + (tripReouteRes.data.message ? ' - ' + tripReouteRes.data.message : '');
						return;
					}
					loadTripRoute(tripReouteRes.data);
				})['catch'](function(err){
					// display error here
					$scope.tripRouteHttpError = JSON.stringify(err, null, 2);
				})['finally'](function(){
					// remove loading animation
					$scope.loading = false;
				});
			};
			
			var loadInsights = function(insights){
				$scope.tripDetailsBehaviorRaw = JSON.stringify(insights, null, 2);
				
				var subTrips = [].concat(insights.ctx_sub_trips);
				var behaviorDetails = _.flatten(_.pluck(subTrips, 'driving_behavior_details'));
				var byName = _.groupBy(behaviorDetails, function(d){ return d.behavior_name; });
				$scope.behaviors = _.pairs(byName).map(function(p){
					return {name: p[0], details: p[1]};
				});
			};
			var refreshInsights = function(trip){
				$scope.behaviorHttpError = undefined;
				$scope.behaviorInfo = undefined;
				$scope.behaviors = undefined;
				
				if(!trip.trip_uuid){
					$scope.behaviorInfo = 'Driver behavior result is pending.';
					return;
				}
				// load
				$scope.loading = true;
				moHttp.get('/user/driverInsights/' + trip.trip_uuid).then(function(behaviorRes){
					if(behaviorRes.status != 200 || behaviorRes.data.message){
						$scope.behaviorHttpError = 'Failed to load behavior details - ' + behaviorRes.status + (behaviorRes.data.message ? ' - ' + behaviorRes.data.message : '');
						return;
					}
					loadInsights(behaviorRes.data);
				})['catch'](function(err){
					// display error here
					$scope.behaviorHttpError = JSON.stringify(err, null, 2);
				})['finally'](function(){
					// remove loading animation
					$scope.loading = false;
				});
			};
			
			
			var sampleTripRoute = {
					  "type": "FeatureCollection",
					  "features": [
					    {
					      "type": "Feature",
					      "geometry": {
					        "type": "LineString",
					        "coordinates": [
					          [
					            -79.4656961,
					            44.0120905
					          ],
					          [
					            -79.46567,
					            44.0121352
					          ],
					          [
					            -79.4657053,
					            44.0122167
					          ],
					          [
					            -79.46573462681253,
					            44.012289109305755
					          ],
					          [
					            -79.465764,
					            44.0123615
					          ],
					          [
					            -79.46579365,
					            44.01242044999999
					          ],
					          [
					            -79.4658233,
					            44.0124794
					          ],
					          [
					            -79.46584614999999,
					            44.012560699999995
					          ],
					          [
					            -79.465869,
					            44.012642
					          ],
					          [
					            -79.4659295,
					            44.0127149
					          ],
					          [
					            -79.4660288,
					            44.0127342
					          ],
					          [
					            -79.466129,
					            44.0127175
					          ],
					          [
					            -79.46622314999999,
					            44.0126963
					          ],
					          [
					            -79.4663173,
					            44.0126751
					          ],
					          [
					            -79.466414525,
					            44.012653875
					          ],
					          [
					            -79.46651175,
					            44.01263265
					          ],
					          [
					            -79.466608975,
					            44.012611425
					          ],
					          [
					            -79.4667062,
					            44.0125902
					          ],
					          [
					            -79.4668363625,
					            44.0125615625
					          ],
					          [
					            -79.466966525,
					            44.012532925
					          ],
					          [
					            -79.4670966875,
					            44.0125042875
					          ],
					          [
					            -79.46722685,
					            44.01247565
					          ],
					          [
					            -79.4673570125,
					            44.0124470125
					          ],
					          [
					            -79.467487175,
					            44.012418374999996
					          ],
					          [
					            -79.4676173375,
					            44.0123897375
					          ],
					          [
					            -79.4677475,
					            44.0123611
					          ],
					          [
					            -79.467897875,
					            44.01232975
					          ],
					          [
					            -79.46804825000001,
					            44.0122984
					          ],
					          [
					            -79.46819862500001,
					            44.01226705
					          ],
					          [
					            -79.468349,
					            44.0122357
					          ],
					          [
					            -79.4684374,
					            44.0122173
					          ],
					          [
					            -79.4684216,
					            44.012104550000004
					          ],
					          [
					            -79.4684058,
					            44.0119918
					          ],
					          [
					            -79.46838455,
					            44.011847474999996
					          ],
					          [
					            -79.46836330000001,
					            44.01170315
					          ],
					          [
					            -79.46834205,
					            44.011558825
					          ],
					          [
					            -79.4683208,
					            44.0114145
					          ],
					          [
					            -79.4682862,
					            44.01130595
					          ],
					          [
					            -79.4682516,
					            44.0111974
					          ],
					          [
					            -79.4682038,
					            44.0111158
					          ],
					          [
					            -79.4681675,
					            44.0110703
					          ],
					          [
					            -79.4680884,
					            44.010992699999996
					          ],
					          [
					            -79.4680093,
					            44.0109151
					          ],
					          [
					            -79.467945625,
					            44.010844475
					          ],
					          [
					            -79.46788195,
					            44.01077385
					          ],
					          [
					            -79.46781827500001,
					            44.010703225
					          ],
					          [
					            -79.4677546,
					            44.0106326
					          ],
					          [
					            -79.4676911,
					            44.0106767
					          ],
					          [
					            -79.467653,
					            44.0107032
					          ],
					          [
					            -79.4675768,
					            44.0107562
					          ],
					          [
					            -79.4675133,
					            44.0108004
					          ],
					          [
					            -79.4673872,
					            44.0108527
					          ],
					          [
					            -79.4672107,
					            44.0109224
					          ],
					          [
					            -79.4670706,
					            44.0109639
					          ],
					          [
					            -79.4669305,
					            44.0110054
					          ],
					          [
					            -79.4667456,
					            44.0110602
					          ],
					          [
					            -79.4665575,
					            44.011098200000006
					          ],
					          [
					            -79.4663694,
					            44.0111362
					          ],
					          [
					            -79.46616235,
					            44.011182950000006
					          ],
					          [
					            -79.4659553,
					            44.0112297
					          ],
					          [
					            -79.46579894999999,
					            44.0112456
					          ],
					          [
					            -79.4656426,
					            44.0112615
					          ],
					          [
					            -79.46544954999999,
					            44.0112499
					          ],
					          [
					            -79.4652565,
					            44.0112383
					          ],
					          [
					            -79.4651139,
					            44.011204850000006
					          ],
					          [
					            -79.4649713,
					            44.0111714
					          ],
					          [
					            -79.46486010000001,
					            44.0111294
					          ],
					          [
					            -79.4647489,
					            44.0110874
					          ],
					          [
					            -79.4646261,
					            44.0110137
					          ],
					          [
					            -79.464454,
					            44.0109124
					          ],
					          [
					            -79.4642705,
					            44.0107749
					          ],
					          [
					            -79.4641497,
					            44.0106202
					          ],
					          [
					            -79.4640423,
					            44.0104297
					          ],
					          [
					            -79.4639488,
					            44.0101853
					          ],
					          [
					            -79.46388525,
					            44.009990900000005
					          ],
					          [
					            -79.4638217,
					            44.0097965
					          ],
					          [
					            -79.4637633,
					            44.0096426
					          ],
					          [
					            -79.46371725,
					            44.00949345
					          ],
					          [
					            -79.4636712,
					            44.0093443
					          ],
					          [
					            -79.463601,
					            44.0091633
					          ],
					          [
					            -79.4635689,
					            44.0089557
					          ],
					          [
					            -79.463711,
					            44.0087686
					          ],
					          [
					            -79.46386145973328,
					            44.008655126705975
					          ],
					          [
					            -79.4640161,
					            44.0085476
					          ],
					          [
					            -79.46381299999999,
					            44.00844135
					          ],
					          [
					            -79.4636099,
					            44.0083351
					          ],
					          [
					            -79.4634755,
					            44.0082252
					          ],
					          [
					            -79.4633912,
					            44.008107
					          ],
					          [
					            -79.4633074,
					            44.0079709
					          ],
					          [
					            -79.4632668,
					            44.007853299999994
					          ],
					          [
					            -79.4632262,
					            44.0077357
					          ],
					          [
					            -79.4631926875,
					            44.007644649999996
					          ],
					          [
					            -79.46315917499999,
					            44.007553599999994
					          ],
					          [
					            -79.46312566249999,
					            44.00746255
					          ],
					          [
					            -79.46309215,
					            44.0073715
					          ],
					          [
					            -79.4630586375,
					            44.007280449999996
					          ],
					          [
					            -79.463025125,
					            44.0071894
					          ],
					          [
					            -79.46299161249999,
					            44.00709835
					          ],
					          [
					            -79.4629581,
					            44.0070073
					          ],
					          [
					            -79.4629245875,
					            44.006916249999996
					          ],
					          [
					            -79.46289107499999,
					            44.006825199999994
					          ],
					          [
					            -79.46285756249999,
					            44.00673415
					          ],
					          [
					            -79.46282405,
					            44.0066431
					          ],
					          [
					            -79.4627905375,
					            44.006552049999996
					          ],
					          [
					            -79.462757025,
					            44.006461
					          ],
					          [
					            -79.46272351249999,
					            44.00636995
					          ],
					          [
					            -79.46269,
					            44.0062789
					          ],
					          [
					            -79.4626538875,
					            44.006168124999995
					          ],
					          [
					            -79.462617775,
					            44.00605735
					          ],
					          [
					            -79.46258166249999,
					            44.005946574999996
					          ],
					          [
					            -79.46254554999999,
					            44.0058358
					          ],
					          [
					            -79.46250943749999,
					            44.005725025000004
					          ],
					          [
					            -79.46247332499999,
					            44.00561425
					          ],
					          [
					            -79.46243721249999,
					            44.005503475
					          ],
					          [
					            -79.4624011,
					            44.0053927
					          ],
					          [
					            -79.46235429999999,
					            44.005272775
					          ],
					          [
					            -79.4623075,
					            44.00515285
					          ],
					          [
					            -79.4622607,
					            44.005032925
					          ],
					          [
					            -79.4622139,
					            44.004913
					          ],
					          [
					            -79.46218505,
					            44.004822575000006
					          ],
					          [
					            -79.4621562,
					            44.00473215
					          ],
					          [
					            -79.46212734999999,
					            44.004641725
					          ],
					          [
					            -79.4620985,
					            44.0045513
					          ],
					          [
					            -79.46207565,
					            44.00446995
					          ],
					          [
					            -79.4620528,
					            44.0043886
					          ],
					          [
					            -79.4620551,
					            44.0042986
					          ],
					          [
					            -79.4620459,
					            44.0041725
					          ],
					          [
					            -79.462087,
					            44.004029
					          ],
					          [
					            -79.4621522,
					            44.0039218
					          ]
					        ]
					      }
					    }
					  ]
					};
			var sampleTripBehavior = {
					  "id": {
						    "trip_uuid": "f4ef0eea-e3b7-4c94-b09b-822567d8c6c4",
						    "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426"
						  },
						  "end_altitude": 0,
						  "end_latitude": 44.0039218,
						  "end_longitude": -79.4621522,
						  "end_time": 1468559616000,
						  "generated_time": 1468594889720,
						  "mo_id": "D5BADA121FD8",
						  "driver_id": "",
						  "start_altitude": 0,
						  "start_latitude": 44.0120905,
						  "start_longitude": -79.4656961,
						  "start_time": 1468559487000,
						  "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						  "ctx_sub_trips": [
						    {
						      "id": {
						        "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						        "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426"
						      },
						      "length": 510.73690634226654,
						      "avg_speed": 10.01444914396601,
						      "end_latitude": 44.0108527,
						      "end_longitude": -79.4673872,
						      "end_time": 1468559538000,
						      "mo_id": "D5BADA121FD8",
						      "driver_id": "",
						      "start_latitude": 44.0120905,
						      "start_longitude": -79.4656961,
						      "start_time": 1468559487000,
						      "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						      "trip_uuid": "f4ef0eea-e3b7-4c94-b09b-822567d8c6c4",
						      "ctx_features": [
						        {
						          "id": 410152,
						          "context_category": "speedPattern",
						          "context_category_id": 0,
						          "context_id": 1,
						          "context_name": "steadyFlow",
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426"
						        },
						        {
						          "id": 410153,
						          "context_category": "roadType",
						          "context_category_id": 3,
						          "context_id": 5,
						          "context_name": "Others/Urban path or alley",
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426"
						        },
						        {
						          "id": 410154,
						          "context_category": "timeRange",
						          "context_category_id": 4,
						          "context_id": 2,
						          "context_name": "eveningPeakHours",
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426"
						        }
						      ],
						      "driving_behavior_details": [
						        {
						          "id": 271768,
						          "behavior_name": "Speeding",
						          "end_latitude": 44.0123615,
						          "end_longitude": -79.465764,
						          "end_time": 1468559491000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0122167,
						          "start_longitude": -79.4657053,
						          "start_time": 1468559489000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "3"
						        },
						        {
						          "id": 271769,
						          "behavior_name": "Speeding",
						          "end_latitude": 44.0127149,
						          "end_longitude": -79.4659295,
						          "end_time": 1468559496000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.012560699999995,
						          "start_longitude": -79.46584614999999,
						          "start_time": 1468559494000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "3"
						        },
						        {
						          "id": 271770,
						          "behavior_name": "Speeding",
						          "end_latitude": 44.0122357,
						          "end_longitude": -79.468349,
						          "end_time": 1468559516000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0125615625,
						          "start_longitude": -79.4668363625,
						          "start_time": 1468559505000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "3"
						        },
						        {
						          "id": 271771,
						          "behavior_name": "Speeding",
						          "end_latitude": 44.0111158,
						          "end_longitude": -79.4682038,
						          "end_time": 1468559526000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.012104550000004,
						          "start_longitude": -79.4684216,
						          "start_time": 1468559518000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "3"
						        },
						        {
						          "id": 271772,
						          "behavior_name": "Speeding",
						          "end_latitude": 44.0106326,
						          "end_longitude": -79.4677546,
						          "end_time": 1468559533000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.010992699999996,
						          "start_longitude": -79.4680884,
						          "start_time": 1468559528000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "3"
						        },
						        {
						          "id": 271773,
						          "behavior_name": "Speeding",
						          "end_latitude": 44.0107562,
						          "end_longitude": -79.4675768,
						          "end_time": 1468559536000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0107562,
						          "start_longitude": -79.4675768,
						          "start_time": 1468559536000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "3"
						        },
						        {
						          "id": 271774,
						          "behavior_name": "Speeding",
						          "end_latitude": 44.0039218,
						          "end_longitude": -79.4621522,
						          "end_time": 1468559616000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0108527,
						          "start_longitude": -79.4673872,
						          "start_time": 1468559538000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "3"
						        },
						        {
						          "id": 271775,
						          "behavior_name": "Harsh acceleration",
						          "end_latitude": 44.0122167,
						          "end_longitude": -79.4657053,
						          "end_time": 1468559489000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0121352,
						          "start_longitude": -79.46567,
						          "start_time": 1468559488000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "1"
						        },
						        {
						          "id": 271776,
						          "behavior_name": "Harsh braking",
						          "end_latitude": 44.0122173,
						          "end_longitude": -79.4684374,
						          "end_time": 1468559517000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0122357,
						          "start_longitude": -79.468349,
						          "start_time": 1468559516000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "2"
						        },
						        {
						          "id": 271777,
						          "behavior_name": "Harsh acceleration",
						          "end_latitude": 44.012104550000004,
						          "end_longitude": -79.4684216,
						          "end_time": 1468559518000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0122173,
						          "start_longitude": -79.4684374,
						          "start_time": 1468559517000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "1"
						        },
						        {
						          "id": 271778,
						          "behavior_name": "Harsh acceleration",
						          "end_latitude": 44.011847474999996,
						          "end_longitude": -79.46838455,
						          "end_time": 1468559520000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0119918,
						          "start_longitude": -79.4684058,
						          "start_time": 1468559519000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "1"
						        },
						        {
						          "id": 271779,
						          "behavior_name": "Harsh braking",
						          "end_latitude": 44.01130595,
						          "end_longitude": -79.4682862,
						          "end_time": 1468559524000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0114145,
						          "start_longitude": -79.4683208,
						          "start_time": 1468559523000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "2"
						        },
						        {
						          "id": 271780,
						          "behavior_name": "Harsh braking",
						          "end_latitude": 44.0110703,
						          "end_longitude": -79.4681675,
						          "end_time": 1468559527000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0111158,
						          "start_longitude": -79.4682038,
						          "start_time": 1468559526000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "2"
						        },
						        {
						          "id": 271781,
						          "behavior_name": "Harsh acceleration",
						          "end_latitude": 44.010992699999996,
						          "end_longitude": -79.4680884,
						          "end_time": 1468559528000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0110703,
						          "start_longitude": -79.4681675,
						          "start_time": 1468559527000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "1"
						        },
						        {
						          "id": 271782,
						          "behavior_name": "Harsh braking",
						          "end_latitude": 44.0107032,
						          "end_longitude": -79.467653,
						          "end_time": 1468559535000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0106767,
						          "start_longitude": -79.4676911,
						          "start_time": 1468559534000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "2"
						        },
						        {
						          "id": 271783,
						          "behavior_name": "Harsh acceleration",
						          "end_latitude": 44.0107562,
						          "end_longitude": -79.4675768,
						          "end_time": 1468559536000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0107032,
						          "start_longitude": -79.467653,
						          "start_time": 1468559535000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "1"
						        },
						        {
						          "id": 271784,
						          "behavior_name": "Harsh acceleration",
						          "end_latitude": 44.0108527,
						          "end_longitude": -79.4673872,
						          "end_time": 1468559538000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0108004,
						          "start_longitude": -79.4675133,
						          "start_time": 1468559537000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "1"
						        },
						        {
						          "id": 271785,
						          "behavior_name": "Harsh acceleration",
						          "end_latitude": 44.0109224,
						          "end_longitude": -79.4672107,
						          "end_time": 1468559539000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0108527,
						          "start_longitude": -79.4673872,
						          "start_time": 1468559538000,
						          "sub_trip_id": "4e5c530a-9b3a-4f08-8c21-ea3c913d058c",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "1"
						        }
						      ]
						    },
						    {
						      "id": {
						        "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						        "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426"
						      },
						      "length": 509.6029584297512,
						      "avg_speed": 16.98676528099171,
						      "end_latitude": 44.0087686,
						      "end_longitude": -79.463711,
						      "end_time": 1468559568000,
						      "mo_id": "D5BADA121FD8",
						      "driver_id": "",
						      "start_latitude": 44.0108527,
						      "start_longitude": -79.4673872,
						      "start_time": 1468559538000,
						      "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						      "trip_uuid": "f4ef0eea-e3b7-4c94-b09b-822567d8c6c4",
						      "ctx_features": [
						        {
						          "id": 410155,
						          "context_category": "speedPattern",
						          "context_category_id": 0,
						          "context_id": 0,
						          "context_name": "freeFlow",
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426"
						        },
						        {
						          "id": 410156,
						          "context_category": "roadType",
						          "context_category_id": 3,
						          "context_id": 5,
						          "context_name": "Others/Urban path or alley",
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426"
						        },
						        {
						          "id": 410157,
						          "context_category": "timeRange",
						          "context_category_id": 4,
						          "context_id": 2,
						          "context_name": "eveningPeakHours",
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426"
						        }
						      ],
						      "driving_behavior_details": [
						        {
						          "id": 271786,
						          "behavior_name": "Harsh braking",
						          "end_latitude": 44.0109639,
						          "end_longitude": -79.4670706,
						          "end_time": 1468559540000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0109224,
						          "start_longitude": -79.4672107,
						          "start_time": 1468559539000,
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "2"
						        },
						        {
						          "id": 271787,
						          "behavior_name": "Harsh acceleration",
						          "end_latitude": 44.0110602,
						          "end_longitude": -79.4667456,
						          "end_time": 1468559542000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0110054,
						          "start_longitude": -79.4669305,
						          "start_time": 1468559541000,
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "1"
						        },
						        {
						          "id": 271788,
						          "behavior_name": "Harsh braking",
						          "end_latitude": 44.0112456,
						          "end_longitude": -79.46579894999999,
						          "end_time": 1468559547000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0112297,
						          "start_longitude": -79.4659553,
						          "start_time": 1468559546000,
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "2"
						        },
						        {
						          "id": 271789,
						          "behavior_name": "Harsh braking",
						          "end_latitude": 44.011204850000006,
						          "end_longitude": -79.4651139,
						          "end_time": 1468559551000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0112383,
						          "start_longitude": -79.4652565,
						          "start_time": 1468559550000,
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "2"
						        },
						        {
						          "id": 271790,
						          "behavior_name": "Harsh acceleration",
						          "end_latitude": 44.0109124,
						          "end_longitude": -79.464454,
						          "end_time": 1468559556000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0110137,
						          "start_longitude": -79.4646261,
						          "start_time": 1468559555000,
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "1"
						        },
						        {
						          "id": 271791,
						          "behavior_name": "Harsh acceleration",
						          "end_latitude": 44.0107749,
						          "end_longitude": -79.4642705,
						          "end_time": 1468559557000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0109124,
						          "start_longitude": -79.464454,
						          "start_time": 1468559556000,
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "1"
						        },
						        {
						          "id": 271792,
						          "behavior_name": "Frequent acceleration",
						          "end_latitude": 44.0107749,
						          "end_longitude": -79.4642705,
						          "end_time": 1468559557000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0111294,
						          "start_longitude": -79.46486010000001,
						          "start_time": 1468559553000,
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "5"
						        },
						        {
						          "id": 271793,
						          "behavior_name": "Harsh acceleration",
						          "end_latitude": 44.0104297,
						          "end_longitude": -79.4640423,
						          "end_time": 1468559559000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0106202,
						          "start_longitude": -79.4641497,
						          "start_time": 1468559558000,
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "1"
						        },
						        {
						          "id": 271794,
						          "behavior_name": "Harsh acceleration",
						          "end_latitude": 44.0101853,
						          "end_longitude": -79.4639488,
						          "end_time": 1468559560000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0104297,
						          "start_longitude": -79.4640423,
						          "start_time": 1468559559000,
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "1"
						        },
						        {
						          "id": 271795,
						          "behavior_name": "Harsh braking",
						          "end_latitude": 44.009990900000005,
						          "end_longitude": -79.46388525,
						          "end_time": 1468559561000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0101853,
						          "start_longitude": -79.4639488,
						          "start_time": 1468559560000,
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "2"
						        },
						        {
						          "id": 271796,
						          "behavior_name": "Harsh braking",
						          "end_latitude": 44.0096426,
						          "end_longitude": -79.4637633,
						          "end_time": 1468559563000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0097965,
						          "start_longitude": -79.4638217,
						          "start_time": 1468559562000,
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "2"
						        },
						        {
						          "id": 271797,
						          "behavior_name": "Harsh acceleration",
						          "end_latitude": 44.0091633,
						          "end_longitude": -79.463601,
						          "end_time": 1468559566000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0093443,
						          "start_longitude": -79.4636712,
						          "start_time": 1468559565000,
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "1"
						        },
						        {
						          "id": 271798,
						          "behavior_name": "Harsh acceleration",
						          "end_latitude": 44.0089557,
						          "end_longitude": -79.4635689,
						          "end_time": 1468559567000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0091633,
						          "start_longitude": -79.463601,
						          "start_time": 1468559566000,
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "1"
						        },
						        {
						          "id": 271799,
						          "behavior_name": "Harsh braking",
						          "end_latitude": 44.008655126705975,
						          "end_longitude": -79.46386145973328,
						          "end_time": 1468559569000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0087686,
						          "start_longitude": -79.463711,
						          "start_time": 1468559568000,
						          "sub_trip_id": "74dd89a1-50fc-42ea-80c4-cadccbd34b97",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "2"
						        }
						      ]
						    },
						    {
						      "id": {
						        "sub_trip_id": "c156f344-e1e0-4e31-84b0-edd6e36bde3d",
						        "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426"
						      },
						      "length": 586.4684345131656,
						      "avg_speed": 12.21809238569095,
						      "end_latitude": 44.0039218,
						      "end_longitude": -79.4621522,
						      "end_time": 1468559616000,
						      "mo_id": "D5BADA121FD8",
						      "driver_id": "",
						      "start_latitude": 44.0087686,
						      "start_longitude": -79.463711,
						      "start_time": 1468559568000,
						      "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						      "trip_uuid": "f4ef0eea-e3b7-4c94-b09b-822567d8c6c4",
						      "ctx_features": [
						        {
						          "id": 410158,
						          "context_category": "speedPattern",
						          "context_category_id": 0,
						          "context_id": 0,
						          "context_name": "freeFlow",
						          "sub_trip_id": "c156f344-e1e0-4e31-84b0-edd6e36bde3d",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426"
						        },
						        {
						          "id": 410159,
						          "context_category": "roadType",
						          "context_category_id": 3,
						          "context_id": 5,
						          "context_name": "Others/Urban path or alley",
						          "sub_trip_id": "c156f344-e1e0-4e31-84b0-edd6e36bde3d",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426"
						        },
						        {
						          "id": 410160,
						          "context_category": "timeRange",
						          "context_category_id": 4,
						          "context_id": 2,
						          "context_name": "eveningPeakHours",
						          "sub_trip_id": "c156f344-e1e0-4e31-84b0-edd6e36bde3d",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426"
						        }
						      ],
						      "driving_behavior_details": [
						        {
						          "id": 271800,
						          "behavior_name": "Harsh acceleration",
						          "end_latitude": 44.00844135,
						          "end_longitude": -79.46381299999999,
						          "end_time": 1468559571000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0085476,
						          "start_longitude": -79.4640161,
						          "start_time": 1468559570000,
						          "sub_trip_id": "c156f344-e1e0-4e31-84b0-edd6e36bde3d",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "1"
						        },
						        {
						          "id": 271801,
						          "behavior_name": "Harsh braking",
						          "end_latitude": 44.0082252,
						          "end_longitude": -79.4634755,
						          "end_time": 1468559573000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0083351,
						          "start_longitude": -79.4636099,
						          "start_time": 1468559572000,
						          "sub_trip_id": "c156f344-e1e0-4e31-84b0-edd6e36bde3d",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "2"
						        },
						        {
						          "id": 271802,
						          "behavior_name": "Harsh braking",
						          "end_latitude": 44.007644649999996,
						          "end_longitude": -79.4631926875,
						          "end_time": 1468559579000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0077357,
						          "start_longitude": -79.4632262,
						          "start_time": 1468559578000,
						          "sub_trip_id": "c156f344-e1e0-4e31-84b0-edd6e36bde3d",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "2"
						        },
						        {
						          "id": 271803,
						          "behavior_name": "Harsh braking",
						          "end_latitude": 44.004822575000006,
						          "end_longitude": -79.46218505,
						          "end_time": 1468559607000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.004913,
						          "start_longitude": -79.4622139,
						          "start_time": 1468559606000,
						          "sub_trip_id": "c156f344-e1e0-4e31-84b0-edd6e36bde3d",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "2"
						        },
						        {
						          "id": 271804,
						          "behavior_name": "Harsh acceleration",
						          "end_latitude": 44.0041725,
						          "end_longitude": -79.4620459,
						          "end_time": 1468559614000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.0042986,
						          "start_longitude": -79.4620551,
						          "start_time": 1468559613000,
						          "sub_trip_id": "c156f344-e1e0-4e31-84b0-edd6e36bde3d",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "1"
						        },
						        {
						          "id": 271805,
						          "behavior_name": "Harsh braking",
						          "end_latitude": 44.0039218,
						          "end_longitude": -79.4621522,
						          "end_time": 1468559616000,
						          "generated_time": 1468594889720,
						          "mo_id": "D5BADA121FD8",
						          "driver_id": "",
						          "start_latitude": 44.004029,
						          "start_longitude": -79.462087,
						          "start_time": 1468559615000,
						          "sub_trip_id": "c156f344-e1e0-4e31-84b0-edd6e36bde3d",
						          "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						          "trip_id": "2f72ce43-3131-5e0f-a04a-227c5d930f25",
						          "behavior_id": "2"
						        }
						      ]
						    }
						  ],
						  "trip_features": [
						    {
						      "id": 137291,
						      "feature_name": "time_span",
						      "feature_value": "129.0",
						      "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						      "trip_uuid": "f4ef0eea-e3b7-4c94-b09b-822567d8c6c4"
						    },
						    {
						      "id": 137292,
						      "feature_name": "distance",
						      "feature_value": "1606.8082992851823",
						      "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						      "trip_uuid": "f4ef0eea-e3b7-4c94-b09b-822567d8c6c4"
						    },
						    {
						      "id": 137293,
						      "feature_name": "average_speed",
						      "feature_value": "44.84116184051672",
						      "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						      "trip_uuid": "f4ef0eea-e3b7-4c94-b09b-822567d8c6c4"
						    },
						    {
						      "id": 137294,
						      "feature_name": "max_speed",
						      "feature_value": "101.58396",
						      "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						      "trip_uuid": "f4ef0eea-e3b7-4c94-b09b-822567d8c6c4"
						    },
						    {
						      "id": 137295,
						      "feature_name": "idle_time",
						      "feature_value": "0.0",
						      "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						      "trip_uuid": "f4ef0eea-e3b7-4c94-b09b-822567d8c6c4"
						    },
						    {
						      "id": 137296,
						      "feature_name": "night_driving_time",
						      "feature_value": "129.0",
						      "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						      "trip_uuid": "f4ef0eea-e3b7-4c94-b09b-822567d8c6c4"
						    },
						    {
						      "id": 137297,
						      "feature_name": "rush_hour_driving",
						      "feature_value": "0.0",
						      "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						      "trip_uuid": "f4ef0eea-e3b7-4c94-b09b-822567d8c6c4"
						    },
						    {
						      "id": 137298,
						      "feature_name": "day_of_week",
						      "feature_value": "6",
						      "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						      "trip_uuid": "f4ef0eea-e3b7-4c94-b09b-822567d8c6c4"
						    },
						    {
						      "id": 137299,
						      "feature_name": "day_of_month",
						      "feature_value": "15",
						      "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						      "trip_uuid": "f4ef0eea-e3b7-4c94-b09b-822567d8c6c4"
						    },
						    {
						      "id": 137300,
						      "feature_name": "month_of_year",
						      "feature_value": "7",
						      "tenant_id": "2c2a3867-a20a-4778-88ba-b0842c039426",
						      "trip_uuid": "f4ef0eea-e3b7-4c94-b09b-822567d8c6c4"
						    }
						  ]
						};
		}
	});
})((function(){
	// tweak to use script-relative path
	var scripts = document.getElementsByTagName('script');
	var scriptUrl = scripts[scripts.length - 1].src;
	return scriptUrl.substring(0, scriptUrl.lastIndexOf('/') + 1);
})());
