/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
/*
 * REST APIs using Driver Behavior service as backend
 */
const Q = require('q');
const _ = require('underscore');
const WebSocketServer = require('ws').Server;
const appEnv = require("cfenv").getAppEnv();
const Queue = app_module_require('utils/queue.js');
const requestQueue = new Queue();

const router = module.exports = require('express').Router();
const authenticate = require('./auth.js').authenticate;
const vehicleDataHub = app_module_require('cvi-node-lib').vehicleDataHub;
const probeAggregator = require('./aggregator.js');
const driverInsightsAlert = require('../../driverInsights/fleetalert.js');

const handleError = require('./error.js').handleError;
const debug = require('debug')('route:probe');
debug.log = console.log.bind(console);

/**
 * {
 * 	"mo_id1": {
 * 		"timestamp1": {
 * 			affected_events: [
 * 				{
 * 					"event_time":"yyyy-MM-ddTHH:mm:ss.sssZ"
 * 					"event_id":nn,
 * 					"base_event_id":nn,
 * 					"event_type":"nnn",
 * 					"event_name":"AAAAA",
 * 					...
 * 				}
 * 			],
 * 			notified_messages: [
 * 				{
 * 					"message":"MessageMessageMessage"
 * 					"props":{
 * 						"message_type":"xxxx",
 * 						"source_id":"xxxx",
 * 						"severity":"High/Mid/Low/Info"
 * 					}
 * 				},d_messages: [
 * 				{
 * 					"message":"MessageMessageMessage"
 * 					"props":{
 * 						"message_type":"xxxx",
 * 						"source_id":"xxxx",
 * 						"severity":"High/Mid/Low/Info"
 * 					}
 * 				},
 * 				{...}
 * 			]
 * 		},
 * 		"timestamp2": {...}
 * 	},
 * 	"mo_id2": {...}
 * }
 */
router.post('/notifiedActions', authenticate, function (req, res) {
	try {
		var affected_events = null;
		var notified_messages = null;
		if (req.body) {
			debug("notifiedActions req.body: " + JSON.stringify(req.body));
			Object.keys(req.body).forEach(function (mo_id) {
				var byMoid = req.body[mo_id];
				Object.keys(byMoid).forEach(function (ts) {
					var byTimestamp = byMoid[ts];
					affected_events = byTimestamp.affectedEvents;
					notified_messages = byTimestamp.notifiedMessages;
					driverInsightsAlert.handleEvents(
						{ mo_id: mo_id, ts: Number(ts) },
						(affected_events || []).concat(notified_messages || [])
					);
				});
			});
		}
		res.status(200).send("");
	} catch (error) {
		handleError(res, error);
	}
});

/**
 * Request car probe monitoring
 * Examples:
 *   http://localhost:6003/monitoring/cars/query?min_lat=-90&max_lat=90&min_lng=-180&max_lng=180
 */
router.get('/carProbe', authenticate, function (req, res) {
	let qs = {}, path;
	if (req.query.vehicleId) {
		// query by vehicleId
		qs = { mo_id: req.query.vehicleId };
		path = `mo_id=${encodeURI(qs.mo_id)}`;
	} else {
		// get extent
		const extent = normalizeExtent(req.query);
		if ([extent.max_lat, extent.max_lng, extent.min_lat, extent.min_lng].some(function (v) { return isNaN(v); })) {
			return res.status(400).send('One or more of the parameters are undefined or not a number'); // FIXME response code
		}
		// query by extent
		qs = {
			min_longitude: extent.min_lng,
			min_latitude: extent.min_lat,
			max_longitude: extent.max_lng,
			max_latitude: extent.max_lat,
		};
		path = `region=${encodeURI(JSON.stringify(extent))}`;
	}

	// initialize WSS server
	var wssUrl = req.baseUrl + req.route.path;
	if (!req.app.server) {
		console.error('failed to create WebSocketServer due to missing app.server');
		res.status(500).send('Filed to start wss server in the insights router.')
	} else {
		initWebSocketServer(req.app.server, wssUrl);
	}
	res.send({ serverTime: Date.now(), wssPath: wssUrl + '?' + path });
});

