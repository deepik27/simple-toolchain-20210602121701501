/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
/*
 * REST apis for car devices
 */
const router = module.exports = require('express').Router();
const authenticate = require('./auth.js').authenticate;
const asset = app_module_require("cvi-node-lib").asset;

const handleError = require('./error.js').handleError;
const debug = require('debug')('route:asset');
debug.log = console.log.bind(console);


router.post("/vehicle", authenticate, function (req, res) {
	asset.addVehicle(req.body && req.body.vehicle)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.get("/vehicle", authenticate, function (req, res) {
	const q = req.query;
	const params = (q.num_rec_in_page || q.num_page) ? 
			{ num_rec_in_page: q.num_rec_in_page || 50, num_page: q.num_page || 1 } : null;
	asset.getVehicleList(params)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.get("/vehicle/:vehicleId", authenticate, function (req, res) {
	asset.getVehicle(req.params.vehicleId)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.put("/vehicle/:vehicleId", authenticate, function (req, res) {
	const overwrite = !req.query.addition || req.query.addition.toLowerCase() !== 'true';
	asset.updateVehicle(req.params.vehicleId, req.body, overwrite)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router["delete"]("/vehicle/:vehicleId", authenticate, function (req, res) {
	asset.deleteVehicle(req.params.vehicleId)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.post("/driver", authenticate, function (req, res) {
	asset.addDriver(req.body && req.body.driver)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.get("/driver", authenticate, function (req, res) {
	const q = req.query;
	const params = (q.num_rec_in_page || q.num_page) ? 
			{ num_rec_in_page: q.num_rec_in_page || 50, num_page: q.num_page || 1 } : null;
	asset.getDriverList(params)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.get("/driver/:driverId", authenticate, function (req, res) {
	asset.getDriver(req.params.driverId)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.put("/driver/:driverId", authenticate, function (req, res) {
	const overwrite = !req.query.addition || req.query.addition.toLowerCase() !== 'true';
	asset.updateDriver(req.params.driverId, req.body, overwrite)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router["delete"]("/driver/:driverId", authenticate, function (req, res) {
	asset.deleteDriver(req.params.driverId)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.post("/vendor", authenticate, function (req, res) {
	const vendor = req.body && req.body.vendor;
	asset.addVendor(vendor)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.get("/vendor", authenticate, function (req, res) {
	const q = req.query;
	const params = (q.num_rec_in_page || q.num_page) ? 
			{ num_rec_in_page: q.num_rec_in_page || 50, num_page: q.num_page || 1 } : null;
	asset.getVendorList(params)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.get("/vendor/:vendor", authenticate, function (req, res) {
	asset.getVendor(req.params.vendor)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.put("/vendor/:vendor", authenticate, function (req, res) {
	const overwrite = !req.query.addition || req.query.addition.toLowerCase() !== 'true';
	asset.updateVendor(req.params.vendor, req.body, overwrite)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router["delete"]("/vendor/:vendor", authenticate, function (req, res) {
	asset.deleteVendor(req.params.vendor)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.post("/rule", authenticate, function (req, res) {
	asset.addRule(req.body && req.body.rule)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.get("/rule", authenticate, function (req, res) {
	const q = req.query;
	const params = (q.num_rec_in_page || q.num_page) ? 
			{ num_rec_in_page: q.num_rec_in_page || 50, num_page: q.num_page || 1 } : null;
	asset.getRuleList(params)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.get("/rule/:rule_id", authenticate, function (req, res) {
	asset.getRule(req.params.rule_id)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router.put("/rule/:rule_id", authenticate, function (req, res) {
	asset.updateRule(req.params.rule_id, req.body)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});

router["delete"]("/rule/:rule_id", authenticate, function (req, res) {
	asset.deleteRule(req.params.rule_id)
	.then(function(result) {
		return res.send(result);
	}).catch(function(error) {
		handleError(res, error);
	})
});
