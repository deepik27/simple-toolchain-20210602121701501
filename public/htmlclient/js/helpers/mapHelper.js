/**
 * Copyright 2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
/*
  * Map helper
  */
var MapHelper = function (map) {
  // the map
  this.map = map;
  this.postChangeViewHandlers = [];
};

/**
 * Add popover to the map
 * @options
 *     options.elm: (required) the popover DOM element, which is a child of the map base element
 *     options.pin: true to enable "pin" capability on the popover. with it, the popover is pinned by
 *                  clicking on a target feature
 *     options.updateInterval: interval time in millisec for updating popover content
 * @showPopOver a function called on showing popover: function(elm, feature, pinned)
 * @destroyPopOver a function called on dismissing the popover: function(elm, feature, pinned)
 *   where @elm is the `elm` given as the first parameter to this method,
 *         @feature is ol.Feature, @pinned is boolean showing the "pin" state (true is pinned)
 * @pdatePopOver a function called on updating popover content: function(elm, feature, pinned)
 */
MapHelper.prototype.addPopOver = function addPopOver(options, showPopOver, destroyPopOver, updatePopOver) {
  // check and normalize arguments
  var elm = options.elm;
  if (!options.elm) {
    console.error('Missing popup target element. Skipped to setup popover.');
  }
  var nop = function () { };
  showPopOver = showPopOver || nop;
  destroyPopOver = destroyPopOver || nop;

  // control variables
  var currentPopoverFeature;
  var currentPinned;
  var startUpdateTimer, stopUpdateTimer; // implemented in section below

  // create popover objects
  var overlay = new ol.Overlay({
    element: elm,
    offset: [2, -3],
    positioning: 'center-right',
    stopEvent: true
  });
  this.map.addOverlay(overlay);

  //
  // Implement mouse hover popover
  //
  this.map.on('pointermove', (function (event) {
    // handle dragging
    if (event.dragging) {
      if (currentPinned)
        return; // don't follow pointer when pinned

      stopUpdateTimer();
      destroyPopOver(elm, currentPopoverFeature);
      currentPopoverFeature = null;
      return;
    }

    var feature = this.map.forEachFeatureAtPixel(event.pixel, function (feature, layer) {
      return feature;
    });
    this.map.getTargetElement().style.cursor = (feature ? 'pointer' : ''); // cursor

    // guard by pin state
    if (currentPinned)
      return; // don't follow pointer when pinned

    if (feature)
      overlay.setPosition(event.coordinate);

    if (currentPopoverFeature !== feature) {
      stopUpdateTimer();
      destroyPopOver(elm, currentPopoverFeature);
      currentPopoverFeature = feature;
      showPopOver(elm, currentPopoverFeature);
      startUpdateTimer();
    }

  }).bind(this));

  //
  // Implement "pin" capability on the popover
  //
  if (options.pin) {
    var trackGeometryListener = function () {
      var coord = currentPopoverFeature.getGeometry().getCoordinates();
      overlay.setPosition(coord);
    };
    var closePinnedPopover = (function closeFunc() {
      stopUpdateTimer();
      destroyPopOver(elm, currentPopoverFeature, currentPinned);
      if (currentPopoverFeature)
        currentPopoverFeature.un('change:geometry', trackGeometryListener);
      currentPinned = false;
    }).bind(this);
    var showPinnedPopover = (function showFunc() {
      currentPinned = true;
      showPopOver(elm, currentPopoverFeature, currentPinned, closePinnedPopover);
      startUpdateTimer();
      if (currentPopoverFeature)
        currentPopoverFeature.on('change:geometry', trackGeometryListener);
    }).bind(this);

    this.map.on('singleclick', (function (event) {
      var feature = this.map.forEachFeatureAtPixel(event.pixel, function (feature, layer) {
        return feature;
      });
      if (!feature) return; // pin feature only works on clicking on a feature

      if (!currentPinned && feature === currentPopoverFeature) {
        // Pin currently shown popover
        closePinnedPopover();
        showPinnedPopover();
      } else if (!currentPinned && feature !== currentPopoverFeature) {
        // Show pinned popover
        var coord = feature.getGeometry().getCoordinates();
        overlay.setPosition(coord);
        // show popover
        currentPopoverFeature = feature;
        showPinnedPopover();
      } else if (currentPinned && currentPopoverFeature !== feature) {
        // Change pinned target feature
        closePinnedPopover();
        currentPopoverFeature = feature;
        // move
        var coord = feature.getGeometry().getCoordinates();
        overlay.setPosition(coord);
        // show
        showPinnedPopover();
      } else if (currentPinned && feature === currentPopoverFeature) {
        // Remove pin
        closePinnedPopover();
        //currentPopoverFeature = null;
        //showPopOver(elm, currentPopoverFeature, pinned); // to clear
      }
    }).bind(this));
  }

  //
  // Implement periodical content update option
  //
  if (options.updateInterval && updatePopOver) {
    var timer = 0;
    startUpdateTimer = function () {
      stopUpdateTimer();
      timer = setTimeout(callUpdate, options.updateInterval);
    };
    stopUpdateTimer = function () {
      if (timer) {
        clearTimeout(timer);
        timer = 0;
      }
    };
    var callUpdate = function () {
      updatePopOver(elm, currentPopoverFeature, currentPinned);
      timer = setTimeout(callUpdate, options.updateInterval);
    };
  } else {
    startUpdateTimer = function () { }; // nop
    stopUpdateTimer = function () { }; // nop
  }

};