/**
* Open Monitor Debbug UI
*/
router.get('/carProbeMonitor', authenticate, function (req, res) {
	var qs = req.url.substring('/carProbeMonitor?'.length);
	res.render('carProbeMonitor', { appName: appEnv.name, qs: qs });
});

router.get("/alert", function (req, res) {
	var q = req.query;
	var conditions = [];
	if (q.type) {
		conditions.push("type:\"" + q.type + "\"");
	}
	if (q.severity) {
		conditions.push("severity:\"" + q.severity + "\"");
	}
	if (q.mo_id) {
		conditions.push("mo_id:\"" + q.mo_id + "\"");
	}
	if (q.from || q.to) {
		conditions.push("ts:[" + (q.from || "0") + " TO " + (q.to || "Infinity") + "]");
	}
	var includeClosed = q.includeClosed === "true";
	var limit = q.limit;

	var extent = normalizeExtent(q);
	var extentAsArray = [extent.max_lat, extent.max_lng, extent.min_lat, extent.min_lng];
	if (extentAsArray.every(function (v) { return isNaN(v); })) {
		Q.when(driverInsightsAlert.getAlerts(conditions, includeClosed, limit), function (docs) {
			res.send(docs);
		});
	} else if (extentAsArray.every(function (v) { return !isNaN(v); })) {
		var qs = {
			min_longitude: extent.min_lng,
			min_latitude: extent.min_lat,
			max_longitude: extent.max_lng,
			max_latitude: extent.max_lat,
		};
		Q.when(driverInsightsAlert.getAlertsForVehicleInArea(conditions, qs, includeClosed, limit), function (docs) {
			res.send(docs);
		});
	} else if (extentAsArray.some(function (v) { return isNaN(v); })) {
		res.status(400).send('One or more of the parameters are undefined or not a number')
	}
});

/*
 * Shared WebSocket server instance
 */
router.wsServer = null;

/*
 * Create WebSocket server
 */
