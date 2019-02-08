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
  * Map helper
  */
var MapHelper = function (map) {
  // the map
  this.map = map;
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
