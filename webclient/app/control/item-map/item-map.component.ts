/**
 * Copyright 2016,2020 IBM Corp. All Rights Reserved.
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
import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChange, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

import * as _ from 'underscore';

import { MapHelper } from '../../shared/map-helper';
import { MapEventHelper } from '../../shared/map-event-helper';
import { EventService } from '../../shared/iota-event.service';
import { MapGeofenceHelper } from '../../shared/map-geofence-helper';
import { GeofenceService } from '../../shared/iota-geofence.service';
import { MapPOIHelper } from '../../shared/map-poi-helper';
import { POIService } from '../../shared/iota-poi.service';
import { ItemToolComponent } from '../item-tool/item-tool.component';

import { Map, View, Feature } from 'ol';
import { Tile } from 'ol/layer';
import { Style } from 'ol/style';
import { OSM } from 'ol/source';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import * as olProj from 'ol/proj';
import {defaults as defaultInteractions, Pointer as PointerInteraction} from 'ol/interaction';

declare var $; // jQuery from <script> tag in the index.html
// as bootstrap type definitoin doesn't extend jQuery $'s type definition

/**
 * The default zoom value when the map `region` is set by `center`
 */
let DEFAULT_ZOOM = 15;


@Component({
  selector: 'fmdash-item-map',
  templateUrl: 'item-map.component.html',
  styleUrls: ['item-map.component.css']
})
export class ItemMapComponent implements OnInit {
  @Input() region: any;
  @Output() extentChanged = new EventEmitter<any>();
  @ViewChild(ItemToolComponent, {static: true}) itemTool: ItemToolComponent;
  // Mapping
  map: Map;
  handleStyle: Style;
  mapEventsLayer: VectorLayer;
  mapGeofenceLayer: VectorLayer;
  mapPOILayer: VectorLayer;
  mapHelper: MapHelper;
  mapItemHelpers: any = {};
  showTool: boolean = false;
  toolTitle: string;
  dragging: boolean = false;
  dragFeatureCoordinate = null;
  dragStartCoordinate = null;
  dragFeature = null;
  commandExecutor = null;
  decorators: any = [];

  mapElementId = 'item-map';
  popoverElemetId = 'popover';

  constructor(
    private eventService: EventService,
    private geofenceService: GeofenceService,
    private poiService: POIService
  ) {
  }

