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
  * Geofence healer
  */
var GeofenceHelper = function (map, layer, q, geofenceService) {
  // the map
  this.map = map;
  this.geofenceLayer = layer;
  this.geofenceService = geofenceService;
  this.q = q;
  this.styles = {};
  this.targetStyle = null;

  var self = this;
  layer.setStyle(function (feature, resolution) {
    self.styles["out"] = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: [255, 0, 128, 0.7],
        width: 2
      })
    });
    self.styles["in"] = new ol.style.Style({
      fill: new ol.style.Fill({
        color: [255, 0, 128, 0.1]
      }),
      stroke: new ol.style.Stroke({
        color: [255, 0, 128, 0.7],
        width: 2
      })
    });
    self.targetStyle = new ol.style.Style({
      fill: new ol.style.Fill({
        color: [100, 100, 100, 0.1]
      }),
      stroke: new ol.style.Stroke({
        color: [100, 100, 100, 0.3],
        width: 2
      })
    });

    return function (feature, resolution) {
      var style = self.getFeatureStyle(feature);
      feature.setStyle(style);
      return style;

    };
  }());

  this.loadingHandle = null;
  this.geofenceMap = {};

  this.map.getView().on('change:center', function () {
    self.viewChanged();
  });
  this.map.getView().on('change:resolution', function () {
    self.viewChanged();
  });
  this.updateGeofences();
};

GeofenceHelper.prototype.getFeatureStyle = function getFeatureStyle(feature) {
  if (feature.get("area")) {
    return null;
    //			return this.targetStyle;
  }
  var geofence = feature.get("item");
  if (!geofence) {
    return this.tentativeStyle;
  }
  return this.styles[geofence.direction || "out"];
};

GeofenceHelper.prototype.viewChanged = function viewChanged() {
  if (this.loadingHandle) {
    clearTimeout(this.loadingHandle);
    this.loadingHandle = null;
  }
  var self = this;
  this.loadingHandle = setTimeout(function () {
    self.updateGeofences();
  }, 1000);
};

GeofenceHelper.prototype.updateGeofences = function updateGeofences() {
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
  this.q.when(this.geofenceService.queryGeofences(this.searchArea), function (geofences) {
    var geofencesToAdd = [];
    var geofencesToRemoveMap = {};
    for (var key in self.geofenceMap) {
      geofencesToRemoveMap[key] = self.geofenceMap[key].geofence;
    }

    geofences.forEach(function (geofence) {
      var geofence_id = geofence.id;

      if (!self.geofenceMap[geofence_id]) {
        geofencesToAdd.push(geofence);
      }
      if (geofencesToRemoveMap[geofence_id])
        delete geofencesToRemoveMap[geofence_id];
    });
    if (geofencesToAdd.length > 0) {
      self.addGeofencesToView(geofencesToAdd);
    }

    var geofencesToRemove = [];
    for (var key in geofencesToRemoveMap) {
      geofencesToRemove.push(geofencesToRemoveMap[key]);
    }
    if (geofencesToRemove.length > 0) {
      self.removeGeofencesFromView(geofencesToRemove);
    }
  });
};

GeofenceHelper.prototype.addGeofencesToView = function addGeofencesToView(geofences) {
  for (var i = 0; i < geofences.length; i++) {
    var geofence = geofences[i];
    var geofence_id = geofence.id;
    if (!this.geofenceMap[geofence_id]) {
      var features = this.createGeofenceFeatures(geofence);
      this.geofenceLayer.getSource().addFeatures(features);
      this.geofenceMap[geofence_id] = { geofence: geofence, features: features };
    }
  }
};

GeofenceHelper.prototype.removeGeofencesFromView = function removeGeofencesFromView(geofences) {
  for (var i = 0; i < geofences.length; i++) {
    var geofence = geofences[i];
    var geofence_id = geofence.id;
    if (this.geofenceMap[geofence_id]) {
      var self = this;
      var features = this.geofenceMap[geofence_id].features;
      _.each(features, function (feature) {
        self.geofenceLayer.getSource().removeFeature(feature);
      });
      delete this.geofenceMap[geofence_id];
    }
  }
};

GeofenceHelper.prototype.createGeofenceFeatures = function createGeofenceFeatures(geofence) {
  var features = [];
  let target = null;
  if (geofence.target && geofence.target.area) {
    var polygonCoordinates = this.createGeofenceCoordinate(geofence.target.area);
    var polygon = new ol.geom.Polygon([polygonCoordinates]);
    var feature = new ol.Feature({ type: "geofence", geometry: polygon, item: geofence, area: geofence.target.area });
    features.push(feature);
    target = feature;
  }

  var geometry = geofence.geometry;
  if (geofence.geometry_type === "circle") {
    var center = ol.proj.transform([geometry.longitude, geometry.latitude], "EPSG:4326", "EPSG:3857");
    var circle = new ol.geom.Circle(center, geometry.radius);
    var feature = new ol.Feature({ geometry: circle, item: geofence });
    features.push(feature);
  } else {
    var polygonCoordinates = this.createGeofenceCoordinate(geometry);
    var polygon = new ol.geom.Polygon([polygonCoordinates]);
    var feature = new ol.Feature({ geometry: polygon, item: geofence });
    features.push(feature);
  }
  return features;
};

GeofenceHelper.prototype.createGeofenceCoordinate = function createGeofenceCoordinate(geometry) {
  var points = [];
  points.push(ol.proj.transform([geometry.max_longitude, geometry.max_latitude], "EPSG:4326", "EPSG:3857"));
  points.push(ol.proj.transform([geometry.max_longitude, geometry.min_latitude], "EPSG:4326", "EPSG:3857"));
  points.push(ol.proj.transform([geometry.min_longitude, geometry.min_latitude], "EPSG:4326", "EPSG:3857"));
  points.push(ol.proj.transform([geometry.min_longitude, geometry.max_latitude], "EPSG:4326", "EPSG:3857"));
  points.push(ol.proj.transform([geometry.max_longitude, geometry.max_latitude], "EPSG:4326", "EPSG:3857"));

  var polygonCoordinates = [];
  for (var i = 0; i < points.length; i++) {
    polygonCoordinates.push([points[i][0], points[i][1]]);
  }
  return polygonCoordinates;
};

GeofenceHelper.prototype.createGeofenceDescriptionHTML = function createGeofenceDescriptionHTML(geofence) {
  var result = { content: '', title: undefined };
  result.title = "Geofence (" + geofence.id + ")";
  result.content = "<table><tbody>";
  result.content += '<tr><th style="white-space: nowrap;text-align:right;"><span style="margin-right:10px;">DIRECTION:</span></th><td style="white-space: nowrap">' + geofence.direction + '</td></tr>';
  result.content += '</tbody><table>';
  return result;
};
