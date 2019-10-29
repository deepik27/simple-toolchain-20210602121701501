/**
 * Copyright 2019 IBM Corp. All Rights Reserved.
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
 * Service to manage POIs
 */
angular.module('htmlClient')
.factory('poiService', function($q, $http, mobileClientService) {
	var service = {
		isAvailable: function() {
			var deferred = $q.defer();
			if (this.available !== undefined) {
				deferred.resolve(this.available);
			} else {
				var self = this;
			 var url = "/user/capability/poi";
					$http(mobileClientService.makeRequestOption({
					method: "GET",
					url: url
			 })).success(function(data, status){
				 self.available = !!data.available;
				 deferred.resolve(data.available);
					}).error(function(error, status){
				 deferred.reject(error);
			 });
			}
			return deferred.promise;
	 },
			
		queryPOIs: function(params) {
			var url = "/user/poi/query";
			console.log("query poi: " + url);
	    	
			var deferred = $q.defer();
			this.isAvailable().then(function(b) {
				if (!b) {
					deferred.resolve([]);
					return;
				}

				$http(mobileClientService.makeRequestOption({
					method: "POST",
					url: url,
					headers: {
						'Content-Type': 'application/JSON;charset=utf-8'
					},
					data: params
				})).success(function(data, status){
					deferred.resolve(data);
				}).error(function(error, status){
					deferred.reject({error: error, status: status});
				});
			}, function(error) {
				deferred.reject(error);
			});
			return deferred.promise;
		},

		getPOI: function(poi_id) {
	    	var url = "/user/poi?poi_id=" + poi_id;
	    	console.log("get poi: " + url);
	    	
	    	var deferred = $q.defer();
			$http(mobileClientService.makeRequestOption({
				method: "GET",
				url: url
			})).success(function(data, status){
				deferred.resolve(data);
			}).error(function(error, status){
				deferred.reject({error: error, status: status});
			});
			return deferred.promise;
		},

		createPOI: function(poi) {
	    	var deferred = $q.defer();
			$http(mobileClientService.makeRequestOption({
				method: "POST",
				url: "/user/poi",
				headers: {
					'Content-Type': 'application/JSON;charset=utf-8'
				},
				data: poi
			})).success(function(data, status){
				deferred.resolve(data);
			}).error(function(error, status){
				deferred.reject({error: error, status: status});
			});
			return deferred.promise;
		},

		deletePOI: function(poi_id) {
	    	var deferred = $q.defer();
			$http(mobileClientService.makeRequestOption({
				method: "DELETE",
				url: "/user/poi?poi_id=" + poi_id
			})).success(function(data, status){
				deferred.resolve(data);
			}).error(function(error, status){
				deferred.reject({error: error, status: status});
			});
			return deferred.promise;
		}
    };
    
    return service;
})
;