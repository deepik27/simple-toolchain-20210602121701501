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
const router = module.exports = require('express').Router();
const contextMapping = app_module_require("cvi-node-lib").contextMapping;

const handleError = require('./error.js').handleError;
const debug = require('debug')('route:map');
debug.log = console.log.bind(console);

router.get("/routesearch", function (req, res) {
	var q = req.query;
	contextMapping.routeSearch(
		q.orig_latitude,
		q.orig_longitude,
		q.orig_heading || 0,
		q.dest_latitude,
		q.dest_longitude,
		q.dest_heading || 0,
		q.option
	)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});
