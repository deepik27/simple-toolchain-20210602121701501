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
import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChange, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

import * as ol from 'openlayers';

import { MapHelper } from '../../shared/map-helper';
import { MapEventHelper } from '../../shared/map-event-helper';
import { EventService } from '../../shared/iota-event.service';
import { MapGeofenceHelper } from '../../shared/map-geofence-helper';
import { GeofenceService } from '../../shared/iota-geofence.service';
import { ItemToolComponent } from '../item-tool/item-tool.component';

declare var $; // jQuery from <script> tag in the index.html
// as bootstrap type definitoin doesn't extend jQuery $'s type definition

/*
 * Additional styles, javascripts
 * my css: car-monitor.css
 * OpenLayers 3.5:
 *   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/ol3/3.5.0/ol.css" type="text/css">
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/ol3/3.5.0/ol.js"></script>
 * rx-lite 3.1.2, rxjs-dom 7.0.3:
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/rxjs/3.1.2/rx.lite.js"></script>
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/rxjs-dom/7.0.3/rx.dom.js"></script>
 */

	/**
	 * The default zoom value when the map `region` is set by `center`
	 */
let DEFAULT_ZOOM = 15;


@Component({
  moduleId: module.id,
  selector: 'fmdash-item-map',
  templateUrl: 'item-map.component.html',
  styleUrls: ['item-map.component.css']
})
export class ItemMapComponent implements OnInit {
  @Input() region: any;
  @Output() extentChanged = new EventEmitter<any>();
  @ViewChild(ItemToolComponent) itemTool: ItemToolComponent;
	// Mapping
  map: ol.Map;
  handleStyle: ol.style.Style;
  mapEventsLayer: ol.layer.Vector;
  mapGeofenceLayer: ol.layer.Vector;
  mapHelper: MapHelper;
  mapItemHelpers: any = {};
  showTool: boolean = false;
  dragging: boolean = false;
  dragFeatureCoordinate = null;
  dragStartCoordinate = null;
  dragFeature = null;
  commandExecutor = null;
  decorators: any = [];

  mapElementId = 'item-map';
  popoverElemetId = 'popover';

  constructor(
    private router: Router,
    private eventService: EventService,
    private geofenceService: GeofenceService
  ) {
  }

  initMap() {
    // drag and drop support
    let self = this;
    function interaction() {
      ol.interaction.Pointer.call(this, {
        handleDownEvent: self.onMouseDown.bind(self),
        handleDragEvent: self.onDrag.bind(self),
        handleMoveEvent: self.onMouseMove.bind(self),
        handleUpEvent: self.onMouseUp.bind(self)
      });
    };
    (<any>ol).inherits(interaction, ol.interaction.Pointer);

		// create layyers
    this.mapEventsLayer = new ol.layer.Vector({
      source: new ol.source.Vector()
    });
    this.mapGeofenceLayer = new ol.layer.Vector({
      source: new ol.source.Vector()
    });

    // create a map
    let mouseInteration = new interaction();
    this.map =  new ol.Map({
      interactions: ol.interaction.defaults(undefined).extend([mouseInteration]),
      target: document.getElementById(this.mapElementId),
      layers: [
        new ol.layer.Tile({
          source: new ol.source.OSM(<ol.Object>{}),
          preload: 4,
        }),
        this.mapGeofenceLayer,
        this.mapEventsLayer
      ],
      view: new ol.View({
        center: ol.proj.fromLonLat((this.region && this.region.center) || [0, 0], undefined),
        zoom: ((this.region && this.region.zoom) || DEFAULT_ZOOM)
      }),
    });

    this.map.on("click", function(e) {
      let coordinate = ol.proj.toLonLat(e.coordinate, undefined);
      let loc = {longitude: coordinate[0], latitude: coordinate[1]};
      this.commandExecutor.locationClicked(loc);
    }.bind(this));

    // add helpers
    this.mapHelper = new MapHelper(this.map);
    this.mapItemHelpers["event"] = new MapEventHelper(this.map, this.mapEventsLayer, this.eventService);
    this.mapItemHelpers["geofence"] = new MapGeofenceHelper(this.map, this.mapGeofenceLayer, this.geofenceService, {itemLabel: "Boundary", editable: true});

		// setup view change event handler
    this.mapHelper.postChangeViewHandlers.push(extent => {
			// fire event
      this.extentChanged.emit({extent: extent});
    });
  }

