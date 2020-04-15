/**
 * Copyright 2017,2020 IBM Corp. All Rights Reserved.
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
 * limitations under the License. */
const Promise = require('bluebird');
const request = require('./requestSecureGw.js');
const debug = require('debug')('BaseApi');
debug.log = console.log.bind(console);

class BaseApi {
	constructor() {
		if (process.env.AUTOMOTIVE_VDH_URL) process.env.AUTOMOTIVE_VDH_URL = this._removeLastSlash(process.env.AUTOMOTIVE_VDH_URL);
		if (process.env.AUTOMOTIVE_MAP_URL) process.env.AUTOMOTIVE_MAP_URL = this._removeLastSlash(process.env.AUTOMOTIVE_MAP_URL);
		if (process.env.AUTOMOTIVE_DRB_URL) process.env.AUTOMOTIVE_DRB_URL = this._removeLastSlash(process.env.AUTOMOTIVE_DRB_URL);
		if (process.env.AUTOMOTIVE_MAX_URL) process.env.AUTOMOTIVE_MAX_URL = this._removeLastSlash(process.env.AUTOMOTIVE_MAX_URL);
		if (process.env.AUTOMOTIVE_URL) process.env.AUTOMOTIVE_URL = this._removeLastSlash(process.env.AUTOMOTIVE_URL);
	}

	_removeLastSlash(dir) {
		if (!dir || dir.length == 0) {
			return dir;
		}
		const lastSlash = dir.lastIndexOf('/');
		if (lastSlash !== dir.length - 1) {
			return dir;
		}
		return dir.substring(0, lastSlash);
	}

	_getVCAPCredentials() {
		if (process.env.VCAP_SERVICES || process.env.USER_PROVIDED_VCAP_SERVICES) {
			const userVcapSvc = JSON.parse(process.env.USER_PROVIDED_VCAP_SERVICES || '{}');
			const vcapSvc = userVcapSvc.iotforautomotive || process.env.VCAP_SERVICES.iotforautomotive;
			if (vcapSvc && vcapSvc.length > 0) {
				return vcapSvc[0].credentials;
			}
		}
	}
	
	_makeRequestOptions(config, options, isText) {
		// Add query parameters to options.url if tenant id exists
		if (config.tenant_id) {
			if (!options.params) options.params = {};
			options.params.tenant_id = config.tenant_id;

			// Workaround for DMM SaaS. DMM SaaS API needs internal_tenant_id
			if (config.internal_tenant_id) {
				if (!options.params) options.params = {};
				options.params.internal_tenant_id = config.internal_tenant_id;
			}
		}
		options.headers = Object.assign({ "Content-Type": "application/json; charset=UTF-8" }, options.headers || {});

		// Add basic authentication if username and password are specified
		if (config.username && config.password) {
			options = Object.assign(options, {
				rejectUnauthorized: false,
				auth: {
					username: config.username,
					password: config.password,
					sendImmediately: true
				}
			});
		}
		if (!isText) {
			options.json = true;
		}
		return options;
	}

	/**
	 *
	 * @param {Object} options
	 * @param {function} [callback] - callback(error, response, result, resolve, reject)
	 */
	_request(options, callback) {
		return new Promise((resolve, reject) => {
			debug(`${options.method} "${options.url}", Params: ${JSON.stringify(options.params)}, Body: ${JSON.stringify(options.data)}, Headers: ${JSON.stringify(options.headers)}`);
			request(options, (error, response, result) => {
				if (callback) {
					if (callback(error, response, result, resolve, reject)) {
						return;
					}
				}
				if (!error && response && 200 <= response.statusCode && response.statusCode < 300) {
					resolve(result);
				} else {
					reject(error || { statusCode: (response && response.statusCode) || 500, message: (response && (response.message || response.statusText)) || "Function is not supported or not available temporarily." });
				}
			});
		});
	}

	_requestForm(options, params, formCallback) {
		return new Promise((resolve, reject) => {
			const req = request(options, (error, response, result) => {
				if (!error && response && 200 <= response.statusCode && response.statusCode < 300) {
					// resolve(result && result.contents);
					resolve(result);
				} else {
					reject(error || { statusCode: response.statusCode || 500, message: response.body || "Function is not supported or not available temporarily." });
				}
			});
			const form = req.form();
			for (let key in params) {
				form.append(key, params[key]);
			}
			formCallback(form);
		});
	}
};
module.exports = BaseApi;
