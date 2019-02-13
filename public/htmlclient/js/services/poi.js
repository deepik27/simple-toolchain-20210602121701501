/**
 * Copyright 2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
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