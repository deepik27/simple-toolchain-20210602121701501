/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
/*
 * REST APIs using Driver Behavior service as backend
 */
const handleError = function handleError(res, err) {
	if (!err) {
		return res.status(500).send("unknown error");
	}

	console.error('error: ' + JSON.stringify(err));
	const response = err.response;
	const status = err.status || err.statusCode || (response && (response.status || response.statusCode)) || 500;
	const message = err.message || (err.data && err.data.message) || err;
	return res.status(status).send(message);
}

module.exports.handleError = handleError;
