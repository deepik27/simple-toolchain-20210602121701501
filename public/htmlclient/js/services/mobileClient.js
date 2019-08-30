/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
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