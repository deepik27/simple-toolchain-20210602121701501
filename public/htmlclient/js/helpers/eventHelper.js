/**
 * Copyright 2019 IBM Corp. All Rights Reserved.
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
  * Event healer
  */
var EventHelper = function (map, layer, q, eventService) {
  // the map
  this.map = map;
  this.eventLayer = layer;
  this.eventService = eventService;
  this.q = q;
  this.eventTypes = [];

  var self = this;
  this.eventLoadingHandle = null;
  layer.setStyle(function (feature, resolution) {
    var eventIcon = new ol.style.Circle({
      radius: 10,
      stroke: new ol.style.Stroke({
        color: "#ffc000",
        width: 1
      }),
      fill: new ol.style.Fill({
        color: "yellow"
      })
    });
    var affectedEventIcon = new ol.style.Circle({
      radius: 10,
      stroke: new ol.style.Stroke({
        color: "yellow",
        width: 3
      }),
      fill: new ol.style.Fill({
        color: "#ffc000"
      })
    });

    var arrowTexts = ["\u2191", "\u2197", "\u2192", "\u2198", "\u2193", "\u2199", "\u2190", "\u2196"];
    self.styles = arrowTexts.map(function (text) {
      rotation = 0; // 3.14 * rotation / 180;
      return new ol.style.Style({
        image: eventIcon,
        text: new ol.style.Text({
          fill: new ol.style.Fill({ color: "#606060" }),
          scale: 1.0,
          textAlign: "center",
          textBaseline: "middle",
          text: text,
          rotation: rotation,
          font: "16px monospace"
        })
      });
    });
    self.affectedStyles = arrowTexts.map(function (text) {
      rotation = 0; // 3.14 * rotation / 180;
      return new ol.style.Style({
        image: affectedEventIcon,
        text: new ol.style.Text({
          fill: new ol.style.Fill({ color: "#404040" }),
          scale: 1.0,
          textAlign: "center",
          textBaseline: "middle",
          text: text,
          rotation: rotation,
          font: "16px monospace"
        })
      });
    });

    return function (feature, resolution) {
      var style = self.getEventStyle(feature);
      feature.setStyle(style);
      return style;
    };
  }());

  this.eventListChangedListeners = [];
  this.eventMap = {};

  this.map.getView().on('change:center', function () {
    self.viewChanged();
  });
  this.map.getView().on('change:resolution', function () {
    self.viewChanged();
  });
  q.when(this.getEventTypes(), function (eventTypes) {
    self.eventTypes = eventTypes;
  });
  this.updateEvents();
};

EventHelper.prototype.getEventStyle = function getEventStyle(feature) {
  var event = feature.get("item");
  if (!event) {
    return;
  }
  var textIndex = Math.floor((event.heading % 360) / Math.floor(360 / this.styles.length));
  var rotation = (event.heading % 360) % Math.floor(360 / this.styles.length);
  if (rotation > Math.floor(360 / this.styles.length) / 2) {
    textIndex++;
    if (textIndex === this.styles.length)
      textIndex = 0;
  }
  var affected = feature.get("affected");
  return affected ? this.affectedStyles[textIndex] : this.styles[textIndex];
};

EventHelper.prototype.viewChanged = function viewChanged() {
  if (this.eventLoadingHandle) {
    clearTimeout(this.eventLoadingHandle);
    this.eventLoadingHandle = null;
  }
  var self = this;
  this.eventLoadingHandle = setTimeout(function () {
    self.updateEvents();
  }, 1000);
};

EventHelper.prototype.addEventChangedListener = function addEventChangedListener(listener) {
  var index = this.eventListChangedListeners.indexOf(listener);
  if (index < 0) {
    this.eventListChangedListeners.push(listener);
  }
};

EventHelper.prototype.removeEventChangedListener = function removeEventChangedListener(listener) {
  var index = this.eventListChangedListeners.indexOf(listener);
  if (index >= 0) {
    this.eventListChangedListeners.splice(index, 1);
  }
};

EventHelper.prototype.getEventTypes = function getEventTypes() {
  var deferred = this.q.defer();
  this.q.when(this.eventService.getEventTypes(), function (events) {
    deferred.resolve(events);
  });
  return deferred.promise;
};

EventHelper.prototype.updateEvents = function updateEvents(force) {
  var size = this.map.getSize();
  if (!size || isNaN(size[0]) || isNaN(size[1])) {
    return;
  }

  var self = this;
  var ext = this.map.getView().calculateExtent(size);
  var extent = ol.proj.transformExtent(ext, 'EPSG:3857', 'EPSG:4326');
  if (this.searchArea &&
    this.searchArea.min_longitude <= extent[0] && this.searchArea.min_latitude <= extent[1] &&
    this.searchArea.max_longitude >= extent[2] && this.searchArea.max_latitude >= extent[3]) {
    return;
  }
  this.searchArea = {
    min_longitude: extent[0] - 0.01,
    min_latitude: extent[1] - 0.01,
    max_longitude: extent[2] + 0.01,
    max_latitude: extent[3] + 0.01
  };
  this.q.when(this.eventService.queryEvents(this.searchArea), function (events) {
    var eventsToAdd = [];
    var eventsToRemoveMap = {};
    for (var key in self.eventMap) {
      eventsToRemoveMap[key] = self.eventMap[key].event;
    }

    events.forEach(function (event) {
      var event_id = event.event_id;

      if (!self.eventMap[event_id]) {
        eventsToAdd.push(event);
      }
      if (eventsToRemoveMap[event_id])
        delete eventsToRemoveMap[event_id];
    });
    if (eventsToAdd.length > 0) {
      self.addEventsToView(eventsToAdd);
    }

    var eventsToRemove = [];
    for (var key in eventsToRemoveMap) {
      eventsToRemove.push(eventsToRemoveMap[key]);
    }
    if (eventsToRemove.length > 0) {
      self.removeEventsFromView(eventsToRemove);
    }

    if (eventsToAdd.length > 0 || eventsToRemove.length > 0) {
      self.eventListChangedListeners.forEach(function (listener) {
        listener(events);
      });
    }
  });
};

