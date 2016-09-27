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
  @Output() locationSelected = new EventEmitter<any>();
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
        mapItemHelpers: self.mapItemHelpers,
        handleDownEvent: self.onMouseDown,
        handleDragEvent: self.onDrag,
        handleMoveEvent: self.onMouseMove,
        handleUpEvent: self.onMouseUp
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
//    mouseInteration.commandExecutor = this.commandExecutor;
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
      this.commandExecutor.locationClicked(loc).then(function(data) {
        if (data && data.data) {
          let helper = this.mapItemHelpers[data.type];
          if (helper) {
            helper.addTentativeItem(data.data, loc);
          }
        }
      }.bind(this), function(error) {
        console.log(error);
      });
    }.bind(this));

    // add helpers
    this.mapHelper = new MapHelper(this.map);
    this.mapItemHelpers["event"] = new MapEventHelper(this.map, this.mapEventsLayer, this.eventService);
    this.mapItemHelpers["geofence"] = new MapGeofenceHelper(this.map, this.mapGeofenceLayer, this.geofenceService, "Boundary");

    this.handleStyle = new ol.style.Style({
      text: new ol.style.Text({
          fill: new ol.style.Fill({color: "#404040"}),
          scale: 1.0,
          textAlign: "center",
          textBaseline: "middle",
          text: "\u25cf",
          font: "18px monospace"
      })
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
            let title = helper.getItemLabel() + " (" + item.getId() + ")";
            let details: string = "<table><tbody>";
            props && props.forEach(function(prop) {
              details += "<tr><th style='white-space: nowrap;text-align:right;'><span style='margin-right:10px;'>" + _.escape(prop.key.toUpperCase()) +
                                  ":</span></th><td>" + _.escape(prop.value) + "</td></tr>";
            });
            details += "</tbody><table>";
            hoverContent = {title: title, content: details, removeable: true};
          }
        }
      }
      return hoverContent;
    };
  }

  ngOnInit() {
    this.commandExecutor = this.itemTool.getCommandExecutor();
    this.initMap();
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
      let geometry = (this.dragFeature.getGeometry());
      geometry.translate(deltaX, deltaY);

      deltaX = e.coordinate[0] - this.dragStartCoordinate[0];
      deltaY = e.coordinate[1] - this.dragStartCoordinate[1];
      if (deltaX === 0 && deltaY === 0) {
        return;
      }

      let item = this.dragFeature.get("item");
      let delta = ol.proj.toLonLat([deltaX, deltaY], undefined);
      if (item) {
        let command = this.commandExecutor.getMoveCommand(item, delta);
        if (command) {
          command.execute();
        }
      } else {
        let handle = this.dragFeature.get("resizeHandle");
        if (handle) {
          let delta = ol.proj.toLonLat([deltaX, deltaY], undefined);
          let command = this.commandExecutor.getResizeCommand(handle.item, delta, handle.index);
          if (command) {
            command.execute();
          }
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

    let geometry = (this.dragFeature.getGeometry());
    geometry.translate(deltaX, deltaY);

    this.dragFeatureCoordinate[0] = e.coordinate[0];
    this.dragFeatureCoordinate[1] = e.coordinate[1];
  }

  _updateFeature() {
    let handle = this.dragFeature.get("resizeHandle");
    if (handle) {
    }
  }
}
