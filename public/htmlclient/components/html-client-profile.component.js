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
	component('clientProfile', {
		templateUrl: scriptBaseUrl + 'html-client-profile.html',
		controller: function ProfileCtrl($scope, moHttp) {
			var self = this; // self := ($scope.)$ctrl
			
			self.$onInit = function(){
				if(true){
					refreshProfileData(); // use http
				}else{
					loadProfileData(sampleData); //TODO debug
				}
			};
			
			var loadProfileData = function(data){
				if(!data || !data.totalDistance || !data.scoring){
					$scope.stat = null;
					return;
				}
				// calculate display model
				function calcView(obj){
					if(!obj.totalDistance) return []; // XXX should fail
					return _.pairs(obj).filter(function(tr){
						return tr[0] !== 'totalDistance';
					}).map(function(tr){
						var total = obj.totalDistance;
						return { 
							name: tr[0], 
							raw: tr[1],
							value: (tr[1] / total) * 100 };
					});
				}
				function calcScoringView(obj){
					var r = _.pairs(obj).filter(function(s){
						return s[1].count;
					}).map(function(s){
						return {
							name: s[0],
							raw: s[1],
							value: s[1].count,
						};
					});
					r.score = obj.score;
					return r;
				}
				data.speedPatternView = calcView(data.speedPattern);
				data.roadTypeView = calcView(data.roadType);
				data.timeRangeView = calcView(data.timeRange);
				data.scoringView = calcScoringView(data.scoring);
				// set display model to the $scope
				$scope.stat = data;
			};
			var refreshProfileData = function(){
				$scope.loading = true;
				// mk request
				$scope.httpError = undefined;
				moHttp.getWithVehicleId('/user/driverInsights/statistics').then(function(resp){
					if(resp.status != 200 || resp.data.message){
						$scope.httpError = 'Failed to load statistics data - ' + resp.status + (resp.data.message ? ' - ' + resp.data.message : '');
						return;
					}
					loadProfileData(resp.data); // delegate to "load" method
					
				})['catch'](function(err){
					// display error here
					$scope.httpError = JSON.stringify(err, null, 2);
				})['finally'](function(){
					// remove loading animation
					$scope.loading = false;
				});
			};
			
			var sampleData = {
						    "totalDistance": 27916.851622739334,
						    "speedPattern": {
						      "steadyFlow": 10226.292461897823,
						      "totalDistance": 25466.910411231118,
						      "freeFlow": 2491.6269484984714,
						      "severeCongestion": 9435.657667501488,
						      "mixedConditions": 343.33333333333337,
						      "congestion": 2969.9999999999995
						    },
						    "roadType": {
						      "Others/Urban path or alley": 3101.2527437296276,
						      "totalDistance": 25466.910411231118,
						      "Secondary Extra-urban road/urban primary": 8774.05891495825,
						      "Urban-road": 5019.376530321015,
						      "Highway/motor way": 3138.333333333334,
						      "Main extra-urban road/urban-highway": 5433.888888888889
						    },
						    "timeRange": {
						      "eveningPeakHours": 25466.910411231118,
						      "totalDistance": 25466.910411231118
						    },
						    "scoring": {
						      "totalTime": 4055000,
						      "allBehavior": {
						        "totalTime": 1350000,
						        "score": 66.70776818742293
						      },
						      "Harsh acceleration": {
						        "totalTime": 40000,
						        "count": 40,
						        "score": 99.01356350184956,
						        "name": "Harsh acceleration"
						      },
						      "Harsh braking": {
						        "totalTime": 42000,
						        "count": 40,
						        "score": 98.96424167694204,
						        "name": "Harsh braking"
						      },
						      "Speeding": {
						        "totalTime": 250000,
						        "count": 47,
						        "score": 93.83477188655979,
						        "name": "Speeding"
						      },
						      "Frequent stops": {
						        "totalTime": 924000,
						        "count": 38,
						        "score": 77.21331689272503,
						        "name": "Frequent stops"
						      },
						      "Frequent acceleration": {
						        "totalTime": 26000,
						        "count": 3,
						        "score": 99.35881627620222,
						        "name": "Frequent acceleration"
						      },
						      "Frequent braking": {
						        "totalTime": 130000,
						        "count": 10,
						        "score": 96.7940813810111,
						        "name": "Frequent braking"
						      },
						      "Sharp turn": {
						        "totalTime": 0,
						        "count": 0,
						        "score": 100
						      },
						      "Acceleration before turn": {
						        "totalTime": 0,
						        "count": 0,
						        "score": 100
						      },
						      "Over-braking before exiting turn": {
						        "totalTime": 0,
						        "count": 0,
						        "score": 100
						      },
						      "Fatigued driving": {
						        "totalTime": 0,
						        "count": 0,
						        "score": 100
						      },
						      "score": 66.70776818742293
						    }
						  };
			
		}
	}).
	/**
	 * a sub component to display scoring item
	 */
	component('clientProfileItem', {
		template: ['<section>',
			'<h4>{{$ctrl.title}}</h4>',
			'  <table class="table">',
			'    <tbody>',
			'      <tr ng-repeat="item in $ctrl.items">',
			'        <td>{{item.name}}</td><td class="stat-value">{{item.value | number: 0}}{{$ctrl.suffix}}</td>',
			'      </tr>',
			'    </tbody>',
			'  </table>',
			'</section>'].join(''),
		bindings: {
			items: '<',
			title: '@',
			suffix : '<',
		},
		controller: function(){
		}
	});
})((function(){
	// tweak to use script-relative path
	var scripts = document.getElementsByTagName('script');
	var scriptUrl = scripts[scripts.length - 1].src;
	return scriptUrl.substring(0, scriptUrl.lastIndexOf('/') + 1);
})());
