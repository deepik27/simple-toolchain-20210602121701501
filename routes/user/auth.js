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
var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');

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

var eula = function(req,res,next){
	if(req.cookies.eulaStatus === 'Accepted')
		return next();
	if(!req.accepts('html') || req.xhr)
		return next();
	fs.readFile(path.join(__dirname, '../../LICENSE'), 'ascii', function(err, license){
		if(err) return res.status(500).send(err);
		license = '<p>' + _.escape('' + license).split('\n').join('</p>\n<p>') + '</p>';
		res.render('eula', {license: license});
	});
}

module.exports.router = router;
module.exports.authenticate = authenticate; // export the authentication router
module.exports.eula = eula; // export the eula middleware

