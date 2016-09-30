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
 * Service to simulate geolocation
 */
angular.module('htmlClient')
.factory('virtualGeoLocation', function($q, $interval, $http, mobileClientService) {
    var service = {
    	driving: false,
    	tripRouteIndex: 0,
    	tripRoute: null,
    	prevLoc: {lat:48.134994,lon:11.671026,speed:0,init:true},
    	destination: null,
    	
    	watchPosition: function(callback){
    		if(!this.tripRoute) {
    			this._resetRoute();
    		}
    		this.driving = true;
    		var self = this;
    		return $interval(function(){
    			self.getCurrentPosition(callback);
    		}, 1000);
    	},
    	clearWatch: function(watchId){
			$interval.cancel(watchId);
    		this.driving = false;
    	},
    	setCurrentPosition: function(loc /* lat, lon */, donotResetRoute){
    		if(this.driving){
    			// under driving
    			return;
    		}
    		this.prevLoc = loc;
    		if(isNaN(this.prevLoc.speed)){
    			this.prevLoc.speed = 0;
    		}
    		return donotResetRoute ? null : this._resetRoute();
    	},
    	setDestinationPosition: function(loc){
    		if(this.driving){
    			// under driving
    			return;
    		}
    		this.destination = loc;
    		return this._resetRoute();
    	},
    	getDestination: function() {
    		return this.destination;
    	},
    	getCurrentPosition: function(callback){
    		var p = this._getCurrentPosition();
    		if(p && !p.init){
    			callback({
    				coords: {
    					latitude: p.lat,
    					longitude: p.lon,
    					speed: p.speed*1000/3600,
    					heading: p.heading
    				}
    			});
    		}else{
	    		var self = this;
	    		if(navigator.geolocation){
		    		navigator.geolocation.getCurrentPosition(function(position){
		    			var c = position.coords;
		    			self.setCurrentPosition({lat:c.latitude, lon:c.longitude, speed: c.speed}, true);
		    			callback(position);
		    		});
		    	}else{
	    			callback({coords:{latitude:this.prevLoc.lat, longitude:this.prevLoc.lon, speed:this.prevLoc.speed}});
		    	}
    		}
    	},
    	
    	// find a random location in about 5km from the specified location
    	_getDestLoc: function(slat, slng){
			var ddist = (Math.random()/2 + 0.5) * 0.025 / 2;
			var dtheta = 2 * Math.PI * Math.random();
			var dlat = 0;
			var dlng = 0;
			if(this.destination){
				dlat = this.destination.lat;
				dlng = this.destination.lon;
			}else{
				dlat = +slat + ddist * Math.sin(dtheta);
				dlng = +slng + ddist * Math.cos(dtheta);
			}
			return {lat: dlat, lng: dlng};
		},
		
		// reset trip route
		_resetRoute:function(){
			var deferred = $q.defer();
			var slat = this.prevLoc.lat;
			var slng = this.prevLoc.lon;
			var dest = this._getDestLoc(slat, slng);
			var self = this;
			this._findRoute(0, slat, slng, dest.lat, dest.lng).then(function(routeArray1){
				var dest2 = self._getDestLoc(slat, slng);
				if(this.destination){
					// if the destination specified, just trip from source to the destination
					self.tripRouteIndex = 0;
					self.tripRoute = routeArray1;
					self.prevLoc = routeArray1[0];
					deferred.resolve(totalRoute1);
				}else{
					// find a trip route with 3 positions (source -> destination1 -> destination2 -> source)
					self._findRoute(0, dest.lat, dest.lng, dest2.lat, dest2.lng).then(function(routeArray2){
						self._findRoute(0, dest2.lat, dest2.lng, slat, slng).then(function(routeArray3){
							var totalRoute = routeArray1.concat(routeArray2, routeArray3);
							self.tripRouteIndex = 0;
							self.tripRoute = totalRoute;
							self.prevLoc = totalRoute[0];
							deferred.resolve(totalRoute);
						});
					});
				}
    		})["catch"](function(error){
    			deferred.reject(error);
    		});
    		return deferred.promise;
    	},
    	
    	// find a route from a specific location to a specific location
    	_findRoute:function(retryCount, slat, slng, dlat, dlng){
    		var retryCount = retryCount || 0;
    		var deferred = $q.defer();
			var self=this;

			$http(mobileClientService.makeRequestOption({
				method: "GET",
				url: "/user/routesearch?orig_latitude=" + slat + "&orig_longitude=" + slng + "&target_latitude=" + dlat + "&target_longitude=" + dlng + "&option=avoid_event"
			})).success(function(data, status){
				var routeArray = [];
				data.link_shapes.forEach(function(shapes){
					shapes.shape.forEach(function(shape){
						if(shape)
							routeArray.push(shape);
					});
				});
				if(routeArray.length >= 2){
					deferred.resolve(routeArray);
					return;
				}else if(retryCount++ < 5){
					// retry 5 times
					console.log("failed to search route. retry[" + retryCount + "]");
					return self._findRoute(retryCount, slat, slng, dlat, dlng).then(function(result){
						deferred.resolve(result);
					});
				}
				console.error("Cannot get route for simulation");
				deferred.reject();
			}).error(function(error, status){
				console.error("Error[" + status + "] in route search: " + error);
				deferred.reject();
			});
			return deferred.promise;
    	},
    	
    	_getCurrentPosition: function(){
			if(!this.tripRoute || this.tripRoute.length < 2){
				return this.prevLoc;
			}
			var prevLoc = this.prevLoc;
			var loc = this.tripRoute[this.tripRouteIndex];
			var speed = this._getDistance(loc, prevLoc)*0.001*3600;
			while((speed - prevLoc.speed) < -20 && this.tripRouteIndex < this.tripRoute.length-1){ 
				// too harsh brake, then skip the pointpoint
				this.tripRouteIndex++;
				loc = this.tripRoute[this.tripRouteIndex];
				speed = this._getDistance(loc, prevLoc)*0.001*3600;
			}
			while(speed>120 || (speed - prevLoc.speed) > 20){
				// too harsh acceleration, then insert intermediate point
				var loc2 = {lat: (+loc.lat+prevLoc.lat)/2, lon: (+loc.lon+prevLoc.lon)/2};
				speed = this._getDistance(loc2, prevLoc)*0.001*3600;
				this.tripRoute.splice(this.tripRouteIndex, 0, loc2);
				loc = loc2;
			}
			loc.speed = speed
			// calculate heading
			var rad = 90 - Math.atan2(Math.cos(prevLoc.lat/90)*Math.tan(loc.lat/90)-Math.sin(prevLoc.lat/90)*Math.cos((loc.lon-prevLoc.lon)/180),
					Math.sin((loc.lon-prevLoc.lon)/180)) / Math.PI * 180;
			loc.heading = (rad + 360)%360;
			// keep the previous info
			this.prevLoc = loc;

			this.tripRouteIndex++;
			if(this.tripRouteIndex >= this.tripRoute.length){
				this.tripRouteIndex = 0;
			}
			return loc;
    	},
    	/*
		 * Calculate distance in meters between two points on the globe
		 * - p0, p1: points in {latitude: [lat in degree], longitude: [lng in degree]}
		 */
		_getDistance: function(p0, p1) {
			// Convert to Rad
			function to_rad(v) {
				return v * Math.PI / 180;
			}
			var latrad0 = to_rad(p0.lat);
			var lngrad0 = to_rad(p0.lon);
			var latrad1 = to_rad(p1.lat);
			var lngrad1 = to_rad(p1.lon);
			var norm_dist = Math.acos(Math.sin(latrad0) * Math.sin(latrad1) + Math.cos(latrad0) * Math.cos(latrad1) * Math.cos(lngrad1 - lngrad0));
			
			// Earths radius in meters via WGS 84 model.
			var earth = 6378137;
			return earth * norm_dist;
		}
    };
    return service;
})
;