var initWebSocketServer = function (server, path) {
	// Cancel existing requests
	requestQueue.clear();

	if (router.wsServer !== null) {
		return; // already created
	}

	const TIMEOUT = 1000;
	const timerWebSockEmitFunc = function () {
		//
		// This is invoked every TIMEOUT milliseconds to send the latest car probes to server
		//
		Q.allSettled(router.wsServer.clients.map && router.wsServer.clients.map(function (client) {
			// Method to get request parameter to search car probes
			function getQs() {
				if (client.mo_id) {
					return { "mo_id": client.mo_id };
				}
				var e = client.extent;
				if (e) {
					return {
						min_latitude: e.min_lat, min_longitude: e.min_lng,
						max_latitude: e.max_lat, max_longitude: e.max_lng
					};
				}
				return {
					min_latitude: -90, min_longitude: -180,
					max_latitude: 90, max_longitude: 180
				};
			}
			// Method to send a message over websocket
			function notifyMessage(json) {
				var msgs = JSON.stringify(json);
				try {
					if (client.readyState != 3 /* CLOSED */) {
						client.send(msgs);
					}
				} catch (e) {
					console.error('Failed to send wss message: ', e);
				}
			}
			// Method to send car probe over websocket
			function notifyCarProbe(probes, regions) {
				var count;
				var devices;
				var aggregated = !!probes.aggregated;
				if (aggregated) {
					var deviceInfo = probeAggregator.convertToDeviceInfo(probes.summary);
					count = deviceInfo.count;
					devices = deviceInfo.devices;
				} else {
					count = probes.length;
					devices = probes;
				}

				notifyMessage({
					type: "probe",
					region_id: regions ? regions.id : undefined,
					aggregated: aggregated,
					count: (count),
					devices: (devices),
					deleted: undefined,
				});
			}

			requestQueue.clear();
			let regions = null;
			let promises = [];
			let qs = getQs();

			if (qs.min_longitude && qs.min_latitude && qs.max_longitude && qs.max_latitude) {
				regions = probeAggregator.createRegions(qs.min_longitude, qs.min_latitude, qs.max_longitude, qs.max_latitude);
				if (regions.type !== "single" && probeAggregator.equals(regions, client.calculatedRegions)) {
					return Q();
				}
				client.calculatedRegions = regions;
				notifyMessage({ type: "region", region_id: regions.id, state: "start" });

				// Notify probes per region
				const CELL_LAT = Math.min(regions.lat_d, 1);
				const CELL_LON = Math.min(regions.lon_d, 1);
				for (let lon = qs.min_longitude; lon <= qs.max_longitude; lon += CELL_LON) {
					for (let lat = qs.min_latitude; lat <= qs.max_latitude; lat += CELL_LAT) {
						let subqs = _.clone(qs);
						subqs.min_latitude = lat;
						subqs.max_latitude = (qs.max_latitude - lat > CELL_LAT) ? (lat + CELL_LAT) : qs.max_latitude;
						subqs.min_longitude = lon;
						subqs.max_longitude = (qs.max_longitude - lon > CELL_LON) ? (lon + CELL_LON) : qs.max_longitude;
						requestQueue.push({
							params: subqs,
							run: function (params) {
								return getCarProbe(params, true, regions, notifyCarProbe);
							}
						});
					}
				}

				// Monitor all requests are completed or canceled
				let deferred = Q.defer();
				promises.push(deferred.promise);
				requestQueue.push({
					run: function () {
						deferred.resolve();
					},
					canceled: function () {
						regions && notifyMessage({ type: "region", region_id: regions.id, state: "cancel" });
						deferred.resolve();
					}
				});
			} else {
				promises.push(getCarProbe(qs, true, null, notifyCarProbe));
			}
			return Q.all(promises).then(result => {
				return regions && notifyMessage({ type: "region", region_id: regions.id, state: "end" });
			}).catch((err) => {
				console.error('Failed to get car probe', err);
			});
		})).done(function () {
			// re-schedule once all the wss.send has been completed
			setTimeout(timerWebSockEmitFunc, TIMEOUT);
		});
	};
	setTimeout(timerWebSockEmitFunc, 1000);

	//
	// Create WebSocket server
	//
	var wss = router.wsServer = new WebSocketServer({
		server: server,
		path: path,
		verifyClient: function (info, callback) { //only allow internal clients from the server origin
			var isLocal = appEnv.url.toLowerCase().indexOf('://localhost') !== -1;
			let isFromValidOrigin = ((typeof info.origin !== 'undefined') && (info.origin.toLowerCase() === appEnv.url.toLowerCase())) ? true : false;
			var allow = isLocal || isFromValidOrigin;
			if (!allow) {
				if (typeof info.origin !== 'undefined') {
					console.error("rejected web socket connection from external origin " + info.origin + " only connection from internal origin " + appEnv.url + " are accepted");
				} else {
					console.error("rejected web socket connection from unknown origin. Only connection from internal origin " + appEnv.url + " are accepted");
				}
			}
			if (!callback) {
				return allow;
			}
			var statusCode = (allow) ? 200 : 403;
			callback(allow, statusCode);
		}
	});

	//
	// Assign "extent" to the client for each connection
	//
	wss.on('connection', function (client) {
		debug('got wss connectoin at: ' + client.upgradeReq.url);
		client.on('error', () => {
			console.log("[Monitor] Error with client id=" + client.clientId);
		});
		client.on('message', (message) => {
			console.log("[Monitor] Received message: " + message);
		});
		// assign extent obtained from the web sock request URL, to this client
		var url = client.upgradeReq.url;
		var qsIndex = url.lastIndexOf('?region=');
		if (qsIndex >= 0) {
			try {
				var j = decodeURI(url.substr(qsIndex + 8)); // 8 is length of "?region="
				var extent = JSON.parse(j);
				client.extent = normalizeExtent(extent);
			} catch (e) {
				console.error('Error on parsing extent in wss URL', e);
			}
		} else {
			qsIndex = url.lastIndexOf("?mo_id=");
			if (qsIndex >= 0) {
				const mo_id = decodeURI(url.substr(qsIndex + 7)); // 7 is length of "?mo_id="
				client.mo_id = mo_id;
			}
		}
	});
}

