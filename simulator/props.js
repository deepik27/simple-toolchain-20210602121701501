/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */

var propSimulator = function() {	
};

propSimulator.prototype.setValue = function(value) {
	this.value = value;
};

propSimulator.prototype.getValue = function() {
	return this.value;
};

propSimulator.prototype.setValueRange = function(min, max, def) {
	this.minValue = min;
	this.maxValue = max;
	this.defaultValue = def;
	if (isNaN(this.value)) {
		this.value = def;
	}
};

propSimulator.prototype.updateValue = function(value) {
	this.value = value;
	if (this.value === undefined) {
		this.value = this.defaultValue;
	}
	this.value = this.doUpdateValue(this.value);
	if (!isNaN(this.minValue) && this.minValue > this.value) {
		this.value = this.defaultValue;
	}
	if (!isNaN(this.maxValue) && this.maxValue < this.value) {
		this.value = this.defaultValue;
	}
	return this.value;
};

propSimulator.prototype.doUpdateValue = function(currentValue) {
	return currentValue;
};

module.exports = propSimulator;
