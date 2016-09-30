/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 *
 * Data Privacy Disclaimer
 * 
 * This Program has been developed for demonstration purposes only to illustrate the technical
 * capabilities and potential business uses of the IBM IoT for Automotive
 * 
 * The components included in this Program may involve the processing of personal information
 * (for example location tracking and behavior analytics). When implemented in practice such
 * processing may be subject to specific legal and regulatory requirements imposed by country
 * specific data protection and privacy laws. Any such requirements are not addressed in
 * this Program.
 * 
 * Licensee is responsible for the ensuring Licensee's use of this Program and any deployed
 * solution meets applicable legal and regulatory requirements. This may require the implementation
 * of additional features and functions not included in the Program.
 * 
 * Apple License issue
 * 
 * This Program is intended solely for use with an Apple iOS product and intended to be used
 * in conjunction with officially licensed Apple development tools and further customized
 * and distributed under the terms and conditions of Licensee's licensed Apple iOS Developer
 * Program or Licensee's licensed Apple iOS Enterprise Program.
 * 
 * Licensee agrees to use the Program to customize and build the application for Licensee's own
 * purpose and distribute in accordance with the terms of Licensee's Apple developer program
 * 
 * Risk Mitigation / Product Liability Issues
 * 
 * The Program and any resulting application is not intended for design, construction, control,
 * or maintenance of automotive control systems where failure of such sample code or resulting
 * application could give rise to a material threat of death or serious personal injury.
 * 
 * IBM shall have no responsibility regarding the Program's or resulting application's compliance
 * with laws and regulations applicable to Licensee's business and content. Licensee is responsible
 * for use of the Program and any resulting application.
 * 
 * As with any development process, Licensee is responsible for developing, sufficiently testing
 * and remediating Licensee's products and applications and Licensee is solely responsible for any
 * foreseen or unforeseen consequences or failures of Licensee's products or applications.
 * 
 * REDISTRIBUTABLES
 * 
 * If the Program includes components that are Redistributable, they will be identified 
 * in the REDIST file that accompanies the Program. In addition to the license rights granted
 * in the Agreement, Licensee may distribute the Redistributables subject to the following terms:
 * 
 * 1) Redistribution must be in source code form only and must conform to all directions,
 *    instruction and specifications in the Program's accompanying REDIST or documentation;
 * 2) If the Program's accompanying documentation expressly allows Licensee to modify
 *    the Redistributables, such modification must conform to all directions, instruction and
 *    specifications in that documentation and these modifications, if any, must be treated
 *    as Redistributables;
 * 3) Redistributables may be distributed only as part of Licensee's application that was developed
 *    using the Program ("Licensee's Application") and only to support Licensee's customers
 *    in connection with their use of Licensee's Application. Licensee's application must constitute
 *    significant value add such that the Redistributables are not a substantial motivation
 *    for the acquisition by end users of Licensee's software product;
 * 4) If the Redistributables include a Java Runtime Environment, Licensee must also include other
 *    non-Java Redistributables with Licensee's Application, unless the Application is designed to
 *    run only on general computer devices (e.g., laptops, desktops and servers) and not on handheld
 *    or other pervasive devices (i.e., devices that contain a microprocessor but do not have
 *    computing as their primary purpose);
 * 5) Licensee may not remove any copyright or notice files contained in the Redistributables;
 * 6) Licensee must hold IBM, its suppliers or distributors harmless from and against any claim
 *    arising out of the use or distribution of Licensee's Application;
 * 7) Licensee may not use the same path name as the original Redistributable files/modules;
 * 8) Licensee may not use IBM's, its suppliers or distributors names or trademarks in connection
 *    with the marketing of Licensee's Application without IBM's or that supplier's
 *    or distributor's prior written consent;
 * 9) IBM, its suppliers and distributors provide the Redistributables and related documentation
 *    without obligation of support and "AS IS", WITH NO WARRANTY OF ANY KIND, EITHER EXPRESS
 *    OR IMPLIED, INCLUDING THE WARRANTY OF TITLE, NON-INFRINGEMENT OR NON-INTERFERENCE AND THE
 *    IMPLIED WARRANTIES AND CONDITIONS OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.;
 * 10) Licensee is responsible for all technical assistance for Licensee's Application and any
 *     modifications to the Redistributables; and
 * 11) Licensee's license agreement with the end user of Licensee's Application must notify the end
 *     user that the Redistributables or their modifications may not be i) used for any purpose
 *     other than to enable Licensee's Application, ii) copied (except for backup purposes),
 *     iii) further distributed or transferred without Licensee's Application or 
 *     iv) reverse assembled, reverse compiled, or otherwise translated except as specifically
 *     permitted by law and without the possibility of a contractual waiver. Furthermore, Licensee's
 *     license agreement must be at least as protective of IBM as the terms of this Agreement.
 * 
 * Feedback License
 * 
 * In the event Licensee provides feedback to IBM regarding the Program, Licensee agrees to assign
 * to IBM all right, title, and interest (including ownership of copyright) in any data, suggestions,
 * or written materials that 1) are related to the Program and 2) that Licensee provides to IBM.
 */

/*
 * REST apis for car devices
 */
var router = module.exports = require('express').Router();
var Q = require('q');
var _ = require('underscore');
var debug = require('debug')('device');
debug.log = console.log.bind(console);

var driverInsightsAsset = require('../../driverInsights/asset.js');

var authenticate = require('./auth.js').authenticate;

var request = require("request");

function handleAssetError(res, err) {
	//{message: msg, error: error, response: response}
	console.error('error: ' + JSON.stringify(err));
	var response = err.response;
	var status = (response && (response.status||response.statusCode)) || 500;
	var message = err.message || (err.data && err.data.message) || err;
	return res.status(status).send(message);
}

