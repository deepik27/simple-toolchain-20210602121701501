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

var Q = new require('q');
var _ = new require('underscore');
var request = require("request");
var debug = require('debug')('contextMapping');
debug.log = console.log.bind(console);

var contextMapping = {

	contextMappingConfig: function(){
		var userVcapSvc = JSON.parse(process.env.USER_PROVIDED_VCAP_SERVICES || '{}');
		var vcapSvc = userVcapSvc.iotforautomotive || VCAP_SERVICES.iotforautomotive;
		if (vcapSvc) {
			var dirverInsightsCreds = vcapSvc[0].credentials;
			return {
				baseURL: dirverInsightsCreds.api + "mapinsights",
				tenant_id : dirverInsightsCreds.tenant_id,
				username : dirverInsightsCreds.username,
				password : dirverInsightsCreds.password
			};
		}
		throw new Exception("!!! no provided credentials for DriverInsights. using shared one !!!");
	}(),
	
	_addAuthOption: function(config, options) {
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
	
	/*
	 * Get options for an HTTP request
	 */
	_getRequestOptions: function(path, queries, base){
		var qps = queries ? _.clone(queries) : {};
		if (this.contextMappingConfig.tenant_id) {
			qps.tenant_id = this.contextMappingConfig.tenant_id;
		}
		var qs = Object.keys(qps).map(function(k){
			return k + '=' + encodeURIComponent(qps[k].toString());
		}).join('&');
		return this._addAuthOption(this.contextMappingConfig, _.extend(base || {}, {
				url: this.contextMappingConfig.baseURL + path + (qs ? ('?' + qs) : '')
		}));
	},

	/**
	 * Async get route from (orig_lat, orig_lon) to (dest lat, dest_lon).
	 */
	routeSearch: function(orig_lat, orig_lon, dest_lat, dest_lon, option){
		var deferred = Q.defer();

		var tenant_id = this.contextMappingConfig.tenant_id;
		var options = this._addAuthOption(this.contextMappingConfig, {
				url: this.contextMappingConfig.baseURL + '/mapservice/routesearch' + 
					'?orig_heading=0&dest_heading=0' +
					'&orig_latitude=' + orig_lat.toString() +
					'&orig_longitude=' + orig_lon.toString() +
					'&dest_latitude=' + dest_lat.toString() +
					'&dest_longitude=' + dest_lon.toString() +
					(option ? ('&option=' + option) : '') +
					(tenant_id ? ('&tenant_id=' + tenant_id) : '')
		});
		debug("calling routesearch URL: " + options.url);
		request(options, function (error, response, body) {
			if(error){
				console.error("error on routesearch\n url: " +  options.url + "\n error: " + error);
				return deferred.reject(error);
			}else if(response.statusCode > 299){
				console.error("error on routesearch\n url: " +  options.url + "\n body: " + body);
				return deferred.reject(response.toJSON());
			}
			
			try{
				deferred.resolve(JSON.parse(body));
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
		return this.routeSearch(orig_lat, orig_lon, dest_lat, dest_lon).then(function(route){
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
		var deferred = Q.defer();

		var tenant_id = this.contextMappingConfig.tenant_id;
		var options = this._addAuthOption(this.contextMappingConfig, {
				url: this.contextMappingConfig.baseURL + '/mapservice/map/matching' +
						'?latitude=' + lat.toString() + 
						'&longitude=' + lon.toString() +
						(tenant_id ? ('&tenant_id=' + tenant_id) : ''),
				pool: contextMapping._matchMapPool,
				agentOptions: contextMapping._matchMapAgentOptions,
		});
		debug("calling map matching URL: " + options.url);
		request(options, function (error, response, body) {
			if (!error && (!errorOnErrorResponse || response.statusCode == 200)) {
				try{
					var responseJson = JSON.parse(body);
					if (responseJson.length == 0){
						console.error("no match found\n url: " +  options.url + "\n body: " + body);
					} else {
						debug('matching done\n: url: ' + options.url + '\n body: ' + body);
					}
					deferred.resolve(responseJson);
				}
				catch(e){
					console.error("error on map matching\n url: " +  options.url + "\n body: " + body);
					deferred.resolve([]);
				};
			}
			else
				return deferred.reject(error || {statusCode: response.statusCode, body: body});
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
				if (results.length == 0)
					return {lat: lat, lng: lon}; // fallback for not-matched
				var latlng = results[0];
				return  {
					lat: latlng["matched_latitude"],
					lng: latlng["matched_longitude"]
				};
			});
	},
	matchMapFirst: function(lat, lon){ // no fallback, explicit error
		return contextMapping.matchMapRaw(lat, lon, true)
		.then(function(results){ // results is parsed JSON of array of matches
			if (results.length == 0)
				return null;
			var latlng = results[0];
			return  {
				lat: latlng["matched_latitude"],
				lng: latlng["matched_longitude"]
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
		
		var deferred = Q.defer();
		var tenant_id = this.contextMappingConfig.tenant_id;
		var options = this._addAuthOption(this.contextMappingConfig, {
			url: this.contextMappingConfig.baseURL + "/mapservice/link" +
				"?link_id=" + link_id +
				(tenant_id ? ('&tenant_id=' + tenant_id) : '')
		});
		var this_ = this;
		request(options, function(error, response, body){
			if(!error){
				try{
					var responseJson = JSON.parse(body);
					if(responseJson.links && responseJson.links.length > 0){
						debug("link information retrieved url: " + options.url + "\n body: " + body);
						if(!ignoreCache && this_._linkInformationCache){
							debug('[CACHE] Caching link id data %s!', link_id);
							this_._linkInformationCache[link_id] = {
									data: responseJson.links[0],
									lastAccess: Date.now(),
							};
						}
						deferred.resolve(responseJson.links[0]);
					}else{
						console.error("link information not found\n url: : " + options.url + "\n body: " + body);
						deferred.reject(responseJson);
					}
				}catch(e){
					console.error("error on get link information\n url: " + options.url + "\n body: " + body);
					deferred.reject(e);
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
		var deferred = Q.defer();
		var options = contextMapping._getRequestOptions('/eventservice/event', null, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(event),
			//json: true
		});
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
		var deferred = Q.defer();
		var options = contextMapping._getRequestOptions('/eventservice/events', {event_id: event_id}, {
			method: 'DELETE',
		});
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
		var deferred = Q.defer();
		var params = {
				min_latitude: min_lat,
				min_longitude: min_lng,
				max_latitude: max_lat,
				max_longitude: max_lng,
			};
		if (event_type) params.event_type = event_type;
		if (status) params.status = status;
		
		var options = contextMapping._getRequestOptions('/eventservice/event/query', params);
		request(options, function(error, response, body){
			if(response && response.statusCode < 300) {
				try{
					var responseJson = JSON.parse(body);
					deferred.resolve(responseJson);
				}catch(e){
					deferred.reject(e);
				}
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
		var deferred = Q.defer();
		var options = contextMapping._getRequestOptions('/eventservice/event', {event_id: event_id});
		request(options, function(error, response, body){
			if(response && response.statusCode < 300) {
				try{
					var responseJson = JSON.parse(body);
					deferred.resolve(responseJson);
				}catch(e){
					deferred.reject(e);
				}
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
		var deferred = Q.defer();
		var params = {};
		if (page) params.num_page = page;
		if (num_rec_in_page) params.num_rec_in_page = num_rec_in_page;
		var options = contextMapping._getRequestOptions('/eventservice/event/allevents', params);
		request(options, function(error, response, body){
			if(response && response.statusCode < 300) {
				try{
					var responseJson = JSON.parse(body);
					debug('  result getAllEventsRaw: # of events is ' + responseJson.events.length);
					deferred.resolve(responseJson);
				}catch(e){
					deferred.reject(e);
				}
			}else{
				return deferred.reject(error || response.toJSON());
			}
		});
		return deferred.promise;
	},
}

module.exports = contextMapping;
