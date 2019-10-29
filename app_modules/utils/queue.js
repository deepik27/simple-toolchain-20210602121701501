/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
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
var _ = require("underscore");
var Q = new require('q');

function queue() {
	this.queue = [];
	this.running = false;
}

queue.prototype.push = function (request) {
	this.queue.push(request);
	if (!this.running && this.queue.length === 1) {
		this._run();
	}
};

queue.prototype.clear = function (request) {
	_.each(this.queue, function (request) {
		request.canceled && request.canceled(request.params);
	});
	this.queue = [];
};

queue.prototype._run = function () {
	if (this.queue.length === 0) {
		return;
	}

	var self = this;
	this.running = true;
	var request = this.queue.shift();
	Q.when(request.run(request.params), function (result) {
		try {
			request.done && request.done(result);
		} finally {
			self._next();
		}
	})["catch"](function (error) {
		try {
			request.error && request.error(error);
		} finally {
			self._next();
		}
	});
};

queue.prototype._next = function () {
	this.running = false;
	if (this.queue.length === 0) {
		return;
	}
	var self = this;
	setTimeout(function () {
		self._run();
	}, 10);
};


module.exports = queue;
