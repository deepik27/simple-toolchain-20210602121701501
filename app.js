/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
// Check if VCAP_SERVICES.json is present (used for running the server locally for development purposes)
var fs = require('fs');
var VCAP_SERVICES_PATH = './VCAP_SERVICES.json';

if (fs.existsSync(VCAP_SERVICES_PATH)) {
	VCAP_SERVICES = require(VCAP_SERVICES_PATH);
} else {
	VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES || '{}');
}

/**
 * Utility method to load application specific modules
 */
global.app_module_require = function (name) {
	return require(__dirname + '/app_modules/' + name);
};

/**
 * Module dependencies.
 */
var express = require('express')
	, auth = require('./routes/user/auth.js')
	, user = require('./routes/user')
	, nps = require("./nps.js")
	, http = require('http')
	, cors = require('cors')
	, path = require('path')
	, fs = require('fs-extra')
	, helmet = require('helmet')
	, logger = require('morgan')
	, cookieParser = require('cookie-parser')
	, bodyParser = require('body-parser')
	, methodOverride = require('method-override');
var appEnv = require("cfenv").getAppEnv();

var app = express();

// all environments
app.set('port', appEnv.port || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.enable('trust proxy');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(methodOverride());
app.use(helmet());
app.use(cors());

//force https for all requests
app.use(function (req, res, next) {
	if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] === 'http') {
		res.redirect('https://' + req.headers.host + req.url);
	} else {
		next();
	}
});

//basic authentication to all routes
app.use(auth.authenticate);

//access to server contents
app.use(express.static(path.join(__dirname, 'public')));
app.use('/user', user);
app.use('/admin', nps)

var webClientModulePath = 'webclient';
var webClientTop = path.join(__dirname, webClientModulePath + '/index.html');
if ('development' === app.get('env')) {
	console.log('Settig up the webclient for DEVELOPMENT mode..., which uses all the resources under webclient');
	// add the base path
	app.use('/webclient', express.static(path.join(__dirname, 'webclient')));
} else {
	console.log('Settig up the webclient for NON-DEVELOPMENT mode...');
	webClientTop = path.join(__dirname, webClientModulePath + '/dist/index.html');
	app.use('/webclient', express.static(path.join(__dirname, webClientModulePath + '/dist')));
	app.use('/webclient', express.static(path.join(__dirname, webClientModulePath)));
}
app.get('/webclient/map*', function (req, res) { res.status(200).sendFile(webClientTop); });
app.get('/webclient/carStatus*', function (req, res) { res.status(200).sendFile(webClientTop); });
app.get('/webclient/alert*', function (req, res) { res.status(200).sendFile(webClientTop); });
app.get('/webclient/users*', function (req, res) { res.status(200).sendFile(webClientTop); });
app.get('/webclient/vehicle*', function (req, res) { res.status(200).sendFile(webClientTop); });
app.get('/webclient/tool*', function (req, res) { res.status(200).sendFile(webClientTop); });
app.get('/webclient/settings*', function (req, res) { res.status(200).sendFile(webClientTop); });

// development only
if ('development' === app.get('env')) {
	app.use(function (req, res, next) {
		var err = new Error('Not Found');
		err.status = 404;
		next(err);
	});
}

app.server = http.createServer(app);
app.server.listen(app.get('port'), function () {
	console.log('Express server listening on port ' + app.get('port'));
});
