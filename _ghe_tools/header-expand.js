

var glob = require('glob');
var fs = require('fs');

var patJs = `/\\*IOTASTARTER_JS_LICENSE@@(.*?)@@\\*/\\s*?((\r)?\n)`
var patHtml = `<!--IOTASTARTER_HTML_LICENSE@@(.*?)@@-->\\s*?((\r)?\n)`;
var regJs = new RegExp(patJs);
var regHtml = new RegExp(patHtml);
var targetJs = '' + fs.readFileSync('./header_target_js.js');
var targetHtml = '' + fs.readFileSync('./header_target_html.html');

var skippedListFile = "header-process-skipped-file-list.txt";
fs.writeFileSync(skippedListFile, '\n\n--Expanding Header------------------------------\n-- ' + new Date() + '\n', {flag: 'a'});

function expandJS(file){
	var contents = fs.readFileSync(file, 'utf8');
	var match = regJs.exec(contents);
	if(match){
		var retCode = match[2];
		var myTarget = targetJs.split('\n').join(retCode);
		var replaced = contents.replace(regJs, myTarget);
		fs.writeFileSync(file, replaced, 'utf8');
		console.log('- processed (JS): ' + file);
	} else {
		fs.writeFileSync(skippedListFile, '\n' + file, {flag: 'a'})
	}
}

function expandHTML(file){
	var contents = fs.readFileSync(file, 'utf8');
	var match = regHtml.exec(contents);
	if(match){
		var retCode = match[2];
		var myTarget = targetHtml.split('\n').join(retCode);
		var replaced = contents.replace(regHtml, myTarget);
		fs.writeFileSync(file, replaced, 'utf8');
		console.log('- processed (HTML): ' + file);
	} else {
		fs.writeFileSync(skippedListFile, '\n' + file, {flag: 'a'})
	}
}

var BASE = '..';
var IGNORE = '/**/node_modules/**/*';
var GLOB_BASE = '/**/*';

// GLOB_BASE = '/public/top/index'; 

// JS
var files = glob.sync(BASE + GLOB_BASE + '.{js,css,ts}', {ignore: BASE + IGNORE});
files.forEach(function(file){
	expandJS(file);
});

// HTML
var files = glob.sync(BASE + GLOB_BASE + '.{html,htm,ejs}', {ignore: BASE + IGNORE});
files.forEach(function(file){
	expandHTML(file);
});