/**
 * Get car probe with specified parameters
 */
function getCarProbe(qs, addAlerts, regions, callback) {
	let promises = [];
	if (regions && qs.min_longitude && qs.min_latitude && qs.max_longitude && qs.max_latitude) {
		const CELL_LAT = 0.1;
		const CELL_LON = 0.1;
		for (let lon = qs.min_longitude; lon <= qs.max_longitude; lon += CELL_LON) {
			for (let lat = qs.min_latitude; lat <= qs.max_latitude; lat += CELL_LAT) {
				let subqs = _.clone(qs);
				subqs.min_latitude = lat;
				subqs.max_latitude = (qs.max_latitude - lat > CELL_LAT) ? (lat + CELL_LAT) : qs.max_latitude;
				subqs.min_longitude = lon;
				subqs.max_longitude = (qs.max_longitude - lon > CELL_LON) ? (lon + CELL_LON) : qs.max_longitude;
				promises.push(vehicleDataHub.getCarProbe(subqs));
			}
		}
	} else {
		promises.push(vehicleDataHub.getCarProbe(qs));
	}

	return Q.all(promises).then((result) => {
		let probes = [];
		result.forEach(p => {
			probes = probes.concat(p);
		});

		// send normal response
		(probes || []).forEach((p) => {
			if (p.timestamp) {
				p.ts = Date.parse(p.timestamp);
				p.deviceID = p.mo_id;
			}
		});
		if (regions && regions.type !== "single") {
			return probeAggregator.aggregate(regions, probes);
		}
		return probes;
	}).then((probes) => {
		if (!addAlerts || (regions && regions.type !== "single") || !probes || probes.length == 0) {
			callback && callback(probes, regions);
			return probes;
		}

		// Add alerts to probes
		var mo_ids = probes.map((probe) => { return probe.mo_id; });
		return driverInsightsAlert.getAlertsForVehicles(mo_ids, /*includeClosed*/false, 200).then((result) => {
			// result: { alerts: [ { closed_ts: n, description: s, mo_id: s, severity: s, timestamp: s, ts: n, type: s }, ...] }
			var alertsByMoId = _.groupBy(result.alerts || [], (alert) => { return alert.mo_id; });
			probes.forEach((probe) => {
				var alertsForMo = alertsByMoId[probe.mo_id] || {}; // lookup
				if (alertsForMo) { // list of alerts
					var alertCounts = _.countBy(alertsForMo, (alert) => {
						return alert.severity;
					});
					alertCounts.items = alertsForMo; // details if needed

					// calculate summary
					var alertsByType = _.groupBy(alertsForMo, (alert) => { return alert.type; });
					// severity: High: 100, Medium: 10, Low: 1, None: 0 for now
					var severityByType = _.mapObject(alertsByType, (alerts, type) => {
						if (alerts && alerts.length === 0) return undefined;
						return _.max(alerts, (alert) => {
							var s = alerts.severity && alerts.severity.toLowerCase();
							return s === 'high' ? 100 : (s === 'medium' ? 10 : (s === 'low' ? 1 : 0));
						}).severity;
					});
					alertCounts.byType = severityByType;
					//
					probe.info = _.extend(probe.info || {}, { alerts: alertCounts }); // inject alert counts
				}
			});

			callback && callback(probes, regions);
			return probes;
		});
	}).catch((error) => {
		console.error(error);
	});
}


function normalizeExtent(min_lat_or_extent, min_lng, max_lat, max_lng) {
	// convert one when the object is passed
	var min_lat;
	if (min_lat_or_extent && min_lat_or_extent.min_lat) {
		var e = min_lat_or_extent;
		min_lat = e.min_lat;
		min_lng = e.min_lng;
		max_lat = e.max_lat;
		max_lng = e.max_lng;
	} else {
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
	max_lng = whole_lng ? 180 : ((max_lng + 180) % 360) - 180;
	var extent = { min_lng: min_lng, min_lat: min_lat, max_lng: max_lng, max_lat: max_lat, whole_lng: whole_lng };

	return extent;
}