MapHelper.prototype.moveMap = function moveMap(region) {
  if(region.extent){
    var mapExt = ol.proj.transformExtent(region.extent, 'EPSG:4326', 'EPSG:3857'); // back to coordinate
    var view = this.map.getView();
    if (view.fit){
      view.fit(mapExt, this.map.getSize());
    } else if (view.fitExtent){
      view.setCenter([(mapExt[0]+mapExt[2])/2, (mapExt[1]+mapExt[3])/2]);
      view.fitExtent(mapExt, this.map.getSize());
    } else {
      view.setCenter([(mapExt[0]+mapExt[2])/2, (mapExt[1]+mapExt[3])/2]);
      view.setZoom(15);
    }
    this._firePendingPostChangeViewEvents(10);
  }else if(region.center){
    var mapCenter = ol.proj.fromLonLat(region.center, undefined);
    var view = this.map.getView();
    view.setCenter(mapCenter);
    view.setZoom(region.zoom || DEFAULT_ZOOM);
    this._firePendingPostChangeViewEvents(10);
  }else{
    console.error('  Failed to start tracking an unknown region: ', region);
  }
};

// schedule deferrable postChangeView event
MapHelper.prototype._onMapViewChange = function _onMapViewChange() {
  // schedule deferrable event
  if(this._postChangeViewTimer){
    clearTimeout(this._postChangeViewTimer);
  }
  this._postChangeViewTimer = setTimeout(function(){
    this._firePendingPostChangeViewEvents(); // fire now
  }.bind(this), this.moveRefreshDelay);
};

// schedule indeferrable postChangeView event
MapHelper.prototype._firePendingPostChangeViewEvents = function _firePendingPostChangeViewEvents(delay) {
  // cancel schedule as firing event shortly!
  if(this._postChangeViewTimer){
    clearTimeout(this._postChangeViewTimer);
    this._postChangeViewTimer = null;
  }
  if(delay){
    if(delay < this.moveRefreshDelay){
      // schedule non-deferrable event
      setTimeout(function(){ // this is non-deferrable
        this._firePendingPostChangeViewEvents(); // fire now
      }.bind(this), delay);
    }else{
      this._onMapViewChange(); // delegate to normal one
    }
  }else{
    // finally fire event!
    var size = this.map.getSize();
    if(!size){
      console.warn('failed to get size from map. skipping post change view event.');
      return;
    }
    // wait for map's handling layous, and then send extent event
    setTimeout((function(){
      var ext = this.map.getView().calculateExtent(size);
      var extent = this.normalizeExtent(ol.proj.transformExtent(ext, 'EPSG:3857', 'EPSG:4326'));
      if(this._postChangeViewLastExtent != extent){
        console.log('Invoking map extent change event', extent);
        this.postChangeViewHandlers.forEach(function(handler){
          handler(extent);
        });
        this._postChangeViewLastExtent = extent;
      }
    }).bind(this),100);
  }
};

MapHelper.prototype.normalizeExtent = function normalizeExtent(extent) {
  let loc1 = this.normalizeLocation([extent[0], extent[1]]);
  let loc2 = this.normalizeLocation([extent[2], extent[3]]);
  extent[0] = loc1[0];
  extent[1] = loc1[1];
  extent[2] = loc2[0];
  extent[3] = loc2[1];
  return extent;
};

MapHelper.prototype.normalizeLocation = function normalizeLocation(loc) {
  let lng = loc[0] % 360;
  if (lng < -180) lng += 360;
  else if (lng > 180) lng -= 360;

  let lat = loc[1] % 180;
  if (lat < -90) lat += 180;
  else if (lat > 90) lat -= 180;

  loc[0] = lng;
  loc[1] = lat;
  return loc;
};
