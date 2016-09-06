
/**
 * Module dependencies.
 */

VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES || '{}')

var express = require('express')
  , tripRoutes = require('./driverInsights/tripRoutes.js')
  , auth = require('./routes/user/auth.js')
  , user = require('./routes/user')
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
	if(req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] === 'http'){
		res.redirect('https://' + req.headers.host + req.url);
	} else{
		next();
	}
});

//basic authentication to all routes
app.use(auth.authenticate);

//access to server contents
app.use(express.static(path.join(__dirname, 'public')));
app.use('/user', user);

var webClientModulePath = 'node_modules/iota-starter-server-fleetmanagement-webclient';
if ('development' === app.get('env')){
	console.log('Settig up the webclient for DEVELOPMENT mode...');
	// add the base path
	app.use('/webclient', express.static(path.join(__dirname, 'webclient')));
	
	// add node_moduples for webclient
	var nmPath = path.join(__dirname, 'webclient/node_modules');
	try{
		fs.accessSync(nmPath, fs.F_OK);
	}catch(e){
		console.log('The node_modules under ./webclient is not accessble. So, use one under the Web client module path.');
		nmPath = path.join(__dirname, webClientModulePath + '/node_modules');
	}
	app.use('/webclient/node_modules', express.static(nmPath));
}else{
	console.log('Settig up the webclient for NON-DEVELOPMENT mode...');
	app.use('/webclient', express.static(path.join(__dirname, webClientModulePath)));
}
app.get('/webclient/map*', function (req, res) { res.status(200).sendFile(path.join(__dirname, webClientModulePath + '/index.html')); });
app.get('/webclient/carStatus*', function (req, res) { res.status(200).sendFile(path.join(__dirname, webClientModulePath + '/index.html')); });
app.get('/webclient/alert*', function (req, res) { res.status(200).sendFile(path.join(__dirname, webClientModulePath + '/index.html')); });
app.get('/webclient/users*', function (req, res) { res.status(200).sendFile(path.join(__dirname, webClientModulePath + '/index.html')); });
app.get('/webclient/vehicle*', function (req, res) { res.status(200).sendFile(path.join(__dirname, webClientModulePath + '/index.html')); });

// development only
if ('development' === app.get('env')) {
	app.use(function(req, res, next) {
		var err = new Error('Not Found');
		err.status = 404;
		next(err);
	});
}

app.server = http.createServer(app);
app.server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
