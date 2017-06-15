/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var propSimulator = require('../props.js');

var engineTemp = function() {
	this.setValueRange(0, 130, 80);
};
engineTemp.prototype = new propSimulator();

engineTemp.prototype.doUpdateValue = function(currentValue) {
	return Math.round((Number(currentValue)+(Math.random()*0.5-0.15))*100)/100;
};

module.exports = engineTemp;
