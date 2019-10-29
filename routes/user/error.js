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
