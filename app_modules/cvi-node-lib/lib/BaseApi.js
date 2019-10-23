/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
const Promise = require('bluebird');
const request = require('./requestSecureGw.js');
const debug = require('debug')('BaseApi');
debug.log = console.log.bind(console);

class BaseApi {
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
			if (!options.qs) options.qs = {};
			options.qs.tenant_id = config.tenant_id;

			// Workaround for DMM SaaS. DMM SaaS API needs internal_tenant_id
			if (config.internal_tenant_id) {
				if (!options.qs) options.qs = {};
				options.qs.internal_tenant_id = config.internal_tenant_id;
			}
		}
		options.headers = Object.assign({ "Content-Type": "application/json; charset=UTF-8" }, options.headers || {});

		// Add basic authentication if username and password are specified
		if (config.username && config.password) {
			options = Object.assign(options, {
				rejectUnauthorized: false,
				auth: {
					user: config.username,
					pass: config.password,
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
			debug(`${options.method} "${options.url}", Params: ${JSON.stringify(options.qs)}, Body: ${JSON.stringify(options.body)}, Headers: ${JSON.stringify(options.headers)}`);
			request(options, (error, response, result) => {
				if (callback) {
					if (callback(error, response, result, resolve, reject)) {
						return;
					}
				}
				if (!error && response && 200 <= response.statusCode && response.statusCode < 300) {
					resolve(result);
				} else {
					reject(error || { statusCode: response.statusCode || 500, message: response.statusMessage || "Function is not supported or not available temporarily." });
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
