
/**
 * Module dependencies.
 */

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
//TODO add webclient
if ('development' === app.get('env')){
	app.use('/webclient/node_modules', express.static(path.join(__dirname, 'webclient/node_modules')));
	app.use('/webclient', express.static(path.join(__dirname, 'webclient')));
}else{
	app.use('/webclient', express.static(path.join(__dirname, 'node_modules/iota-starter-server-fleetmanagement-webclient')));
}

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
