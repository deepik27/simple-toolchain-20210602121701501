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

/*
 * Service that encapsulates message client. Implement this when connecting via MQTT 
 */
angular.module('htmlClient')
.factory('messageClientService', function($q, $timeout, $http, mobileClientService) {
	return {
		isValid: function() {
			return true;
		},
		create: function(credentials) {
		},
		destroy: function() {
		},
		connect: function(deviceId) {
	    	var deferred = $q.defer();
			deferred.resolve();
			return deferred.promise;
		},
		disconnect: function() {
	    	var deferred = $q.defer();
			deferred.resolve();
			return deferred.promise;
		},
		publish: function(data) {
			// Send data 
			var deferred = $q.defer();
			var request = mobileClientService.makeRequestOption({
				method : 'POST',
				url : '/user/probeData',
				data: data
			});
			$http(request).success(function(data, status) {
				deferred.resolve(data);
				console.log("sent data");
			}).error(function(error, status) {
				deferred.reject(error);
				console.log("failed to send data");
			});
	        return deferred.promise;
		}
	};
})
;