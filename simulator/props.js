/**
 * Copyright 2017,2019 IBM Corp. All Rights Reserved.
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
var propSimulator = function () {
};

propSimulator.prototype.setValue = function (value) {
	this.value = value;
};

propSimulator.prototype.getValue = function () {
	return this.value;
};

propSimulator.prototype.setValueRange = function (min, max, def) {
	this.minValue = min;
	this.maxValue = max;
	this.defaultValue = def;
	if (isNaN(this.value)) {
		this.value = def;
	}
};

propSimulator.prototype.updateValue = function (value) {
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

propSimulator.prototype.doUpdateValue = function (currentValue) {
	return currentValue;
};

module.exports = propSimulator;
