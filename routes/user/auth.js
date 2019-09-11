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
 * Provides authorization router and function
 * Exports: router: Router
 *          authenticate: Authenticate function
 */
var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');
var qr = require('qr-image');

var router = module.exports = require('express').Router();
var basicAuth = require('basic-auth');
var appEnv = require("cfenv").getAppEnv();

var APP_USER = process.env.APP_USER || "starter";
var APP_PASSWORD = process.env.APP_PASSWORD || "Starter4Iot";

//basic authentication
var authenticate = function (req, res, next) {
	if (APP_USER === 'none' && APP_PASSWORD === "none")
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

/**
 * Get the QR Code image for mobile app to connect to platform
 * Generated QR Code contains plain username and password of this starter server application
 * because this api is for demo purpose for convenience to switch application servers by mobile application
 */
router.get('/qr/getPlatformCredentials', /*authenticate,*/ function (req, res) {
	const route = appEnv.url;

	const user = APP_USER == "none" ? "" : APP_USER;
	const pass = APP_PASSWORD == "none" ? "" : APP_PASSWORD;
	const text = ["1", route, user, pass].join(",");

	const img = qr.image(text, { type: 'png', ec_level: 'H', size: 3, margin: 0 });
	res.writeHead(200, { 'Content-Type': 'image/png' })
	img.pipe(res);
});

module.exports.authenticate = authenticate; // export the authentication router
