
/**
 * Module dependencies.
 */
var fs = require('fs');

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

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

// development only
if ('development' === app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
