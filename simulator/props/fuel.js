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

var fuel = function () {
	this.setValueRange(0, 60, 50);
};
fuel.prototype = new propSimulator();

fuel.prototype.doUpdateValue = function (currentValue) {
	return Math.round((currentValue - 0.01) * 100) / 100;
};

module.exports = fuel;
