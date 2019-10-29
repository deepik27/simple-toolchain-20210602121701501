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
var propSimulator = require('../props.js');

var fuel = function () {
	this.setValueRange(0, 60, 50);
};
fuel.prototype = new propSimulator();

fuel.prototype.doUpdateValue = function (currentValue) {
	return Math.round((currentValue - 0.01) * 100) / 100;
};

module.exports = fuel;
