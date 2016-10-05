

var glob = require('glob');
var fs = require('fs');

var patJs = `/\\*\\*((\r)?\n)( \\*\\s+Copyright\\s(\\d+)\\sIBM Corp.*)(((\r)?\n) \\*.*)+((\r)?\n) \\*/\\s*((\r)?\n)`
var patHtml = `<!--*((\r)?\n)\\s+Copyright\\s+(\\d+)\\s+IBM Corp.*(((\r)?\n)\\s+.*)+((\r)?\n)-+->\\s*((\r)?\n)`;
var regJs = new RegExp(patJs);
var regHtml = new RegExp(patHtml);

var skippedListFile = "header-process-skipped-file-list.txt";
fs.writeFileSync(skippedListFile, '\n\n--Shrinking Header------------------------------\n-- ' + new Date() + '\n', {flag: 'a'});

function shrinkJS(file){
	var contents = fs.readFileSync(file, 'utf8');
	var replaced = contents.replace(regJs, '/*IOTASTARTER_JS_LICENSE@@$4@@*/$1');
	if (contents !== replaced){
		fs.writeFileSync(file, replaced, 'utf8');
		console.log('- processed (JS): ' + file);
	} else {
		fs.writeFileSync(skippedListFile, '\n' + file, {flag: 'a'})
	}
}

function shrinkHTML(file){
	var contents = fs.readFileSync(file, 'utf8');
	var replaced = contents.replace(regHtml, '<!--IOTASTARTER_HTML_LICENSE@@$3@@-->$1');
	if (contents !== replaced){
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
var files = glob.sync(BASE + GLOB_BASE + '.{js,css}', {ignore: BASE + IGNORE});
files.forEach(function(file){
	shrinkJS(file);
});

// HTML
var files = glob.sync(BASE + GLOB_BASE + '.{html,htm,ejs}', {ignore: BASE + IGNORE});
files.forEach(function(file){
	shrinkHTML(file);
});

