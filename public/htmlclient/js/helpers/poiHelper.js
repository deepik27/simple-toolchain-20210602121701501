/**
 * Copyright 2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */

/*
  * POI healer
  */
var POIHelper = function (map, layer, q, poiService, queryProperties) {
  // the map
  this.map = map;
  this.poiLayer = layer;
  this.poiService = poiService;
  this.q = q;
  this.queryProperties = queryProperties;
  this.selectedPOI = null;

  var self = this;
  this.loadingHandle = null;
  layer.setStyle(function (feature, resolution) {

    self.poiStyle = new ol.style.Style({image: new ol.style.Icon({
        anchor: [79,158],
        anchorXUnits: 'pixels',
        anchorYUnits: 'pixels',
        opacity: 1,
        scale: 0.1,
        src: '/images/MarkerBlue.png',
      })});

      self.selectedPoiStyle = new ol.style.Style({image: new ol.style.Icon({
        anchor: [79,158],
        anchorXUnits: 'pixels',
        anchorYUnits: 'pixels',
        opacity: 1,
        scale: 0.12,
        src: '/images/MarkerRed.png',
      })});

    return function (feature, resolution) {
      var style = self.getPOIStyle(feature);
      feature.setStyle(style);
      return self.poiStyle;
    };
  }());

  
  this.poiListChangedListeners = [];
  this.poiMap = {};

  this.map.getView().on('change:center', function () {
    self.viewChanged();
  });
  this.map.getView().on('change:resolution', function () {
    self.viewChanged();
  });
  this.updatePOIs();
};

POIHelper.prototype.updateSelection = function updateSelection(poi) {
  if (this.selectedPOI) {
    this.poiMap[this.selectedPOI.id].feature.setStyle(this.poiStyle);
  }
  this.selectedPOI = poi;
  if (this.selectedPOI) {
    this.poiMap[this.selectedPOI.id].feature.setStyle(this.selectedPoiStyle);
  }
}

POIHelper.prototype.getPOIStyle = function getPOIStyle(feature) {
  var poi = feature.get("item");
  if (!poi) {
    return;
  }
  if (this.selectedPOI && this.selectedPOI.id === poi.id)
    return this.selectedPoiStyle;
  else
    return this.poiStyle;
};

POIHelper.prototype.viewChanged = function viewChanged() {
  if (this.loadingHandle) {
    clearTimeout(this.loadingHandle);
    this.loadingHandle = null;
  }
  var self = this;
  this.loadingHandle = setTimeout(function () {
    self.updatePOIs();
  }, 1000);
};

POIHelper.prototype.addPOIChangedListener = function addPOIChangedListener(listener) {
  var index = this.poiListChangedListeners.indexOf(listener);
  if (index < 0) {
    this.poiListChangedListeners.push(listener);
  }
};

POIHelper.prototype.removePOIChangedListener = function removePOIChangedListener(listener) {
  var index = this.poiListChangedListeners.indexOf(listener);
  if (index >= 0) {
    this.poiListChangedListeners.splice(index, 1);
  }
};

POIHelper.prototype.setQueryProperties = function setQueryProperties(props) {
  this.queryProperties = props;
};

POIHelper.prototype.updatePOIs = function updatePOIs(force) {
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

  let center_latitude = (this.searchArea.max_latitude + this.searchArea.min_latitude) / 2;
  let center_longitude = (this.searchArea.max_longitude + this.searchArea.min_longitude) / 2;
  let radius = Math.ceil(this._calcDistance([center_longitude, center_latitude], [this.searchArea.max_longitude, this.searchArea.max_latitude]) / 1000);
  radius += 10; // search larger area

  let params = {
    latitude: center_latitude,
    longitude: center_longitude,
    radius: radius,
    properties: this.queryProperties
  }

  this.q.when(this.poiService.queryPOIs(params), function (pois) {
    var poisToAdd = [];
    var poisToRemoveMap = {};
    for (var key in self.poiMap) {
      poisToRemoveMap[key] = self.poiMap[key].poi;
    }

    pois.forEach(function (poi) {
      var id = poi.id;

      if (!self.poiMap[id]) {
        poisToAdd.push(poi);
      }
      if (poisToRemoveMap[id])
        delete poisToRemoveMap[id];
    });
    if (poisToAdd.length > 0) {
      self.addPOIsToView(poisToAdd);
    }

    var poisToRemove = [];
    for (var key in poisToRemoveMap) {
      poisToRemove.push(poisToRemoveMap[key]);
    }
    if (poisToRemove.length > 0) {
      self.removePOIsFromView(poisToRemove);
    }

    if (poisToAdd.length > 0 || poisToRemove.length > 0) {
      self.poiListChangedListeners.forEach(function (listener) {
        listener(pois);
      });
    }
  });
};

