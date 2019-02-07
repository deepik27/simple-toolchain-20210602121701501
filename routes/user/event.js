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
const authenticate = require('./auth.js').authenticate;

const vehicleDataHub = app_module_require('cvi-node-lib').vehicleDataHub;
const contextMapping = app_module_require("cvi-node-lib").contextMapping;
const asset = app_module_require("cvi-node-lib").asset;

const handleError = require('./error.js').handleError;
const debug = require('debug')('route:event');
debug.log = console.log.bind(console);

//
// Event APIs
//
router.get("/event/query", authenticate, function(req, res) {
	const q = req.query;
	vehicleDataHub.getEvent({
		"min_latitude": q.min_latitude,
		"min_longitude": q.min_longitude,
		"max_latitude": q.max_latitude,
		"max_longitude": q.max_longitude,
		"event_type": q.event_type,
		"status": q.status
	})
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.get("/event", authenticate, function(req, res) {
	contextMapping.getEvent(req.query.event_id)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.post("/event", authenticate, function(req, res) {
	vehicleDataHub.createEvent(req.body, "sync")
	.then(function(result) {
		if (result.event_id)
			return res.send({id: result.event_id});
		else
			return res.send({id: result});
	}).catch(function(error) {
		handleError(res, error);
	})
});

router["delete"]("/event", authenticate, function(req, res) {
	const id = req.query.event_id;
	contextMapping.deleteEvent(id)
	.then(function(result) {
		return res.send({id: id});
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.post("/eventtype", authenticate, function(req, res) {
	const eventtype = req.body && req.body.eventtype;
	asset.addEventType(eventtype)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.get("/eventtype", authenticate, function(req, res) {
	const q = req.query;
	const params = (q.num_rec_in_page || q.num_page) ? 
			{ num_rec_in_page: q.num_rec_in_page || 50, num_page: q.num_page || 1 } : null;
	asset.getEventTypeList(params)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.get("/eventtype/:event_type", authenticate, function(req, res) {
	asset.getEventType(req.params.event_type)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.put("/eventtype/:event_type", authenticate, function(req, res) {
	asset.updateEventType(req.params.event_type, req.body)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router["delete"]("/eventtype/:event_type", authenticate, function(req, res) {
	asset.deleteEventType(req.params.event_type)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});