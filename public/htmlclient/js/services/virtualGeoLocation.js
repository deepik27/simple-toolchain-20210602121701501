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
				console.error("Error[" + statu + "] in route search: " + error);
				deferred.reject();
			});
			return deferred.promise;
    	},
    	
    	_getCurrentPosition(){
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