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
 * REST APIs using Driver Behavior service as backend
 */
var Q = require('q');
var _ = require('underscore');
var WebSocketServer = require('ws').Server;
var appEnv = require("cfenv").getAppEnv();

var router = module.exports = require('express').Router();
var authenticate = require('./auth.js').authenticate;
var driverInsightsProbe = require('../../driverInsights/probe');
var driverInsightsContextMapping = require('../../driverInsights/contextMapping');
var driverInsightsAlert = require('../../driverInsights/fleetalert.js');
var dbClient = require('../../cloudantHelper.js');

var debug = require('debug')('monitoring:cars');
debug.log = console.log.bind(console);

function handleAssetError(res, err) {
	//{message: msg, error: error, response: response}
	console.error('error: ' + JSON.stringify(err));
	var status = (err && (err.status||err.statusCode)) || 500;
	var message = err.message || (err.data && err.data.message) || err;
	return res.status(status).send(message);
}

router.post('/probeData',  authenticate, function(req, res) {
	try{
		driverInsightsProbe.sendRawData(req.body, function(msg){
			if (msg.statusCode) {
				res.status(msg.statusCode).send(msg);
			} else {
				res.send(msg);
			}
		});
	}catch(error){
		handleAssetError(res, error);
	}
});

router.get('/probeData',  authenticate, function(req, res) {
	driverInsightsProbe.getCarProbeDataListAsDate().then(function(msg){
		res.send(msg);
	})["catch"](function(error){
		handleAssetError(res, error);
	});
});

/**
 * Examples:
 *  List all the cars
 *   http://localhost:6003/monitoring/cars/query?min_lat=-90&max_lat=90&min_lng=-180&max_lng=180
 */
router.get('/carProbe', authenticate, function(req, res) {
	// get extent
	var extent = normalizeExtent(req.query);
	if ([extent.max_lat, extent.max_lng, extent.min_lat, extent.min_lng].some(function(v){ return isNaN(v); })){
		return res.status(400).send('One or more of the parameters are undefined or not a number'); // FIXME response code
	}
	// query by extent
	var qs = {
		min_longitude: extent.min_lng,
		min_latitude: extent.min_lat,
		max_longitude: extent.max_lng,
		max_latitude: extent.max_lat,
	};
	// add vehicleId query
	if(req.query.vehicleId){
		qs.mo_id = req.query.vehicleId;
	}

	// initialize WSS server
	var wssUrl = req.baseUrl + req.route.path;
	if (!req.app.server) {
		console.error('failed to create WebSocketServer due to missing app.server');
		res.status(500).send('Filed to start wss server in the insights router.')
	} else {
		initWebSocketServer(req.app.server, wssUrl);
	}

	getCarProbe(qs, true).then(function(probes){
		// send normal response
		var ts = _.max(_.map(probes, function(d){ return d.lastEventTime || d.t || d.ts; }));
		res.send({
			count: probes.length,
			devices: probes,
			serverTime: (isNaN(ts) || !isFinite(ts)) ? Date.now() : ts,
			wssPath: wssUrl + '?' + "region=" + encodeURI(JSON.stringify(extent))
		});
	})["catch"](function(error){
		res.send(error);
	}).done();
});

router.get('/carProbeMonitor', authenticate, function(req, res) {
	var qs = req.url.substring('/carProbeMonitor?'.length);
	res.render('carProbeMonitor', { appName: appEnv.name, qs: qs });
});

router.get("/routesearch", function(req, res){
	var q = req.query;
	driverInsightsContextMapping.routeSearch(
		q.orig_latitude,
		q.orig_longitude,
		q.target_latitude,
		q.target_longitude,
		q.option
	).then(function(msg){
		res.send(msg);
	})["catch"](function(error){
		handleAssetError(res, error);
	});
});