/*
* Calculate a distance between point1[longitude, latitude] and point2[longitude, latitude]
*/
POIHelper.prototype._calcDistance = function _calcDistance(point1, point2) {
  let R = 6378e3;
  let lon1 = this._toRadians(point1[0]);
  let lat1 = this._toRadians(point1[1]);
  let lon2 = this._toRadians(point2[0]);
  let lat2 = this._toRadians(point2[1]);
  let delta_x = lon2 - lon1;
  let delta_y = lat2 - lat1;
  let a = Math.sin(delta_y / 2) * Math.sin(delta_y / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(delta_x / 2) * Math.sin(delta_x / 2);
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  let distance = R * c;
  return distance;
};

POIHelper.prototype._toRadians = function _toRadians(n) {
  return n * (Math.PI / 180);
};

POIHelper.prototype.createPOI = function createPOI(lat, lon, name, mo_id, serialnumber) {
  var self = this;
  var date = new Date();
  var currentTime = date.toISOString();
  //		var endTime = new Date(date.getTime() + 60*1000).toISOString(); 
  var params = {
    latitude: lat,
    longitude: lon,
    properties: {
      name: name,
      mo_id: mo_id,
      serialnumber: serialnumber
    }
  };
  this.q.when(this.poiService.createPOI(params), function (id) {
    self.q.when(self.poiService.getPOI(id), function (poi) {
      if (poi) {
        self.addPOIsToView([poi]);
      } else {
        self.viewChanged();
      }
    });
  });
};

POIHelper.prototype.deletePOIs = function deletePOIs(pois) {
  var self = this;
  var promises = [];
  pois.forEach(function (poi) {
    promises.push(self.poiService.deletePOI(poi.id));
  });
  if (promises.length > 0) {
    this.q.all(promises).then(function () {
      self.updatePOIs();
    });
  }
};

POIHelper.prototype.addPOIsToView = function addPOIsToView(pois) {
  for (var i = 0; i < pois.length; i++) {
    var poi = pois[i];
    var id = poi.id;
    if (!this.poiMap[id]) {
      var feature = this.createPOIFeature(poi);
      this.poiLayer.getSource().addFeature(feature);
      this.poiMap[id] = { poi: poi, feature: feature };
    }
  }
};

POIHelper.prototype.removePOIsFromView = function removePOIsFromView(pois) {
  for (var i = 0; i < pois.length; i++) {
    var poi = pois[i];
    var id = pois.id;
    if (this.poiMap[id]) {
      var feature = this.poiMap[id].feature;
      this.poiLayer.getSource().removeFeature(feature);
      delete this.poiMap[id];
    }
  }
};

POIHelper.prototype.getPOIForFeature = function getPOIForFeature(feature) {
  for (var key in this.poiMap) {
    if (this.poiMap[key].feature === feature) {
      return this.poiMap[key].poi;
    }
  }
  return null;
};

POIHelper.prototype.createPOIFeature = function createPOIFeature(poi) {
  // Setup current poi position
  var coordinates = [poi.longitude || 0, poi.latitude || 0];
  var position = ol.proj.fromLonLat(coordinates, undefined);
  var feature = new ol.Feature({ type: "poi", geometry: new ol.geom.Point(position), item: poi });
  //		console.log("created an poi feature : " + poi.poi);
  return feature;
};

POIHelper.prototype.createPOIDescriptionHTML = function createPOIDescriptionHTML(poi) {
  var result = { content: '', title: undefined };
  result.title = "POI (" + poi.id + ")";
  result.content = "<table><tbody>";

  var name = poi.properties && poi.properties.name;
  if (name) {
    result.content += '<tr><th style="white-space: nowrap;text-align:right;"><span style="margin-right:10px;">NAME:</span></th><td>' + _.escape(name) + '</td></tr>';
  }
  var vehicle = poi.properties && (poi.properties.serialnumber||poi.properties.mo_id);
  if (vehicle) {
    result.content += '<tr><th style="white-space: nowrap;text-align:right;"><span style="margin-right:10px;">VEHICLE:</span></th><td>' + _.escape(vehicle) + '</td></tr>';
  }
  result.content += '<tr><th style="white-space: nowrap;text-align:right;"><span style="margin-right:10px;">LOCATION:</span></th><td style="white-space: nowrap">' + Math.round(poi.latitude * 10000000) / 10000000 + ',' + Math.round(poi.longitude * 10000000) / 10000000 + '</td></tr>';
  result.content += '</tbody><table>';
  return result;
};