router.post("/vehicle", authenticate, function(req, res){
	var vehicle = req.body && req.body.vehicle;
	Q.when(driverInsightsAsset.addVehicle(vehicle), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.get("/vehicle", authenticate, function(req, res){
	var params = null;
	if (req.query.num_rec_in_page || req.query.num_page) {
		params = {num_rec_in_page: req.query.num_rec_in_page||50, num_page: req.query.num_page||1};
	}
	Q.when(driverInsightsAsset.getVehicleList(params), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.get("/vehicle/:vehicleId", authenticate, function(req, res){
	var vehicleId = req.params.vehicleId;
	Q.when(driverInsightsAsset.getVehicle(vehicleId), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.put("/vehicle/:vehicleId", authenticate, function(req, res){
	var vehicleId = req.params.vehicleId;
	var overwrite = !req.query.addition || req.query.addition.toLowerCase() !== 'true';
	Q.when(driverInsightsAsset.updateVehicle(vehicleId, req.body, overwrite), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router["delete"]("/vehicle/:vehicleId", authenticate, function(req, res){
	var vehicleId = req.params.vehicleId;
	Q.when(driverInsightsAsset.deleteVehicle(vehicleId), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	});
});

router.post("/driver", authenticate, function(req, res){
	var driver = req.body && req.body.driver;
	Q.when(driverInsightsAsset.addDriver(driver), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.get("/driver", authenticate, function(req, res){
	var params = null;
	if (req.query.num_rec_in_page || req.query.num_page) {
		params = {num_rec_in_page: req.query.num_rec_in_page||50, num_page: req.query.num_page||1};
	}
	Q.when(driverInsightsAsset.getDriverList(params), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.get("/driver/:driverId", authenticate, function(req, res){
	var driverId = req.params.driverId;
	Q.when(driverInsightsAsset.getDriver(driverId), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.put("/driver/:driverId", authenticate, function(req, res){
	var driverId = req.params.driverId;
	var overwrite = !req.query.addition || req.query.addition.toLowerCase() !== 'true';
	Q.when(driverInsightsAsset.updateDriver(driverId, req.body, overwrite), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router["delete"]("/driver/:driverId", authenticate, function(req, res){
	var driverId = req.params.driverId;
	Q.when(driverInsightsAsset.deleteDriver(driverId), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	});
});
router.post("/vendor", authenticate, function(req, res){
	var vendor = req.body && req.body.vendor;
	Q.when(driverInsightsAsset.addVendor(vendor), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.get("/vendor", authenticate, function(req, res){
	var params = null;
	if (req.query.num_rec_in_page || req.query.num_page) {
		params = {num_rec_in_page: req.query.num_rec_in_page||50, num_page: req.query.num_page||1};
	}
	Q.when(driverInsightsAsset.getVendorList(params), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.get("/vendor/:vendor", authenticate, function(req, res){
	var vendor = req.params.vendor;
	Q.when(driverInsightsAsset.getVendor(vendor), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.put("/vendor/:vendor", authenticate, function(req, res){
	var vendor = req.params.vendor;
	var overwrite = !req.query.addition || req.query.addition.toLowerCase() !== 'true';
	Q.when(driverInsightsAsset.updateVendor(vendor, req.body, overwrite), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router["delete"]("/vendor/:vendor", authenticate, function(req, res){
	var vendor = req.params.vendor;
	Q.when(driverInsightsAsset.deleteVendor(vendor), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	});
});
router.get("/eventtype", authenticate, function(req, res){
	var params = null;
	if (req.query.num_rec_in_page || req.query.num_page) {
		params = {num_rec_in_page: req.query.num_rec_in_page||50, num_page: req.query.num_page||1};
	}
	Q.when(driverInsightsAsset.getEventTypeList(params), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.get("/eventtype/:event_type", authenticate, function(req, res){
	var id = req.params.event_type;
	Q.when(driverInsightsAsset.getEventType(id), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.put("/eventtype/:event_type", authenticate, function(req, res){
	var id = req.params.event_type;
	Q.when(driverInsightsAsset.updateEventType(id, req.body), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router["delete"]("/eventtype/:event_type", authenticate, function(req, res){
	var id = req.params.event_type;
	Q.when(driverInsightsAsset.deleteEventType(id), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	});
});
router.post("/rule", authenticate, function(req, res){
	var rule = req.body && req.body.rule;
	Q.when(driverInsightsAsset.addRule(rule), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.get("/rule", authenticate, function(req, res){
	var params = null;
	if (req.query.num_rec_in_page || req.query.num_page) {
		params = {num_rec_in_page: req.query.num_rec_in_page||50, num_page: req.query.num_page||1};
	}
	Q.when(driverInsightsAsset.getRuleList(params), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.get("/rule/:rule_id", authenticate, function(req, res){
	var rule_id = req.params.rule_id;
	Q.when(driverInsightsAsset.getRule(rule_id), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router.put("/rule/:rule_id", authenticate, function(req, res){
	var rule_id = req.params.rule_id;
	Q.when(driverInsightsAsset.updateRule(rule_id, req.body), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	}).done();
});
router["delete"]("/rule/:rule_id", authenticate, function(req, res){
	var rule_id = req.params.rule_id;
	Q.when(driverInsightsAsset.deleteRule(rule_id), function(response){
		res.send(response);
	})["catch"](function(err){
		return handleAssetError(res, err);
	});
});

/*
 * register a device and responds its credentials
 */
router.get('/device/credentials/:deviceId', authenticate, function(req,res){
	var deviceId = req.params.deviceId;
	var ownerId = req.query && req.query.ownerOnly && req.get("iota-starter-uuid");
	res.send("Noop");
});
