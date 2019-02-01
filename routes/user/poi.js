/**
 * Copyright 2019 IBM Corp. All Rights Reserved.
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
var router = module.exports = require('express').Router();
var authenticate = require('./auth.js').authenticate;
const contextMapping = app_module_require("cvi-node-lib").contextMapping;
var chance = require('chance')();

const handleError = require('./error.js').handleError;
var debug = require('debug')('route:poi');
debug.log = console.log.bind(console);

function convertPOI(feature) {
	return {
		id: feature.id,
		longitude: feature.geometry.coordinates[0],
		latitude: feature.geometry.coordinates[1],
		properties: feature.properties
	};
}

// 
// POI APIs
// 
router.get("/capability/poi", authenticate, function(req, res) {
	res.send({available: true});
});

router.post("/poi/query", function(req, res){
	let body = req.body;
	contextMapping.queryPoi(
		contextMapping._generateFeature(null, "Point", 
						[body.longitude, body.latitude], body.properties), 
						{ "radius": body.radius }
	)
	.then(function(result) {
		return res.send(result.features.map(convertPOI));
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.get("/poi", function(req, res){
	contextMapping.getPoi({ "poi_id": req.query.poi_id })
	.then(function(result) {
		if (result.features.length > 0)
			return res.send(convertPOI(result.features[0]));
		else
			return res.send();
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.post("/poi", function(req, res){
	const body = req.body;
	const id = body.id || chance.guid();
	const pois = contextMapping._generateFeatureCollection([
		contextMapping._generateFeature(id, "Point", [body.longitude, body.latitude], body.properties)
	]);
	contextMapping.createPoi(pois)
	.then(function(result) {
		return res.send({id: id});
	}).catch(function(error) {
		handleError(res, error);
	});
});

router["delete"]("/poi", function(req, res){
	contextMapping.deletePoi({ "poi_id": req.query.poi_id })
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	});
});
