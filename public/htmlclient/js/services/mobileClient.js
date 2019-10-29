/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
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
 * Generate and get mobile client uuid that is substitute for mobile user id
 */
angular.module('htmlClient')
	.factory('mobileClientService', function ($q, $timeout) {
		return {
			/*
			 * add client uuid to http request option. call this for any request that requires authentication
			 */
			makeRequestOption: function (request) {
				if (!request.headers)
					request.headers = {};
				if (request.method && request.method.toLowerCase() === "get") {
					request.headers["If-Modified-Since"] = (new Date(0)).toUTCString(); // to avoid IE cache issue
				}
				if (!request.dataType)
					request.dataType = "json";
				return request;
			}
		};
	})
	;