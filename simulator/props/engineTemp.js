/**
 * Copyright 2017,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
var propSimulator = require('../props.js');

var engineTemp = function () {
	this.setValueRange(0, 130, 80);
};
engineTemp.prototype = new propSimulator();

engineTemp.prototype.doUpdateValue = function (currentValue) {
	return Math.round((Number(currentValue) + (Math.random() * 0.5 - 0.15)) * 100) / 100;
};

module.exports = engineTemp;