  initMap() {
    // drag and drop support
    let self = this;
    function interaction() {
      PointerInteraction.call(this, {
        handleDownEvent: self.onMouseDown.bind(self),
        handleDragEvent: self.onDrag.bind(self),
        handleMoveEvent: self.onMouseMove.bind(self),
        handleUpEvent: self.onMouseUp.bind(self)
      });
    };
    interaction.prototype = Object.create(PointerInteraction.prototype);
    interaction.prototype.constructor = interaction;

    // create layyers
    this.mapEventsLayer = new VectorLayer({
      source: new VectorSource(),
      renderOrder: undefined
    });
    this.mapGeofenceLayer = new VectorLayer({
      source: new VectorSource(),
      renderOrder: undefined
    });
    this.mapPOILayer = new VectorLayer({
      source: new VectorSource(),
      renderOrder: undefined
    });

    // create a map
    let mouseInteration = new interaction();
    this.map = new Map({
      interactions: defaultInteractions(undefined).extend([mouseInteration]),
      target: document.getElementById(this.mapElementId),
      layers: [
        new Tile({
          source: new OSM(),
          preload: 4,
        }),
        this.mapGeofenceLayer,
        this.mapEventsLayer,
        this.mapPOILayer
      ],
      view: new View({
        center: olProj.fromLonLat((this.region && this.region.center) || [0, 0], undefined),
        zoom: ((this.region && this.region.zoom) || DEFAULT_ZOOM)
      }),
    });

    this.map.on("click", function (e) {
      let coordinate = this.mapHelper.normalizeLocation(olProj.toLonLat(e.coordinate, undefined));
      let loc = { longitude: coordinate[0], latitude: coordinate[1] };
      this.commandExecutor.locationClicked(loc);
    }.bind(this));

    // add helpers
    this.mapHelper = new MapHelper(this.map, function (coordinate, feature, layer) {
      let item = feature.get("item");
      if (item) {
        let helper = this.mapItemHelpers[item.getItemType()];
        if (helper && helper.hitTest) {
          return helper.hitTest(item, feature, olProj.toLonLat(coordinate, undefined));
        }
      }
      return true;
    }.bind(this));
    this.mapItemHelpers["event"] = new MapEventHelper(this.map, this.mapEventsLayer, this.eventService);
    this.mapItemHelpers["geofence"] = new MapGeofenceHelper(this.map, this.mapGeofenceLayer, this.geofenceService, { itemLabel: "Boundary", editable: true });
    this.mapItemHelpers["poi"] = new MapPOIHelper(this.map, this.mapPOILayer, this.poiService);

    // setup view change event handler
    this.mapHelper.postChangeViewHandlers.push(extent => {
      // fire event
      this.extentChanged.emit({ extent: extent });
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
            pop.on('shown.bs.popover', function () {
              let c = $(elem).parent().find('.popover .close');
              c && c.on('click', function () {
                closeCallback && closeCallback();
              });
              let r = $(elem).parent().find('.popover .remove');
              r && r.on('click', function (e) {
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
        hoverContent = { content: '<span style="white-space: nowrap;">' + _.escape(content) + '</span>' };
      } else {
        let item = feature.get("item");
        if (item) {
          let helper = this.mapItemHelpers[item.getItemType()];
          if (helper) {
            let props = helper.getHoverProps(item);
            if (props && props.length > 0) {
              let title = helper.getItemLabel() + " (" + item.getId() + ")";
              let details: string = "<table><tbody>";
              props.forEach(function (prop) {
                details += "<tr><th style='white-space: nowrap;text-align:right;'><span style='margin-right:10px;'>" + _.escape(prop.key.toUpperCase()) +
                  ":</span></th><td>" + _.escape(prop.value) + "</td></tr>";
              });
              details += "</tbody><table>";
              hoverContent = { title: title, content: details, removeable: true };
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
    this.updateTool();
  }

  ngOnChanges(changes: { [propertyName: string]: SimpleChange }) {
    if ("region" in changes) {
      let region = changes["region"].currentValue;
      console.log("MoveMap", region);
      this.mapHelper && this.mapHelper.moveMap(region);
    }
  }

  onClickTool() {
    this.showTool = this.showTool !== true;
    this.updateTool();
  }

  updateTool() {
    this.toolTitle = this.showTool ? "Close Tool" : "Open Tool";
    this.itemTool.setActive(this.showTool);
  }

  getMapExtent() {
    let size = this.map.getSize();
    if (!size) {
      return;
    }

    let extent: number[] = olProj.transformExtent(this.map.getView().calculateExtent(size), "EPSG:3857", "EPSG:4326");
    extent = this.mapHelper.normalizeExtent(extent);
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
        helper.addItemsToView(added.map(function (item) {
          return helper.createItem(item);
        }));
        updated = true;
      }
      if (removed && removed.length > 0) {
        helper.removeItemsToView(added.map(function (item) {
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
      function (feature, layer) {
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
        let helper = this.mapItemHelpers[item.getItemType()];
        if (helper && helper.hitTest) {
          let position = olProj.toLonLat(e.coordinate, undefined);
          if (!helper.hitTest(item, feature, position)) {
            return false;
          }
        }
        if (!this.commandExecutor.getMoveCommand(item, [0, 0])) {
          return false;
        }
      } else {
        let handle = feature.get("resizeHandle");
        if (!handle || !this.commandExecutor.getResizeCommand(handle.item, [0, 0], handle.index)) {
          return false;
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

      let start = olProj.toLonLat(this.dragStartCoordinate, undefined);
      let end = olProj.toLonLat(e.coordinate, undefined);
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
      _.each(<Feature[]>decorators, function (d) {
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
