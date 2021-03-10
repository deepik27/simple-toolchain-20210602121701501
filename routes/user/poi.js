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
/*
 * REST APIs using Driver Behavior service as backend
 */
const Q = require('q');
const router = module.exports = require('express').Router();
const authenticate = require('./auth.js').authenticate;
const contextMapping = app_module_require("cvi-node-lib").contextMapping;
const version = app_module_require('utils/version.js');
const chance = require('chance')();
const fs = require("fs-extra");
const multer = require('multer');

const tempfolder = "tmp/";
const upload = multer({dest: tempfolder}); 
if (!fs.existsSync(tempfolder)){
	fs.mkdirSync(tempfolder);
}

const handleError = require('./error.js').handleError;
const debug = require('debug')('route:poi');
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
	res.send({available: version.laterOrEqual("3.0")});
});

router.post("/poi/query", authenticate, function(req, res){
	let body = req.body;
	if (isNaN(body.latitude) || isNaN(body.longitude) || -90 > body.latitude || body.latitude > 90 || -180 > body.longitude || body.longitude > 180) {
		return res.status(400).send('Invalid longitude and latitude are specified.'); 
	}

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

router.get("/poi", authenticate, function(req, res){
	contextMapping.getPoi({ "poi_id": req.query.poi_id })
	.then(function(result) {
		if (result.features.length > 0)
			return res.send(convertPOI(result.features[0]));
		else
			return res.send({});
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.post("/poi", authenticate, function(req, res){
	const body = req.body;
	if (isNaN(body.latitude) || isNaN(body.longitude) || -90 > body.latitude || body.latitude > 90 || -180 > body.longitude || body.longitude > 180) {
		return res.status(400).send('Invalid longitude and latitude are specified.'); 
	}

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

router.delete("/poi", authenticate, function(req, res){
	contextMapping.deletePoi({ "poi_id": req.query.poi_id })
	.then(function(result) {
		return res.send(result || {});
	}).catch(function(error) {
		handleError(res, error);
	});
});

router.post("/poi/upload", upload.single('file'), function(req, res) {
	var features = [];
	var deleteIds = [];
	var numEntries = 0;
	var promises = [];
	const mo_id = typeof(req.body.mo_id) === 'string' && req.body.mo_id;
	const serialnumber = typeof(req.body.serialnumber) === 'string' && req.body.serialnumber;
	const flushFeatures = function() {
		if (features.length == 0) {
			return;
		}
		numEntries+=features.length;

		// Delete existing POIs before creating
		if (deleteIds.length > 0) {
			let poi_ids = deleteIds.join(",");
			deleteIds = [];
			promises.push(contextMapping.deletePoi({ "poi_id": poi_ids })
			.then(function(result) {
				let featureCollection = contextMapping._generateFeatureCollection(features);
				features = [];
				return contextMapping.createPoi(featureCollection);
			}));
		} else {
			let featureCollection = contextMapping._generateFeatureCollection(features);
			features = [];
			promises.push(contextMapping.createPoi(featureCollection));
		}
	}

	/******************************************************
	 csv line format: longitude,latitude,name,id-prefix
	*******************************************************/
	const callbabck = function(line, flush) {
		// comment line
		if (line.charAt(0) == "#" || line.length === 0) {
			return;
		}
		const entries = line.split(",");
		if (entries.length < 2) {
			return;
		}
		let longitude = Number(entries[0]);
		let latitude = Number(entries[1]);
		if (isNaN(longitude) || isNaN(latitude) || -180 > longitude || longitude > 180 || -90 > latitude || latitude > 90) {
			return;
		}

		let id = entries.length > 3 ? entries[3] : null;
		if (id) {
			deleteIds.push(id);
		} else {
			id = chance.guid();
		}
		let properties = {};
		if (entries.length > 2) properties.name = entries[2];
		if (serialnumber) properties.serialnumber = serialnumber;
		if (mo_id) {
			properties.mo_id = mo_id;
			let strs = mo_id.split(":");
			id = id + "-" + strs[strs.length-1];
		}
		let feature = contextMapping._generateFeature(id, "Point", [longitude, latitude], properties);
		features.push(feature);

		if (features.length > 100) {
			flushFeatures(features);
		}
	};

	const finished = function() {
		flushFeatures(features);
		Q.all(promises).then(function() {
			res.send({created: numEntries});
			fs.unlinkSync(req.file.path);
		});
	}

	try {
		var previous = "";
		const stream = fs.createReadStream(req.file.path);
		stream.on("data", function(data) {
			previous += data;
			let lines = previous.split('\n');
			previous = lines.pop();
			lines.forEach(function(line, index) {
				callbabck(line.replace('\r', '').trim(), false);
			});
		});
		stream.on('end', function() {
			if (previous.length > 0) {
				callbabck(previous, true);
			}
			finished();
		});
	} catch (e) {
		res.status(400).send("Invalid POI file format.");
	}
});