EventHelper.prototype.createEvent = function createEvent(lat, lon, event_type, eventTypeObj, heading) {
  var self = this;
  var date = new Date();
  var currentTime = date.toISOString();
  //		var endTime = new Date(date.getTime() + 60*1000).toISOString(); 
  var params = {
    event_type: event_type,
    s_latitude: lat,
    s_longitude: lon,
    event_time: currentTime,
    start_time: currentTime,
    heading: heading || 0
    //				end_time: endTime
  };
  if (eventTypeObj) {
    if (eventTypeObj.description) {
      params.event_name = eventTypeObj.description;
    }
    if (eventTypeObj.category) {
      params.event_category = eventTypeObj.category;
    }
  }
  this.q.when(this.eventService.createEvent(params), function (event_id) {
    self.q.when(self.eventService.getEvent(event_id), function (event) {
      if (event && event.event_type) {
        self.addEventsToView([event]);
      } else {
        self.viewChanged();
      }
    });
  });
};

EventHelper.prototype.updateAffectedEvents = function updateAffectedEvents(events) {
  var updatedFeatures = [];
  var ids = (events || []).map(function (e) { return e.event_id; });
  for (var key in this.eventMap) {
    var event = this.eventMap[key].event;
    var feature = this.eventMap[key].feature;
    var affected = ids.indexOf(event.event_id) >= 0;
    if (feature.get('affected') != affected) {
      feature.set('affected', affected);
      feature.setStyle(this.getEventStyle(feature));
      updatedFeatures.push(feature);
    }
  }
};

EventHelper.prototype.deleteEvents = function deleteEvents(events) {
  var self = this;
  var promises = [];
  events.forEach(function (event) {
    promises.push(self.eventService.deleteEvent(event.event_id));
  });
  if (promises.length > 0) {
    this.q.all(promises).then(function () {
      self.updateEvents();
    });
  }
};

EventHelper.prototype.addEventsToView = function addEventsToView(events) {
  for (var i = 0; i < events.length; i++) {
    var event = events[i];
    var event_id = event.event_id;
    if (!this.eventMap[event_id]) {
      var feature = this.createEventFeature(event);
      this.eventLayer.getSource().addFeature(feature);
      this.eventMap[event_id] = { event: event, feature: feature };
    }
  }
};

EventHelper.prototype.removeEventsFromView = function removeEventsFromView(events) {
  for (var i = 0; i < events.length; i++) {
    var event = events[i];
    var event_id = event.event_id;
    if (this.eventMap[event_id]) {
      var feature = this.eventMap[event_id].feature;
      this.eventLayer.getSource().removeFeature(feature);
      delete this.eventMap[event_id];
    }
  }
};

EventHelper.prototype.getEventForFeature = function getEventForFeature(feature) {
  for (var key in this.eventMap) {
    if (this.eventMap[key].feature === feature) {
      return this.eventMap[key].event;
    }
  }
  return null;
};

EventHelper.prototype.createEventFeature = function createEventFeature(event) {
  // Setup current event position
  var coordinates = [event.s_longitude || 0, event.s_latitude || 0];
  var position = ol.proj.fromLonLat(coordinates, undefined);
  var feature = new ol.Feature({ type: "event", geometry: new ol.geom.Point(position), item: event, affected: false });
  //		console.log("created an event feature : " + event.event_id);
  return feature;
};

EventHelper.prototype.createEventDescriptionHTML = function createEventDescriptionHTML(event) {
  var eventTypes = this.eventTypes || [];
  var result = { content: '', title: undefined };
  result.title = "Event (" + event.event_id + ")";
  result.content = "<table><tbody>";

  // event type or description
  var description = event.event_type;
  for (var i = 0; i < eventTypes.length; i++) {
    var type = eventTypes[i];
    if (type.event_type === event.event_type) {
      description = type.description;
      break;
    }
  }
  if (description) {
    result.content += '<tr><th style="white-space: nowrap;text-align:right;"><span style="margin-right:10px;">TYPE:</span></th><td>' + _.escape(description) + '</td></tr>';
  }

  // location and heading
  var dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  var index = Math.floor(((event.heading / 360 + 1 / 32) % 1) * 16);
  var dir = dirs[index];
  result.content += '<tr><th style="white-space: nowrap;text-align:right;"><span style="margin-right:10px;">LOCATION:</span></th><td style="white-space: nowrap">' + Math.round(event.s_latitude * 10000000) / 10000000 + ',' + Math.round(event.s_longitude * 10000000) / 10000000 + '</td></tr>' +
    '<tr><th style="white-space: nowrap;text-align:right;"><span style="margin-right:10px;">HEADING:</span></th><td>' + Math.round(event.heading * 10000000) / 10000000 + ' [' + dir + ']' + '</td></tr>';
  result.content += '</tbody><table>';
  return result;
};
