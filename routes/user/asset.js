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
 * REST apis for car devices
 */
const router = module.exports = require('express').Router();
const authenticate = require('./auth.js').authenticate;
const asset = app_module_require("cvi-node-lib").asset;
const deviceManager = require("../../driverInsights/deviceManager.js");

const handleError = require('./error.js').handleError;
const debug = require('debug')('route:asset');
debug.log = console.log.bind(console);


router.post("/vehicle", authenticate, function (req, res) {
	asset.addVehicle(req.body && req.body.vehicle)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});
/**
 * Delete all IoTP devices that are not binded to CVI vehicle by mo_id
 */
router.post("/device/sync", authenticate, async (req, res) => {
	try {
		const result = await deviceManager.deleteUnusedDevices();
		res.send({ "message": result });
	} catch (error) {
		handleError(res, error);
	}
});
router.post("/device/:tcuId", authenticate, async (req, res) => {
	try {
		const tcuId = req.params.tcuId;
		const errorWhenExists = req.query.errorWhenExists && (req.query.errorWhenExists !== 'false');
		const protocol = req.query.protocol || "http"; // mqtt/http
		let vehicle = (req.body && Object.keys(req.body).length !== 0) ? req.body : {};
		const vehicles = await deviceManager.getVehicleByTcuId(tcuId, protocol).catch(error => {
			if (error.statusCode === 404) {
				return null;
			}
		});
		if (vehicles && vehicles.length > 0) {
			if (errorWhenExists) {
				return handleError(res, { statusCode: 400, message: `Device for ${tcuId} is already registered.` });
			} else {
				res.send(vehicles[0]);
			}
		}
		vehicle = await deviceManager.addVehicle(tcuId, null, protocol);

		res.send(201, vehicle);
	} catch (error) {
		handleError(res, error);
	}
});

router.get("/vehicle", authenticate, function (req, res) {
	const q = req.query;
	const params = (q.num_rec_in_page || q.num_page) ?
		{ num_rec_in_page: q.num_rec_in_page || 50, num_page: q.num_page || 1 } : null;
	if (q.status) {
		params.status = q.status;
	}
	asset.getVehicleList(params)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.get("/vehicle/:vehicleId", authenticate, function (req, res) {
	asset.getVehicle(req.params.vehicleId)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.get("/device/:tcuId", authenticate, async (req, res) => {
	try {
		const tcuId = req.params.tcuId;
		const protocol = req.query.protocol || "http"; // mqtt/http
		const vehicle = await deviceManager.getVehicleByTcuId(tcuId, protocol);
		res.send(vehicle);
	} catch (error) {
		return handleError(res, error);
	}
});

router.put("/vehicle/:vehicleId", authenticate, function (req, res) {
	const overwrite = !req.query.addition || req.query.addition.toLowerCase() !== 'true';
	asset.updateVehicle(req.params.vehicleId, req.body, overwrite)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router["delete"]("/vehicle/:vehicleId", authenticate, async (req, res) => {
	try {
		const mo_id = req.params.vehicleId;
		const result = await deviceManager.deleteVehicle(mo_id);
		return res.send(result);
	} catch (error) {
		handleError(res, error);
	};
});

router.get("/capability/device", authenticate, function (req, res) {
	res.send({ available: deviceManager.isIoTPlatformAvailable() });
});

router.post("/driver", authenticate, function (req, res) {
	asset.addDriver(req.body && req.body.driver)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.get("/driver", authenticate, function (req, res) {
	const q = req.query;
	const params = (q.num_rec_in_page || q.num_page) ?
		{ num_rec_in_page: q.num_rec_in_page || 50, num_page: q.num_page || 1 } : null;
	asset.getDriverList(params)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.get("/driver/:driverId", authenticate, function (req, res) {
	asset.getDriver(req.params.driverId)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.put("/driver/:driverId", authenticate, function (req, res) {
	const overwrite = !req.query.addition || req.query.addition.toLowerCase() !== 'true';
	asset.updateDriver(req.params.driverId, req.body, overwrite)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router["delete"]("/driver/:driverId", authenticate, function (req, res) {
	asset.deleteDriver(req.params.driverId)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.post("/vendor", authenticate, function (req, res) {
	const vendor = req.body && req.body.vendor;
	asset.addVendor(vendor)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.get("/vendor", authenticate, function (req, res) {
	const q = req.query;
	const params = (q.num_rec_in_page || q.num_page) ?
		{ num_rec_in_page: q.num_rec_in_page || 50, num_page: q.num_page || 1 } : null;
	asset.getVendorList(params)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.get("/vendor/:vendor", authenticate, function (req, res) {
	asset.getVendor(req.params.vendor)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.put("/vendor/:vendor", authenticate, function (req, res) {
	const overwrite = !req.query.addition || req.query.addition.toLowerCase() !== 'true';
	asset.updateVendor(req.params.vendor, req.body, overwrite)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router["delete"]("/vendor/:vendor", authenticate, function (req, res) {
	asset.deleteVendor(req.params.vendor)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.post("/rule", authenticate, function (req, res) {
	asset.addRule(req.body && req.body.rule)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.get("/rule", authenticate, function (req, res) {
	const q = req.query;
	const params = (q.num_rec_in_page || q.num_page) ?
		{ num_rec_in_page: q.num_rec_in_page || 50, num_page: q.num_page || 1 } : null;
	asset.getRuleList(params)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.get("/rule/:rule_id", authenticate, function (req, res) {
	asset.getRule(req.params.rule_id)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router.put("/rule/:rule_id", authenticate, function (req, res) {
	asset.updateRule(req.params.rule_id, req.body)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});

router["delete"]("/rule/:rule_id", authenticate, function (req, res) {
	asset.deleteRule(req.params.rule_id)
		.then(function (result) {
			return res.send(result);
		}).catch(function (error) {
			handleError(res, error);
		})
});