  initPopup() {
    let executor = this.commandExecutor;
    let helpers = this.mapItemHelpers;
    this.mapHelper.addPopOver({
      elm: document.getElementById(this.popoverElemetId),
      pin: true,
      updateInterval: 1000,
    },
    function showPopOver(elem, feature, pinned, closeCallback) {
      if (!feature) return;
      let content = <any>getPopOverContent(feature);
      if (content) {
        let title = '<div>' + (content.title ? _.escape(content.title) : '') + '</div>';
        let item = feature.get("item");
        if (pinned) {
          if (executor && item && content.removeable) {
            title += "<span class='btn btn-default icon-delete remove' style='margin-right:4px'></span>";
          }
          title += '<div><span class="btn btn-default close">&times;</span></div>';
        }
        let pop = $(elem).popover({
          html: true,
          title: title,
          content: content.content
        });
        if (pinned) {
          pop.on('shown.bs.popover', function(){
            let c = $(elem).parent().find('.popover .close');
            c && c.on('click', function(){
              closeCallback && closeCallback();
            });
            let r = $(elem).parent().find('.popover .remove');
            r && r.on('click', function(e) {
              let helper = helpers[item.getItemType()];
              if (helper) {
                helper.removeItemsFromView([item]);
              }
              executor && executor.deleteItem(item);
              closeCallback && closeCallback();
            });
          });
        }
        $(elem).popover('show');
      }
    },
    function destroyPopOver(elem, feature, pinned) {
      if (!feature) return;
      $(elem).popover('destroy');
    },
    function updatePopOver(elem, feature, pinned) {
      if (!feature) return;
      let content = getPopOverContent(feature);
      if (content) {
        let popover = $(elem).data('bs.popover');
        if (popover.options.content !== content.content) {
          popover.options.content = content.content;
          $(elem).popover('show');
        }
      }
    });

  	// popover - generate popover content from ol.Feature
    let getPopOverContent = (feature) => {
      let hoverContent = null;
      let content = <string>feature.get('popoverContent');
      if (content) {
        hoverContent = {content: '<span style="white-space: nowrap;">' + _.escape(content) + '</span>' };
      } else {
        let item = feature.get("item");
        if (item) {
          let helper = this.mapItemHelpers[item.getItemType()];
          if (helper) {
            let props = helper.getHoverProps(item);
            if (props && props.length > 0) {
              let title = helper.getItemLabel() + " (" + item.getId() + ")";
              let details: string = "<table><tbody>";
              props.forEach(function(prop) {
                details += "<tr><th style='white-space: nowrap;text-align:right;'><span style='margin-right:10px;'>" + _.escape(prop.key.toUpperCase()) +
                                    ":</span></th><td>" + _.escape(prop.value) + "</td></tr>";
              });
              details += "</tbody><table>";
              hoverContent = {title: title, content: details, removeable: true};
            }
          }
        }
      }
      return hoverContent;
    };
  }

  ngOnInit() {
    this.commandExecutor = this.itemTool.getCommandExecutor();
    this.initMap();
    this.region && this.mapHelper.moveMap(this.region);
    this.initPopup();
    this.itemTool.setItemMap(this);
  }

  ngOnChanges(changes: {[propertyName: string]: SimpleChange}) {
    if ("region" in changes) {
      let region = changes["region"].currentValue;
      console.log("MoveMap", region);
      this.mapHelper && this.mapHelper.moveMap(region);
    }
  }

  getMapExtent() {
    let size = this.map.getSize();
    if (!size) {
      return;
    }

    let extent = ol.proj.transformExtent(this.map.getView().calculateExtent(size), "EPSG:3857", "EPSG:4326");
    return {
      min_longitude: extent[0],
      min_latitude: extent[1],
      max_longitude: extent[2],
      max_latitude: extent[3]
    };
  }

