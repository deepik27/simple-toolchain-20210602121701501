/**
 * Copyright 2016, 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var contextMapping = module.exports = {};

var Q = new require('q');
var _ = new require('underscore');
var request = require('./requestSecureGw.js'); 
var debug = require('debug')('contextMapping');
debug.log = console.log.bind(console);

_.extend(contextMapping, {

	contextMappingConfig: function(){
		var userVcapSvc = JSON.parse(process.env.USER_PROVIDED_VCAP_SERVICES || '{}');
		var vcapSvc = userVcapSvc.iotforautomotive || VCAP_SERVICES.iotforautomotive;
		if (vcapSvc) {
			var creds = vcapSvc[0].credentials;
			return {
				baseURL: (creds.mapinsights && creds.mapinsights.api) ? 
						creds.mapinsights.api : (creds.api + "mapinsights"),
				tenant_id : creds.tenant_id,
				username : creds.username,
				password : creds.password
			};
		}
		throw new Exception("!!! no provided credentials for DriverInsights. using shared one !!!");
	}(),
	
	_makeRequestOptions: function(config, options) {
		// Add query parameters to options.url if tenant id exists
		if (config.tenant_id) {
			if (!options.qs) options.qs = {};
			options.qs.tenant_id = config.tenant_id;
		}
		
		// Add basic authentication if username and password are specified
		if (config.username && config.password) {
			return _.extend(options, {
				rejectUnauthorized: false,
				auth: {
					user: config.username,
					pass: config.password,
					sendImmediately: true
				}
			});
		}
		return options;
	},

	/**
	 * Async get route from (orig_lat, orig_lon) to (dest lat, dest_lon).
	 */
	routeSearch: function(orig_lat, orig_lon, orig_heading, dest_lat, dest_lon, dest_heading, option) {
		var qs = {
			orig_heading: orig_heading,
			orig_latitude: orig_lat,
			orig_longitude: orig_lon,
			dest_latitude: dest_lat,
			dest_longitude: dest_lon,
			dest_heading: dest_heading
		};
		if (option) qs.option = option;
		
		var node = this.contextMappingConfig;
		var options = this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/mapservice/routesearch',
			qs: qs,
			json: true
		});
		
		var deferred = Q.defer();
		debug("calling routesearch URL: " + options.url);
		request(options, function (error, response, result) {
			if(error){
				console.error("error on routesearch\n url: " +  options.url + "\n error: " + error);
				return deferred.reject(error);
			}else if(response.statusCode > 299){
				console.error("error on routesearch\n url: " +  options.url + "\n body: " + result);
				return deferred.reject(response.toJSON());
			}
			
			try{
				deferred.resolve(result);
			}catch(e){
				console.error("error on routesearch\n url: " +  options.url + "\n bad_content: " + e);
				deferred.reject(e);
			}
		});
		return deferred.promise;
	},
	
	/**
	 * Async get distance from (orig_lat, orig_lon) to (dest lat, dest_lon).
	 */
	routeDistance: function(orig_lat, orig_lon, dest_lat, dest_lon){
		return this.routeSearch(orig_lat, orig_lon, 0, dest_lat, dest_lon, 0).then(function(route){
			return route.route_length || -1;
		})['catch'](function(er){
			// fall-back error and return -1;
			return -1;
		});
	},

	/**
	 * Async map match - raw
	 * - the result promise will be resolved to a response JSON
	 *   * note that it may not have matched results.
	 */
	matchMapRaw: function(lat, lon, errorOnErrorResponse){
		var node = this.contextMappingConfig;
		var options = this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/mapservice/map/matching',
			qs: {
				latitude: lat,
				longitude: lon
			},
			json: true,
			pool: this._matchMapPool,
			agentOptions: this._matchMapAgentOptions,
		});

		var deferred = Q.defer();
		debug("calling map matching URL: " + options.url);
		request(options, function (error, response, result) {
			if (!error && (!errorOnErrorResponse || response.statusCode == 200)) {
				if (result.length === 0) {
					console.error("no match found\n url: " +  options.url + "\n body: " + result);
				} else {
					debug('matching done\n: url: ' + options.url + '\n body: ' + JSON.stringify(result));
				}
				deferred.resolve(result);
			} else {
				return deferred.reject(error || {statusCode: response.statusCode, body: result});
			}
		});
		return deferred.promise;
	},
	/**
	 * Async map match
	 * - returns the first match, returns the given (lat,lon) in case no match
	 */
	matchMap: function(lat, lon, errorOnErrorResponse){
		return contextMapping.matchMapRaw(lat, lon, errorOnErrorResponse)
			.then(function(results){ // results is parsed JSON of array of matches
				if (results.length === 0)
					return {lat: lat, lng: lon}; // fallback for not-matched
				var latlng = results[0];
				return  {
					lat: latlng.matched_latitude,
					lng: latlng.matched_longitude
				};
			});
	},
	matchMapFirst: function(lat, lon){ // no fallback, explicit error
		return contextMapping.matchMapRaw(lat, lon, true)
		.then(function(results){ // results is parsed JSON of array of matches
			if (results.length === 0)
				return null;
			var latlng = results[0];
			return  {
				lat: latlng.matched_latitude,
				lng: latlng.matched_longitude
			};
		});
	},
	getLinkInformation: function(link_id, ignoreCache){
		// Cache the link information to reduce the number of Context Mapping API call
		if(!ignoreCache){
			if(!this._linkInformationCache){
				this._linkInformationCache = {};
				this._linkInformationCacheHit = 0;
				this._linkInformationCacheMiss = 0;
			}
			var cachedResult = this._linkInformationCache[link_id];
			if(cachedResult){
				this._linkInformationCacheHit ++;
				debug('[CACHE] cache hit for link %s!', link_id);
				cachedResult.lastAccess = Date.now(); // update time
				return Q(cachedResult.data);
			}else{
				this._linkInformationCacheMiss ++;
				debug('[CACHE] cache MISSED for link %s. Hit rate: %f', link_id, this._linkInformationCacheHit / (this._linkInformationCacheHit + this._linkInformationCacheMiss));
			}
			// reduce cache size to half when it exceeds 200
			var allKeys = Object.keys(this._linkInformationCache);
			if(allKeys && allKeys.length > 1000){
				debug('[CACHE] cache size is large %d. Reducing...', allKeys.length);
				var sorted = _.sortBy(allKeys, (function(key){
					return this._linkInformationCache[key].lastAccess;
				}).bind(this));
				for(var i = 0; i < sorted.length / 2; i++){
					delete this._linkInformationCache[sorted[i]];
				}
				debug('[CACHE]   cache size is reduced to %d.', Object.keys(this._linkInformationCache).length);
			}
		}
		
		var node = this.contextMappingConfig;
		var options = this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/mapservice/link',
			qs: {link_id: link_id},
			json: true
		});

		var deferred = Q.defer();
		var this_ = this;
		request(options, function(error, response, result){
			if(!error){
				if(result.links && result.links.length > 0){
					debug("link information retrieved url: " + options.url + "\n body: " + JSON.stringify(result));
					if(!ignoreCache && this_._linkInformationCache){
						debug('[CACHE] Caching link id data %s!', link_id);
						this_._linkInformationCache[link_id] = {
								data: responseJson.links[0],
								lastAccess: Date.now(),
						};
					}
					deferred.resolve(result.links[0]);
				}else{
					console.error("link information not found\n url: : " + options.url + "\n body: " + JSON.stringify(result));
					deferred.reject(responseJson);
				}
			}else{
				return deferred.reject(error);
			}
		});
		return deferred.promise;
	},
	/**
	 * Create an event in the Context Mapping servie
	 * https://developer.ibm.com/api/view/id-194:title-IBM__Watson_IoT_Context_Mapping#POST/eventservice/event
	 * @param event: a JSON object w/ s_latitude, s_longitude, event_type properties. 
	 * @returns deferred. successful result returns the event ID (integer).
	 */
	createEvent: function(event){
		var node = this.contextMappingConfig;
		var options = this._makeRequestOptions(node, {
			method: 'POST',
			url: node.baseURL + '/eventservice/event',
			body: event,
			json: true
		});

		var deferred = Q.defer();
		debug('Creating a new event: ', options);
		request(options, function(error, response, body){
			if(response && response.statusCode < 300) {
				debug('   Event created: ', body);
				try{
					return deferred.resolve(body);
				}catch(e){
					console.error("error on parsing createEvent result\n url: " + options.url + "\n body: " + body);
					return deferred.reject(e);
				}
			}else {
				return deferred.reject(error || response.toJSON());
			}
		});
		return deferred.promise;
	},
	/**
	 * Delete an event in the Context Mapping service
	 * @param event_id: event id
	 */
	deleteEvent: function(event_id){
		var node = this.contextMappingConfig;
		var options = this._makeRequestOptions(node, {
			method: 'DELETE',
			url: node.baseURL + '/eventservice/events',
			qs: {event_id: event_id}
		});

		var deferred = Q.defer();
		debug('Deleting an event: ', event_id);
		request(options, function(error, response, body){
			if(response && response.statusCode < 300) {
				debug('   Event created: ', response);
				return deferred.resolve(event_id);
			}else{
				return deferred.reject(error || response.toJSON());
			}
		});
		return deferred.promise;
	},
	/**
	 * Query events in the Context Mapping service
	 * https://developer.ibm.com/api/view/id-194:title-IBM__Watson_IoT_Context_Mapping#GET/eventservice/event/query
	 * @param min_lat, min_lng, max_lat, max_lng: areas to query
	 * @param event_type: optional
	 * @param status: optional
	 * @returns deferred.
	 */
	queryEvent: function(min_lat, min_lng, max_lat, max_lng, event_type, status){
		var qs = {
				min_latitude: min_lat,
				min_longitude: min_lng,
				max_latitude: max_lat,
				max_longitude: max_lng
		};
		if (event_type) qs.event_type = event_type;
		if (status) qs.status = status;
		
		var node = this.contextMappingConfig;
		var options = this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/eventservice/event/query',
			qs: qs,
			json: true
		});

		var deferred = Q.defer();
		request(options, function(error, response, result){
			if(response && response.statusCode < 300) {
				deferred.resolve(result);
			}else{
				return deferred.reject(error || response.toJSON());
			}
		});
		return deferred.promise;
	},
	/**
	 * Query events in the Context Mapping service
	 * https://developer.ibm.com/api/view/id-194:title-IBM__Watson_IoT_Context_Mapping#GET/eventservice/event/query
	 * @param min_lat, min_lng, max_lat, max_lng: areas to query
	 * @param event_type: optional
	 * @param status: optional
	 * @returns deferred.
	 */
	getEvent: function(event_id){
		var node = this.contextMappingConfig;
		var options = this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/eventservice/event',
			qs: {event_id: event_id},
			json: true
		});
		
		var deferred = Q.defer();
		request(options, function(error, response, result){
			if(response && response.statusCode < 300) {
				deferred.resolve(result);
			}else{
				return deferred.reject(error || response.toJSON());
			}
		});
		return deferred.promise;
	},
	/**
	 * Get all the Context Mapping events using the getAllEventsRaw
	 * @return promise: list of all the events
	 */
	getAllEvents: function(){
		var N_REC_IN_PAGE = 100;
		return contextMapping.getAllEventsRaw(1, N_REC_IN_PAGE).then(function(root){
			debug('getAllEvents: # of pages is ' + root.num_page);
			var events = root.events; // events in the initial page
			var n_in_page = root.num_rec_in_page;
			// resolve events in the subsequent pages
			var last_page = Math.floor((root.event_count + n_in_page - 1) / n_in_page);
			var moreEvents = _.range(2, last_page + 1).map(function(page){
				 return contextMapping.getAllEventsRaw(page, n_in_page)
				 	.then(function(response){
				 		return response.events;
				 	});
			});
			return Q.all(moreEvents).then(function(events_list){
				// append moreEents to the events
				return events_list.reduce(function(all, events){
					return all.concat(events);
				}, events);
			});
		});
	},
	/**
	 * https://developer.ibm.com/api/view/id-194:title-IBM__Watson_IoT_Context_Mapping#GET/eventservice/event/allevents
	 * @return promise: a page of the all events
	 */
	getAllEventsRaw: function(page, num_rec_in_page){
		var params = {};
		if (page) params.num_page = page;
		if (num_rec_in_page) params.num_rec_in_page = num_rec_in_page;

		var node = this.contextMappingConfig;
		var options = this._makeRequestOptions(node, {
			method: 'GET',
			url: node.baseURL + '/eventservice/event/allevents',
			qs: params,
			json: true
		});

		var deferred = Q.defer();
		request(options, function(error, response, result){
			if(response && response.statusCode < 300) {
				debug('  result getAllEventsRaw: # of events is ' + result.events.length);
				deferred.resolve(result);
			}else{
				return deferred.reject(error || response.toJSON());
			}
		});
		return deferred.promise;
	}
});
