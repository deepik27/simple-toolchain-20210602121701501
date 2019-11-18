/**
 * Copyright 2019 IBM Corp. All Rights Reserved.
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

const wsConnection = module.exports = {};

const Q = require('q');
const _ = require('underscore');
const WebSocket = require('ws');
const appEnv = require("cfenv").getAppEnv();

const debug = require('debug')('wsConnection');
debug.log = console.log.bind(console);

_.extend(wsConnection, {
	webSocketServer: null,
	callbacks: {},
	create: function (id, server, path, onConnect, onClose, onMessage, onError) {
		this.callbacks[id] = {path: path, onConnect: onConnect, onClose: onClose, onMessage: onMessage, onError: onError};
		if (this.webSocketServer) {
			return this.webSocketServer;
		}

		const wss = this.webSocketServer = new WebSocket.Server({
			server: server,
			verifyClient: function (info, callback) { //only allow internal clients from the server origin
				const isLocal = appEnv.url.toLowerCase().indexOf('://localhost') !== -1;
				const isFromValidOrigin = ((typeof info.origin !== 'undefined') && (info.origin.toLowerCase() === appEnv.url.toLowerCase())) ? true : false;
				const allow = isLocal || isFromValidOrigin;
				if (!allow) {
					if (typeof info.origin !== 'undefined') {
						console.error("rejected web socket connection from external origin " + info.origin + " only connection from internal origin " + appEnv.url + " are accepted");
					} else {
						console.error("rejected web socket connection from unknown origin. Only connection from internal origin " + appEnv.url + " are accepted");
					}
				}
				if (!callback) {
					return allow;
				}
				const statusCode = (allow) ? 200 : 403;
				callback(allow, statusCode);
			}
		});

		wss.on('connection', (client, request, ...args) => {
			client.on('close', () => {
				const onClose = client.appdata.callback.onClose;
				onClose && onClose(client.appdata.data);
			});

			client.on('message', (message) => {
				const onMessage = client.appdata.callback.onMessage;
				onMessage && onMessage(message, client.appdata.data);
			});

			client.on('error', (error) => {
				const onError = client.appdata.callback.onError;
				onError && onError(error, client.appdata.data);
			});

			debug('got wss connectoin at: ' + request.url);
			client.appdata = {path: request.path};
			_.each(this.callbacks, (callback, id) => {
				if (request.url.startsWith(callback.path)) {
					client.appdata.callback = callback;
					client.appdata.id = id;
				}
			});
			if (!client.appdata.callback) {
				return;
			}

			const onConnect = client.appdata.callback.onConnect;
			client.appdata.data = onConnect && onConnect(request);
		});

		return wss;
	},

	isCreated: function(id) {
		return !!this.callbacks[id];
	},

	delete: function(id) {
		delete this.callbaccks[id];
		this.webSocketServer = null;
	},

	getClients: function(id) {
		const wss = this.webSocketServer;
		if (!wss) {
			return [];
		}

		return _.filter(Array.from(wss.clients), (client) => {
			if (client.appdata && client.appdata.id === id) {
				return client;
			}
		});
	},

	getAppData: function(client) {
		return client.appdata && client.appdata.data;
	}
});
