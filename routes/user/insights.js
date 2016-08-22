/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
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
var Q = require('q');
var router = module.exports = require('express').Router();
var authenticate = require('./auth.js').authenticate;
var driverInsightsProbe = require('../../driverInsights/probe');
var driverInsightsAnalyze = require('../../driverInsights/analyze');
var driverInsightsTripRoutes = require('../../driverInsights/tripRoutes.js');
var driverInsightsContextMapping = require('../../driverInsights/contextMapping');
var driverInsightsAlert = require('../../driverInsights/fleetalert.js');
var dbClient = require('../../cloudantHelper.js');

router.post('/probeData',  authenticate, function(req, res) {
	try{
		driverInsightsProbe.sendRawData(req.body, function(msg){
			res.send(msg);
		});
	}catch(error){
		res.send(error);
	}
});

router.get('/probeData',  authenticate, function(req, res) {
	driverInsightsProbe.getCarProbeDataListAsDate().then(function(msg){
		res.send(msg);
	})["catch"](function(error){
		res.send(error);
	});
});

router.get('/driverInsights', authenticate, function(req, res) {
	getUserTrips(req).then(function(tripIdList){
		driverInsightsAnalyze.getList(tripIdList).then(function(msg){
			res.send(msg);
		});	
	})["catch"](function(error){
		res.send(error);
	});
});

router.get('/driverInsights/statistics', authenticate, function(req, res) {
	getUserTrips(req).then(function(tripIdList){
		driverInsightsAnalyze.getStatistics(tripIdList).then(function(msg){
			res.send(msg);
		});	
	})["catch"](function(error){
		res.send(error);
	});
});

router.get('/driverInsights/behaviors', authenticate, function(req, res) {
	getUserTrips(req).then(function(tripIdList){
		driverInsightsAnalyze.getTripList(tripIdList, req.query.all).then(function(msg){
			res.send(msg);
		});
	})["catch"](function(error){
		res.send(error);
	});
});

router.get('/driverInsights/:trip_uuid', authenticate, function(req, res) {
	driverInsightsAnalyze.getDetail(req.params.trip_uuid).then(function(msg){
		res.send(msg);
	})["catch"](function(error){
		res.send(error);
	});
});

router.get('/driverInsights/behaviors/latest', authenticate, function(req, res) {
	driverInsightsAnalyze.getLatestBehavior().then(function(msg){
		res.send(msg);
	})["catch"](function(error){
		res.send(error);
	});
});

router.get('/driverInsights/behaviors/:trip_uuid', authenticate, function(req, res) {
	driverInsightsAnalyze.getBehavior(req.params.trip_uuid).then(function(msg){
		res.send(msg);
	})["catch"](function(error){
		res.send(error);
	});
});

router.get("/driverInsights/triproutes/:trip_uuid", function(req, res){
	driverInsightsTripRoutes.getTripRoute(req.params.trip_uuid).then(function(msg){
		res.send(msg);
	})["catch"](function(error){
		res.send(error);
	})
});

router.get("/triproutes/:trip_id", function(req, res){
	driverInsightsTripRoutes.getTripRouteById(req.params.trip_id).then(function(msg){
		res.send(msg);
	})["catch"](function(error){
		res.send(error);
	});
});

router.get("/routesearch", function(req, res){
	var q = req.query;
	driverInsightsContextMapping.routeSearch(
		q.orig_latitude,
		q.orig_longitude,
		q.target_latitude,
		q.target_longitude
	).then(function(msg){
		res.send(msg);
	})["catch"](function(error){
		res.send(error);
	});
});

router.get("/alert", function(req, res){
	var q = req.query;
	var type = q.type;
	var severity = q.severity;
	var mo_id = q.mo_id;
	if(type && mo_id){
		res.send("Specify only type or mo_id");
	}else if(type){
		Q.when(driverInsightsAlert.getAlertByType(type), function(docs){
			res.send(docs);
		});
	}else if(severity){
		Q.when(driverInsightsAlert.getAlertBySeverity(severity), function(docs){
			res.send(docs);
		});
	}else if(mo_id){
		Q.when(driverInsightsAlert.getAlertByVehicle(mo_id), function(docs){
			res.send(docs);
		});
	}else{
		res.send("Specify type or mod_id");
	}
});

function getUserTrips(req){
	var userid = req.user && req.user.id;
	var mo_id = req.query.mo_id;
	if(!mo_id){
		return Q([]);
	}
	var deferred = Q.defer();
	driverInsightsTripRoutes.getTripsByDevice(mo_id, 100).then(
		function(tripRoutes){
			var trip_ids = tripRoutes.map(function(item) {
				return item.trip_id;
			}).filter(function(trip_id){
				return trip_id;
			});
			deferred.resolve(trip_ids);
		}
	)["catch"](function(error){
		deferred.reject(error);
	});
	return deferred.promise;
}