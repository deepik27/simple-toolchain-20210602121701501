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
// Check if VCAP_SERVICES.json is present (used for running the server locally for development purposes)
var constants = require('constants')
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
app.enable('trust proxy');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(methodOverride());
app.use(helmet());
app.use(helmet.noCache());
app.use(cors({ origin: appEnv.url }));
app.use(helmet.contentSecurityPolicy({
	directives: {
		scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://nebula-cdn.kampyle.com"],
		objectSrc: ["'none'"],
		frameAncestors: ["'none'"]
	}
}));

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
var webClientModulePath = '/webclient/dist/fleetmgmt';
app.use(express.static(path.join(__dirname, webClientModulePath)));
app.use('/user', user);
app.use('/admin', nps)

var webClientTop = path.join(__dirname, webClientModulePath + '/index.html');
//app.use('/', express.static(path.join(__dirname, webClientModulePath)));
app.use('/webclient', express.static(path.join(__dirname, webClientModulePath)));
app.use('/webclient', express.static(path.join(__dirname, '/webclient')));

app.get('/webclient/map', function (req, res) { res.status(200).sendFile(webClientTop); });
app.get('/webclient/carStatus', function (req, res) { res.status(200).sendFile(webClientTop); });
app.get('/webclient/carStatus/*:*', function (req, res) { res.status(200).sendFile(webClientTop); });
app.get('/webclient/alert', function (req, res) { res.status(200).sendFile(webClientTop); });
app.get('/webclient/vehicle', function (req, res) { res.status(200).sendFile(webClientTop); });
app.get('/webclient/control', function (req, res) { res.status(200).sendFile(webClientTop); });
app.get('/webclient/settings', function (req, res) { res.status(200).sendFile(webClientTop); });
app.get('/webclient/simulator', function (req, res) { res.status(200).sendFile(webClientTop); });

// development only
if ('development' === app.get('env')) {
	app.use(function (req, res, next) {
		var err = new Error(`Not Found (${req.url})`);
		err.status = 404;
		next(err);
	});
}

const options = {
	secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1
}
app.server = http.createServer(options, app);
app.server.listen(app.get('port'), function () {
	console.log('Express server listening on port ' + app.get('port'));
});
