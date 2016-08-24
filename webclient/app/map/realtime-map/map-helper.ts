import * as ol from 'openlayers';

/**
 * The default zoom value when the map `region` is set by `center`
 */
var DEFAULT_ZOOM = 15;

// internal settings
var INV_MAX_FPS = 1000 / 10;
var ANIMATION_DELAY = 2000;
var DEFAULT_MOVE_REFRESH_DELAY = 500;
var CAR_STATUS_REFRESH_PERIOD = 0 // was 15000; now, setting 0 not to update via polling (but by WebSock)
var NEXT_MAP_ELEMENT_ID = 1;

/* --------------------------------------------------------------
 * MapHelper
 *
 * This class provides additional capabilities to OpenLayer 3 Map
 * for animation, visible extent tracking, and popover.
 *
 * Usage:
 * 1. initialize with map instance
 *   var mapHelper = new MapHelper(map);
 * 2. adjust time by setting server-time as soon as received it from server
 *   mapHelper.setTimeFromServerRightNow(serverTime);
 * 3. add callbacks
 * 3.1 add animation stuffs
 *   mapHelper.preComposeHandlers.push(function(event, frameTime){ ... });
 *   mapHelper.postComposeHandlers.push(function(event, frameTime){ ... return 100; });
 * 3.2 add move listeners
 *   mapHelper.postChangeViewHandlers.push(function(extent){ ... });
 * 3.3 add popover stuffs
 *   mapHelper.addPopOver(popoverElement,
 *                        function(elm, feature){ show popover with elm },
 *                        function(elm, feature){ dismiss the popover with elm });
 * 4. move map
 *   mapHelper.moveMap({center: [lng, lat]})
 * 5. start animation
 *   mapHelper.startAnimation();
 *
 * Event Handlers:
 * preComposeHandlers: a list of function(ol.render.Event, frameTime)
 * - where frameTime in millis is the server time for this frame
 *   - the server time is calculated considering this.adjustTime and event.frameState.time
 * postComposeHandlers: a list of function(ol.render.Event, frameTime)
 * - where the parameters are the same to preComposeHandlers, but the function can return value
 *   for next render timing.
 *   - integer >= 0: next render time. 0 to call map.render() immediately, a number
 *     to schedule next call of map.render()
 *   - otherwise, don't schedule anything
 * postChangeViewHandlers: a list of function(extent)
 * - where the extent is map extent in WSG [lng0, lat0, lng1, lat1]
 */
export class MapHelper {
  // initialize animation
  animating = false;
  animationDelay = ANIMATION_DELAY;
  serverTimeDelay = 0;
  preComposeHandlers = [];
  postComposeHandlers = [];
  _onPreComposeFunc: any;
  _onPostComposeFunc: any;
  nextRenderFrameTime = 0;
  // move event handlers
  moveRefreshDelay = DEFAULT_MOVE_REFRESH_DELAY;
  postChangeViewHandlers = [];
  _postChangeViewLastExtent: any;
  _postChangeViewTimer: any;

  constructor(public map:ol.Map) {
    // animation event handler
    this._onPreComposeFunc = this._onPreCompose.bind(this);
    this._onPostComposeFunc = this._onPostCompose.bind(this);
    // move event handlers
    this.map.getView().on('change:center', this._onMapViewChange.bind(this));
    this.map.getView().on('change:resolution', this._onMapViewChange.bind(this));
    // setup map resize handler
    this.installMapSizeWorkaround();
  }

  startAnimation(){
    if(this.animating)
      this.stopAnimation(false);

    console.log('Starting animation.')
    this.animating = true;
    this.map.on('precompose', this._onPreComposeFunc);
    this.map.on('postcompose', this._onPostComposeFunc);
    this.map.render();
  }
  /**
   * Stop animation
   */
  stopAnimation(doStop?: boolean){
    this.animating = false;
    this.nextRenderFrameTime = 0;
    this.map.un(['precompose'], this._onPreComposeFunc);
    this.map.un(['postcompose'], this._onPostComposeFunc);
  }
  /**
   * Set the server time
   * @param serverTime the latest server time received from server
   * @param now optional. the base time
   * Note that we want to get estimated server time as follow:
   *   estimated server time ~== Date.now() - this.serverTimeDelay
   */
	setTimeFromServerRightNow(serverTime, now?){
    this.serverTimeDelay = (now || Date.now()) - serverTime;
    console.log('Set server time delay to %d.', this.serverTimeDelay);
  }
  // get the estimated server time
  getServerTime(now){
    return (now || Date.now()) - this.serverTimeDelay;
  }
  // handle precompose event and delegate it to handlers
	private _onPreCompose(event){
    if (this.animating){
      //var vectorContext = event.vectorContext;
      var frameState = event.frameState;
      var frameTime = this.getServerTime(frameState.time) - this.animationDelay;
      if(this.nextRenderFrameTime < frameTime){
        this.preComposeHandlers.forEach(function(handler){ handler(event, frameTime); });
        this.nextRenderFrameTime = 0; // unschedule next
        //console.log('Updated fatures.');
      }
    }
  }
  // handle postcompose event and delegate it to handlers, schedule next render
  private _onPostCompose(event){
    if (this.animating){
      //var vectorContext = event.vectorContext;
      var frameState = event.frameState;
      var frameTime = this.getServerTime(frameState.time) - this.animationDelay;
      var nextRender = -1;
      this.postComposeHandlers.forEach(function(handler){
        var nextRenderDuration = handler(event, frameTime);
        nextRenderDuration = parseInt(nextRenderDuration);
        if(nextRenderDuration >= 0 && nextRender < nextRenderDuration)
          nextRender = nextRenderDuration;
      });
      // set next render time when not scheduled
      if(!this.nextRenderFrameTime){
        this.nextRenderFrameTime = frameTime + (nextRender > 0 ? nextRender : 0);
        if(nextRender <= 10){
          if(this.animating)
            this.map.render();
        }else{
          setTimeout((function(){
            if(this.animating)
              this.map.render();
          }).bind(this), nextRender);
        }
      }
    }
  }