router.get("/alert", function(req, res){
	var q = req.query;
	var conditions = [];
	if(q.type){
		conditions.push("type:" + q.type);
	}
	if(q.severity){
		conditions.push("severity:" + q.severity);
	}
	if(q.mo_id){
		conditions.push("mo_id:" + q.mo_id);
	}
	var includeClosed = q.includeClosed === "true";
	var limit = q.limit;

	var extent = normalizeExtent(q);
	var extentAsArray = [extent.max_lat, extent.max_lng, extent.min_lat, extent.min_lng];
	if (extentAsArray.every(function(v){ return isNaN(v); })){
		Q.when(driverInsightsAlert.getAlerts(conditions, includeClosed, limit), function(docs){
			res.send(docs);
		});
	}else if(extentAsArray.every(function(v){ return !isNaN(v); })){
		var qs = {
				min_longitude: extent.min_lng,
				min_latitude: extent.min_lat,
				max_longitude: extent.max_lng,
				max_latitude: extent.max_lat,
			};
		Q.when(driverInsightsAlert.getAlertsForVehicleInArea(conditions, qs, includeClosed, limit), function(docs){
			res.send(docs);
		});
	}else if(extentAsArray.some(function(v){ return isNaN(v); })){
		res.status(400).send('One or more of the parameters are undefined or not a number')
	}
});

router.get("/event/query", function(req, res){
	var q = req.query;
	driverInsightsContextMapping.queryEvent(
		q.min_latitude,
		q.min_longitude,
		q.max_latitude,
		q.max_longitude,
		q.event_type,
		q.status
	).then(function(msg){
		res.send(msg);
	})["catch"](function(error){
		handleAssetError(res, error);
	});
});

router.get("/event", function(req, res){
	var q = req.params.event_id;
	driverInsightsContextMapping.getEvent(req.query.event_id).then(function(msg){
		res.send(msg);
	})["catch"](function(error){
		handleAssetError(res, error);
	});
});

router.post("/event", function(req, res){
	driverInsightsProbe.createEvent(req.body, "sync").then(function(msg){
		res.send(msg);
	})["catch"](function(error){
		handleAssetError(res, error);
	});
});

router["delete"]("/event", function(req, res){
	driverInsightsContextMapping.deleteEvent(req.query.event_id).then(function(msg){
		res.send(msg);
	})["catch"](function(error){
		handleAssetError(res, error);
	});
});

/*
 * Shared WebSocket server instance
 */
router.wsServer = null;

/*
 * Create WebSocket server
 */
var initWebSocketServer = function(server, path){
	if (router.wsServer !== null){
		return; // already created
	}

	var TIMEOUT = 1000;
	var timerWebSockEmitFunc = function() {
		//
		// This is invoked every TIMEOUT milliseconds to send the latest car probes to server
		//
		Q.allSettled(router.wsServer.clients.map(function(client){
			function getQs(){
				var e = client.extent;
				if(e){
					return {
						min_latitude: e.min_lat, min_longitude: e.min_lng,
						max_latitude: e.max_lat, max_longitude: e.max_lng
					};
				}
				return { min_latitude: -90, min_longitude: -180,
						 max_latitude:  90, max_longitude:  180 };
			}
			return getCarProbe(getQs(), true).then(function(probes){
				// construct message
				var msgs = JSON.stringify({
					count: (probes.length),
					devices: (probes),
					deleted: undefined,
				});
				try {
					client.send(msgs);
					debug('  sent WSS message. ' + msgs);
				} catch (e) {
					console.error('Failed to send wss message: ', e);
				}
			})['catch'](function(err){
				console.error('Failed to get car probe', err);
			});
		})).done(function(){
			// re-schedule once all the wss.send has been completed
			setTimeout(timerWebSockEmitFunc, TIMEOUT);
		});
	};
	setTimeout(timerWebSockEmitFunc, TIMEOUT);

	//
	// Create WebSocket server
	//
	var wss = router.wsServer = new WebSocketServer({
		server: server,
		path: path,
		verifyClient : function (info, callback) { //only allow internal clients from the server origin
			var isLocal = appEnv.url.toLowerCase().indexOf('://localhost') !== -1;
			var allow = isLocal || (info.origin.toLowerCase() === appEnv.url.toLowerCase());
			if(!allow){
				console.error("rejected web socket connection form external origin " + info.origin + " only connection form internal origin " + appEnv.url + " are accepted");
			}
			if(!callback){
				return allow;
			}
			var statusCode = (allow) ? 200 : 403;
			callback (allow, statusCode);
		}
	});

	//
	// Assign "extent" to the client for each connection
	//
	wss.on('connection', function(client){
		debug('got wss connectoin at: ' + client.upgradeReq.url);
		// assign extent obtained from the web sock request URL, to this client
		var url = client.upgradeReq.url;
		var qsIndex = url.lastIndexOf('?region=');
		if(qsIndex >= 0){
			try{
				var j = decodeURI(url.substr(qsIndex + 8)); // 8 is length of "?region="
				var extent = JSON.parse(j);
				client.extent = normalizeExtent(extent);
			}catch(e){
				console.error('Error on parsing extent in wss URL', e);
			}
		}
	});
}