  updateMapItems(type: string, added: any[], removed: any[]) {
    let helper = this.mapItemHelpers[type];
    if (helper) {
        let updated = false;
        if (added && added.length > 0) {
          helper.addItemsToView(added.map(function(item) {
            return helper.createItem(item);
          }));
          updated = true;
        }
        if (removed && removed.length > 0) {
          helper.removeItemsToView(added.map(function(item) {
            return helper.createItem(item);
          }));
          updated = true;
        }
        if (!updated) {
          helper.viewChanged();
        }
    }
  }

  // Event handlers
  onMouseDown(e) {
    console.log("mouse down");
    if (!this.commandExecutor) {
      return false;
    }
    let feature = e.map.forEachFeatureAtPixel(e.pixel,
        function(feature, layer) {
          return feature;
        });

    if (feature) {
      let decorates = feature.get("decorates");
      while (decorates) {
        if (feature.get("resizeHandle")) {
          break;
        }
        feature = decorates;
        decorates = feature.get("decorates");
      }
      let item = feature.get("item");
      if (item) {
        if (!this.commandExecutor.getMoveCommand(item, [0, 0])) {
          return false;
        }
      } else {
        let handle = feature.get("resizeHandle");
        if (handle) {
          if (!this.commandExecutor.getResizeCommand(handle.item, [0, 0], handle.index)) {
            return false;
          }
        }
      }

      this.dragFeatureCoordinate = [e.coordinate[0], e.coordinate[1]];
      this.dragStartCoordinate = [e.coordinate[0], e.coordinate[1]];
      this.dragFeature = feature;
    }
    return !!feature;
  }

  onMouseUp(e) {
    try {
      if (!this.dragging || !this.dragFeature) {
        return;
      }

      let deltaX = e.coordinate[0] - this.dragFeatureCoordinate[0];
      let deltaY = e.coordinate[1] - this.dragFeatureCoordinate[1];

      let handle = this.dragFeature.get("resizeHandle");
      if (handle) {
        handle.constraint && handle.constraint(this.dragFeature, e.coordinate, deltaX, deltaY);
        deltaX = e.coordinate[0] - this.dragFeatureCoordinate[0];
        deltaY = e.coordinate[1] - this.dragFeatureCoordinate[1];
      } else {
        let geometry = (this.dragFeature.getGeometry());
        geometry.translate(deltaX, deltaY);
      }

      let start = ol.proj.toLonLat(this.dragStartCoordinate, undefined);
      let end = ol.proj.toLonLat(e.coordinate, undefined);
      deltaX = end[0] - start[0];
      deltaY = end[1] - start[1];
      if (deltaX === 0 && deltaY === 0) {
        return;
      }

      let item = this.dragFeature.get("item");
      if (item) {
        this.commandExecutor.moveItem(item, [deltaX, deltaY]);
      } else {
        let handle = this.dragFeature.get("resizeHandle");
        if (handle) {
          this.commandExecutor.resizeItem(handle.item, [deltaX, deltaY], handle.index);
        }
      }
    } finally {
      this.dragging = false;
      this.dragFeature = null;
      this.dragFeatureCoordinate = null;
      this.dragStartCoordinate = null;
    }
    return false;
  }

  onMouseMove(e) {
  }

  onDrag(e) {
    this.dragging = true;
    let deltaX = e.coordinate[0] - this.dragFeatureCoordinate[0];
    let deltaY = e.coordinate[1] - this.dragFeatureCoordinate[1];

    this.dragFeatureCoordinate[0] = e.coordinate[0];
    this.dragFeatureCoordinate[1] = e.coordinate[1];

    let handle = this.dragFeature.get("resizeHandle");
    if (handle) {
      handle.constraint && handle.constraint(this.dragFeature, e.coordinate, deltaX, deltaY);
    } else {
      this._moveFeature(this.dragFeature, deltaX, deltaY);
    }
  }

  _moveFeature(feature, deltaX, deltaY) {
    if (!feature) {
      return;
    }
    let geometry = feature.getGeometry();
    (<any>geometry).translate(deltaX, deltaY);

    let decorators = feature.get("decorators");
    if (decorators) {
      let self = this;
      _.each(<ol.Feature[]>decorators, function(d) {
        self._moveFeature(d, deltaX, deltaY);
      });
    }
  }

  _updateFeature() {
    let handle = this.dragFeature.get("resizeHandle");
    if (handle) {
    }
  }
}
