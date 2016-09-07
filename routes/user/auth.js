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
 * Provides authorization router and function
 * Exports: router: Router
 *          authenticate: Authenticate function
 */
var router = module.exports.router = require('express').Router();
var basicAuth = require('basic-auth');
var appEnv = require("cfenv").getAppEnv();

var APP_USER = process.env.APP_USER || "starter";
var APP_PASSWORD = process.env.APP_PASSWORD || "Starter4Iot";

//basic authentication
var authenticate = function(req,res,next){
	if(APP_USER === 'none' && APP_PASSWORD === "none")
		return next();
	function unauthorized(res) {
		res.set('WWW-Authenticate', 'Basic realm=Authorization Required. Find README.md for the user name and password');
		return res.status(401).end();
	}
	var user = basicAuth(req);
	if (!user || !user.name || !user.pass) {
		return unauthorized(res);
	}
	if (user.name === APP_USER && user.pass === APP_PASSWORD) {
		return next();
	} else {
		return unauthorized(res);
	}
};

module.exports.router = router;
module.exports.authenticate = authenticate; // export the authentication router
