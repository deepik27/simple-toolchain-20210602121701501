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
import * as ol from 'openlayers';
import { Observable } from 'rxjs/Observable';

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

var NEXT_MODEL_KEY_ID = 1;

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
  private _workaroundAnimationMonitorTimer: any;
  private _workaroundAnimationMonitorTimerLastRendered: number;
  // move event handlers
  moveRefreshDelay = DEFAULT_MOVE_REFRESH_DELAY;
  postChangeViewHandlers = [];
  _postChangeViewLastExtent: any;
  _postChangeViewTimer: any;
  // show popover
  showPinnedPopover: ((feature: any)=> any);

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
    // workaround for stopping animation unexpectedly
    if(!this._workaroundAnimationMonitorTimer){
      // - intialize values
      this._workaroundAnimationMonitorTimerLastRendered = Date.now();
      // - in case the rendering is not happen for more than INV_MAX_FPS*5, call render() to restart
      this._workaroundAnimationMonitorTimer = setInterval(() => {
        if(Date.now() - this._workaroundAnimationMonitorTimerLastRendered > Math.min(INV_MAX_FPS * 5, 500)){
          console.log('WORKAROUND: Map animation looks to be stopped. Restarting...');
          this.map.render();
        }
        this._workaroundAnimationMonitorTimerLastRendered = Date.now();
      }, INV_MAX_FPS * 2.5);
    }
  }
  /**
   * Stop animation
   */
  stopAnimation(doStop?: boolean){
    this.animating = false;
    this.nextRenderFrameTime = 0;
    // workaround for stopping animation unexpectedly
    if(this._workaroundAnimationMonitorTimer){
      let timer = this._workaroundAnimationMonitorTimer;
      this._workaroundAnimationMonitorTimer = null;
      clearInterval(timer);
    }
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
    try{
      if (this.animating){
        //var vectorContext = event.vectorContext;
        var frameState = event.frameState;
        var frameTime = this.getServerTime(frameState.time) - this.animationDelay;
        if(this.nextRenderFrameTime < frameTime){
          this.preComposeHandlers.forEach(function(handler){
            try{
              handler(event, frameTime);
            }catch(e){
              console.error(e);
            }
          });
          this.nextRenderFrameTime = 0; // unschedule next
          //console.log('Updated fatures.');
        }
      }
    }catch(e){
      console.error(e);
    }
  }
  // handle postcompose event and delegate it to handlers, schedule next render
  private _onPostCompose(event){
    try{
      if (this.animating){
        //var vectorContext = event.vectorContext;
        var frameState = event.frameState;
        var frameTime = this.getServerTime(frameState.time) - this.animationDelay;
        var nextRender = -1;
        this.postComposeHandlers.forEach(function(handler){
          try{
            var nextRenderDuration = handler(event, frameTime);
            nextRenderDuration = parseInt(nextRenderDuration);
            if(nextRenderDuration >= 0 && nextRender < nextRenderDuration)
              nextRender = nextRenderDuration;
          }catch(e){
            console.error(e);
          }
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
        // workaround for stopping animation unexpectedly
        this._workaroundAnimationMonitorTimerLastRendered = Date.now();
      }
    }catch(e){
      console.error(e);
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
   * @updatePopOver a function called on updating popover content: function(elm, feature, pinned)
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
        clickOnFeatureFunc(feature);
      }).bind(this));

      var clickOnFeatureFunc = (function(feature, neverClose){
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
        }else if(currentPinned && feature === currentPopoverFeature && !neverClose){
          // Remove pin
          closePinnedPopover();
          //currentPopoverFeature = null;
          //showPopOver(elm, currentPopoverFeature, pinned); // to clear
        }
      }).bind(this);

      this.showPinnedPopover = (feature) => {
        clickOnFeatureFunc(feature, true);
      };

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
   * Add model list-based popover to the map
   * - Comparing to the normal popover, the info popover can
   *   - Open multiple opovers concurrently
   *
   * @options
   *    optoins.createOverlay: A parent element instance of all the popover DIV element
   *    options.getKey: take a key and returns the identity function(model), otherwise the instance identity
   *                    is used as the identity.
   *    options.getFeature: get ol.Feature for the model object function(model)
   * @showPopOver: show popover function(element, feature, pin=false, model, closeFunc)
   * @destroyPopOver:
   * @updatePopOver:
   */
  addModelBasedPopover(dataSource: Observable<any>, options: {
    createOverlay: (model: any, map) => ol.Overlay,
    getKey?: (model: any) => string,
    getLastUpdated?: (model: any) => number,
    getFeature: (model: any, map: ol.Map) => ol.Feature,
    showPopover: (elm: Element, feature: ol.Feature, pinned: boolean, model:any, closeFunc: ()=>void) => void,
    destroyPopover: (elm: Element, feature: ol.Feature, pinned: boolean, model:any, closeFunc: ()=>void) => (void|boolean),
    updatePopover?: (elm: Element, feature: ol.Feature, pinned: boolean, model:any, closeFunc: ()=>void) => void,
  }){
    let getKey = options.getKey || ((model) => { return (<any>model).__model_key__ || ((<any>model).__model_key__ = NEXT_MODEL_KEY_ID++) });
    let getLastUpdated = options.getLastUpdated || ((model) => { return (<any>model).__model_key__ || ((<any>model).__model_key__ = NEXT_MODEL_KEY_ID++) });

    const context = {
      activeControllers: <{ [key: string]: ModelBasedPopoverCtrl }>{},
      subscription: undefined,
    };
    var activeControllers = context.activeControllers;
    
    var syncModelAndController = (models) => {
      var syncedKeys = {};

      models.forEach(model => {
        let feature = options.getFeature(model, this.map);
        let key = getKey(model);
        syncedKeys[key] = true; // mark the key synced
        
        let ctrl = activeControllers[key];
        if(ctrl){
          if(ctrl.isUpdated(model)){
            if(ctrl.isDisposed()) {
              ctrl = null; // give chance to create a new controller
            } else {
              ctrl.model = model; // update the model instance
            }
          } else {
            if(ctrl.isDisposed()){
              return; // ctrl can be disposed due to timeout or so. The controller Will be removed from the list when the model is gone
            }
            ctrl.model = model; // update the model instance
          }
        }
        
        // create popover
        if(!ctrl){
          // create new controller
          ctrl = new ModelBasedPopoverCtrl(options, this.map, model, getLastUpdated);
          activeControllers[key] = ctrl;
        }
        // update info
        ctrl.update(feature);
      });
      // dispose model-missing controllers
      Object.keys(activeControllers).forEach(key => {
        if (!syncedKeys[key]){
          var ctrl = activeControllers[key];
          ctrl.close();
          delete activeControllers[key];        
        }
      });
    };
    
    // subscribe
    context.subscription = dataSource.subscribe((models) => {
      syncModelAndController(models);
    });
    return context;
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
      workaroundLayer = new ol.layer.Vector({ source: new ol.source.Vector({}), renderOrder: undefined});
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


/**
 * This class is a utility for realizing "POPOVER" capability and is a "controller" class.
 * - the model class can be any
 * - the view class is the `element` and `overlay`
 *
 * This take care of the lifecycle of the popover for a model object
 * - Creation (constructor), update, and destruction of the view
 * - Handle user's close request (`closeFunc` method)
 * - Track the model's ol.Feature, and update the popover location
 */
class ModelBasedPopoverCtrl {
  private disposed = false;
  private disposedLater: any;
  private targetFeature: any;

  private overlay: ol.Overlay; // the overlay
  private element: Element; // DOM element
  private lastUpdated: number;

  private trackGeometryListener = () => {
          var coord = (<any>this.targetFeature.getGeometry()).getCoordinates();
          this.overlay.setPosition(coord);
        };
  private closeFunc = (elementDisposed?: boolean) => {
        this.dispose(); 
  };

  /**
   * Create resources for the popover
   */
  constructor(
    private options: {
      createOverlay: (model: any, map) => ol.Overlay,
      showPopover: (elm: Element, feature: ol.Feature, pinned: boolean, model:any, closeFunc: ()=>void) => void,
      destroyPopover: (elm: Element, feature: ol.Feature, pinned: boolean, model:any, closeFunc: ()=>void) => (boolean|void),
      updatePopover?: (elm: Element, feature: ol.Feature, pinned: boolean, model:any, closeFunc: ()=>void) => void,
    },
    private map: ol.Map,
    public model: any,
    private getLastUpdated: (model: any) => number
  ){
    this.lastUpdated = getLastUpdated(this.model);
    this.overlay = options.createOverlay(this.model, this.map);
    this.element = this.overlay.getElement();
    this.map.addOverlay(this.overlay);
  }
  /**
   * Dispose this controller. Can call multiple times.
   */
  dispose() {
    if(this.isDisposed())
      return;

    this.disposed = true;
    
    // cleanup feature
    if(this.targetFeature){
      this.update(null);
    }
    // dispose overlay
    if(this.overlay){
      this.map.removeOverlay(this.overlay);
      this.overlay = null;
    }
    // dispose element
    if(this.element){
      this.element.parentElement && this.element.parentElement.removeChild(this.element);
      this.element = null;
    }
    // cleanup everything
    this.options = this.map = null;
    this.trackGeometryListener = null;
    this.closeFunc = null;
  }

  /**
   * Just return whetere this controller is disposed or not
   */
  isDisposed() {
    return this.disposed;
  }

  /**
   * Close
   */
  close(){
    this.update(null);
    if(!this.disposedLater)
      this.dispose();
  }

  /**
   * Update track target, and the popover content
   */
  update(feature: ol.Feature){
    this.lastUpdated = this.getLastUpdated(this.model);

    if(this.targetFeature === feature) {
      this.options && this.options.updatePopover && this.options.updatePopover(this.element, feature, false, this.model, this.closeFunc);
      return;
    }

    if(this.targetFeature){
      this.targetFeature.un('change:geometry', this.trackGeometryListener);
      if(feature){
        this.options && this.options.updatePopover && this.options.updatePopover(this.element, feature, false, this.model, this.closeFunc);
      }else{
        this.disposedLater = this.options && this.options.destroyPopover && this.options.destroyPopover(this.element, feature, false, this.model, this.closeFunc);
      }
    }

    let oldFeature = this.targetFeature;
    this.targetFeature = feature;

    if(this.targetFeature){
      this.targetFeature.on('change:geometry', this.trackGeometryListener);
      if(!oldFeature){
        this.options && this.options.showPopover && this.options.showPopover(this.element, feature, false, this.model, this.closeFunc);
      }
    }
  }

  /**
   * See if the model is updated or not
   */
  isUpdated(model: any){
    let lastUpdated = this.getLastUpdated(model);
    return this.lastUpdated < lastUpdated;
  }

}