function getCarProbe(qs, addAlerts){
	var probes = Q(driverInsightsProbe.getCarProbe(qs).then(function(probes){
		// send normal response
		[].concat(probes).forEach(function(p){
			if(p.timestamp){
				p.ts = Date.parse(p.timestamp);
				p.deviceID = p.mo_id;
			}
		});
		return probes;
	}));
	if(addAlerts) {
		probes = Q(probes.then(function(probes){
			if(!probes || probes.length == 0)
				return probes;
			var conditions = [];
			var mo_id_condition = "(" + probes.map(function(probe){
				return "mo_id:"+probe.mo_id;
			}).join(" OR ") + ")";
			conditions.push(mo_id_condition);
			return driverInsightsAlert.getAlerts(conditions, /*includeClosed*/false).then(function(result){
				// result: { alerts: [ { closed_ts: n, description: s, mo_id: s, severity: s, timestamp: s, ts: n, type: s }, ...] }
				var alertsByMoId = _.groupBy(result.alerts || [], function(alert){ return alert.mo_id; });
				probes.forEach(function(probe){
					var alertsForMo = alertsByMoId[probe.mo_id] || {}; // lookup
					if(alertsForMo){ // list of alerts
						var alertCounts = _.countBy(alertsForMo, function(alert){
							return alert.severity;
						});
						alertCounts.items = alertsForMo; // details if needed
						
						// calculate summary
						var alertsByType = _.groupBy(alertsForMo, function(alert) { return alert.type; });
						// severity: High: 100, Medium: 10, Low: 1, None: 0 for now
						var severityByType = _.mapObject(alertsByType, function(alerts, type){
							if(alerts && alerts.length === 0) return undefined;
							return _.max(alerts, function(alert){
								var s = alerts.severity && alerts.severity.toLowerCase();
								return s === 'high' ? 100 : (s === 'medium' ? 10 : (s === 'low' ? 1 : 0));
							}).severity;
						});
						alertCounts.byType = severityByType;
						//
						probe.info = _.extend(probe.info || {}, { alerts: alertCounts }); // inject alert counts
					}
				})
				return probes;
			});
		}));
	}
	return probes;
}


function normalizeExtent(min_lat_or_extent, min_lng, max_lat, max_lng){
	// convert one when the object is passed
	var min_lat;
	if(min_lat_or_extent && min_lat_or_extent.min_lat){
		var e = min_lat_or_extent;
		min_lat = e.min_lat;
		min_lng = e.min_lng;
		max_lat = e.max_lat;
		max_lng = e.max_lng;
	}else{
		min_lat = min_lat_or_extent;
	}

	// to float
	min_lat = parseFloat(min_lat);
	min_lng = parseFloat(min_lng);
	max_lat = parseFloat(max_lat);
	max_lng = parseFloat(max_lng);

	// normalize
	var whole_lng = ((max_lng - min_lng) > 359.9);
	min_lng = whole_lng ? -180 : ((min_lng + 180) % 360) - 180;
	max_lng = whole_lng ?  180 : ((max_lng + 180) % 360) - 180;
	var extent = {min_lng: min_lng, min_lat: min_lat, max_lng: max_lng, max_lat: max_lat, whole_lng: whole_lng};

	return extent;
}
