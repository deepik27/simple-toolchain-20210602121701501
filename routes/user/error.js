/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
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