  /**
   * Move visible extent to the specified region
   * @param region
   *   case 1: { extent: [lng0, lat0, lng1, lat1] }
   *   case 2: { center: [lng0, lat0], (zoom: 15) } // zoom is optional
   */
  moveMap(region){
    if(region.extent){
      var mapExt = ol.proj.transformExtent(region.extent, 'EPSG:4326', 'EPSG:3857'); // back to coordinate
      var view = this.map.getView();
      if (view.fit){
        view.fit(mapExt, this.map.getSize());
      } else if ((<any>view).fitExtent){
        view.setCenter([(mapExt[0]+mapExt[2])/2, (mapExt[1]+mapExt[3])/2]);
        (<any>view).fitExtent(mapExt, this.map.getSize());
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
  }
  // schedule deferrable postChangeView event
 private _onMapViewChange(){
    // schedule deferrable event
    if(this._postChangeViewTimer){
      clearTimeout(this._postChangeViewTimer);
    }
    this._postChangeViewTimer = setTimeout(function(){
      this._firePendingPostChangeViewEvents(); // fire now
    }.bind(this), this.moveRefreshDelay);
  };
  // schedule indeferrable postChangeView event
  private _firePendingPostChangeViewEvents(delay){
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
        var extent = ol.proj.transformExtent(ext, 'EPSG:3857', 'EPSG:4326');
        if(this._postChangeViewLastExtent != extent){
          console.log('Invoking map extent change event', extent);
          this.postChangeViewHandlers.forEach(function(handler){
            handler(extent);
          });
          this._postChangeViewLastExtent = extent;
        }
      }).bind(this),100);
    }
  }

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
  addPopOver(options, showPopOver, destroyPopOver, updatePopOver){
    // check and normalize arguments
    var elm = options.elm;
    if(!options.elm){
      console.error('Missing popup target element. Skipped to setup popover.');
    }
    var nop = function(){};
    showPopOver = showPopOver || nop;
    destroyPopOver = destroyPopOver || nop;

    // control variables
    var currentPopoverFeature;
    var currentPinned;
    var startUpdateTimer, stopUpdateTimer; // implemented in section below

    // create popover objects
    var overlay = new ol.Overlay({
      element: elm,
      offset: [2,-3],
      positioning: 'center-right',
      stopEvent: true
    });
    this.map.addOverlay(overlay);

    //
    // Implement mouse hover popover
    //
    this.map.on('pointermove', (function(event){
      // handle dragging
      if(event.dragging){
        if(currentPinned)
          return; // don't follow pointer when pinned

        stopUpdateTimer();
        destroyPopOver(elm, currentPopoverFeature);
        currentPopoverFeature = null;
        return;
      }

      var feature = this.map.forEachFeatureAtPixel(event.pixel, function(feature, layer){
        return feature;
      });
      this.map.getTargetElement().style.cursor = (feature ? 'pointer' : ''); // cursor

      // guard by pin state
      if(currentPinned)
        return; // don't follow pointer when pinned

      if(feature)
        overlay.setPosition(event.coordinate);

      if(currentPopoverFeature !== feature){
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
    if(options.pin){
      var trackGeometryListener = function(){
        var coord = currentPopoverFeature.getGeometry().getCoordinates();
        overlay.setPosition(coord);
      };
      var closePinnedPopover = (function closeFunc(){
        stopUpdateTimer();
        destroyPopOver(elm, currentPopoverFeature, currentPinned);
        if(currentPopoverFeature)
          currentPopoverFeature.un('change:geometry', trackGeometryListener);
        currentPinned = false;
      }).bind(this);
      var showPinnedPopover = (function showFunc(){
        currentPinned = true;
        showPopOver(elm, currentPopoverFeature, currentPinned, closePinnedPopover);
        startUpdateTimer();
        if(currentPopoverFeature)
          currentPopoverFeature.on('change:geometry', trackGeometryListener);
      }).bind(this);

      this.map.on('singleclick', (function(event){
        var feature = this.map.forEachFeatureAtPixel(event.pixel, function(feature, layer){
          return feature;
        });
        if(!feature) return; // pin feature only works on clicking on a feature

        if(!currentPinned && feature === currentPopoverFeature){
          // Pin currently shown popover
          closePinnedPopover();
          showPinnedPopover();
        }else if(!currentPinned && feature !== currentPopoverFeature){
          // Show pinned popover
          var coord = feature.getGeometry().getCoordinates();
          overlay.setPosition(coord);
          // show popover
          currentPopoverFeature = feature;
          showPinnedPopover();
        }else if(currentPinned && currentPopoverFeature !== feature){
          // Change pinned target feature
          closePinnedPopover();
          currentPopoverFeature = feature;
          // move
          var coord = feature.getGeometry().getCoordinates();
          overlay.setPosition(coord);
          // show
          showPinnedPopover();
        }else if(currentPinned && feature === currentPopoverFeature){
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
    if(options.updateInterval && updatePopOver){
      var timer = 0;
      startUpdateTimer = function(){
        stopUpdateTimer();
        timer = setTimeout(callUpdate, options.updateInterval);
      };
      stopUpdateTimer = function(){
        if(timer){
          clearTimeout(timer);
          timer = 0;
        }
      };
      var callUpdate = function(){
        updatePopOver(elm, currentPopoverFeature, currentPinned);
        timer = setTimeout(callUpdate, options.updateInterval);
      };
    }else {
      startUpdateTimer = function(){}; // nop
      stopUpdateTimer = function(){}; // nop
    }

  }

  /**
   * Install workaorund for map size issue.
   * Sometimes, OpenLayer's map canvas size and the underlying DIV element's size
   * wont be synced. It causes inconsistency in conversion from screen pixcel to
   * map coordinates and it hits mouse cursor-involved features such as popover.
   *
   * So, this function does the followings:
   * - force update map size after resizing browser, and
   * - force update map size after tow seconds this function is called.
   *   - this is required on initial loading in Firefox as its div resizing timing
   *     seems different from others
   *
   * Ideally, we should directly track the size of the DIV, but not here yet
   */
  private _scheduleUpdateSize = null;
  installMapSizeWorkaround(){
    // - capture resize event
    if(!this._scheduleUpdateSize){
      var this_ = this;
      var scheduleUpdateSizeTimer = 0; // always refers to this scope form the function
      this._scheduleUpdateSize = function(timeout) {
        return function(){
          if(scheduleUpdateSizeTimer){
            clearTimeout(scheduleUpdateSizeTimer);
          }
          scheduleUpdateSizeTimer = setTimeout(function(){
            this_.map.updateSize();
            scheduleUpdateSizeTimer = 0;
          }, timeout);
        };
      };
      if(window.addEventListener){
        window.addEventListener('resize', this._scheduleUpdateSize(200));
        window.addEventListener('orientationchange', this._scheduleUpdateSize(1000));
      }
    }
    this._scheduleUpdateSize(1000)(); // WORKAROUND: map's canvas and div sizees don't sync in Firefox
  }

  /***************************************************************
   * Utility Functions
   */

  /**
   * Expand the given extent by the ratio.
   * - With ration 0.5, expand each side of the region by half width/height of the region
   *   Thus, the result's width and height are twice as the given extent
   */
  expandExtent(extent, ratio){
    // draw real-time location of cars
    var min_lng0 = extent[0];
    var min_lat0 = extent[1];
    var max_lng0 = extent[2];
    var max_lat0 = extent[3];
    var min_lng = min_lng0 - (max_lng0 - min_lng0) * ratio;
    var min_lat = min_lat0 - (max_lat0 - min_lat0) * ratio;
    var max_lng = max_lng0 + (max_lng0 - min_lng0) * ratio;
    var max_lat = max_lat0 + (max_lat0 - min_lat0) * ratio;
    return [min_lng, min_lat, max_lng, max_lat];
  }

  /**
   * Pre-load images for animation
   * - When we do post-compose animation and trying to show styles with images, thay wont
   *   be shown as the image might not be loaded during the animation. This is to work it
   *   around.
   * @map a map
   * @styles a list of ol.style.Style -- non-image styles will be gracefully ignored
   */
  preloadStyles(map, styles){
    if(!styles || styles.length == 0) return;
    var center = new ol.geom.Point(map.getView().getCenter());
    var features = styles.map(function(style){
      if(style.image instanceof ol.style.Image){
        var feat = new ol.Feature({ geometry: center });
        feat.setStyle(style);
        return feat;
      }
    }).filter(function(feat){ return !!feat; });
    // create a layer
    var workaroundLayer = map._imageWorkaroundLayer;
    if(!workaroundLayer){
      workaroundLayer = new ol.layer.Vector({ source: new ol.source.Vector({})});
      map._imageWorkaroundLayer = workaroundLayer;
      map.addLayer(workaroundLayer);
      workaroundLayer.setOpacity(0.5); //TODO workaround layer opacity
    }
    workaroundLayer.getSource().addFeatures(features);
    // try to render the images
    workaroundLayer.setVisible(true);
    setTimeout(function(){
      workaroundLayer.setVisible(false);
    }, 100);
  }
}
