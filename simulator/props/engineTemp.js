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
const Chance = require('chance');
const chance = new Chance();

var engineTemp = function () {
	this.setValueRange(0, 130, 80);
};
engineTemp.prototype = new propSimulator();

engineTemp.prototype.doUpdateValue = function (currentValue) {
	return Math.round((Number(currentValue) + (chance.floating({min: 0, max: 1}) * 0.5 - 0.15)) * 100) / 100;
};

module.exports = engineTemp;
