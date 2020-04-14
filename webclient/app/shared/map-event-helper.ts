/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
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
import { EventService } from "./iota-event.service";
import { MapItemHelper } from "./map-item-helper";
import { Item } from "./map-item-helper";
import { map } from 'rxjs/operators';

import { Map, Feature, Coordinate } from 'ol';
import { Style, Text, Fill, Circle, Stroke } from 'ol/style';
import { Point } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import * as olProj from 'ol/proj';


export class MapEventHelper extends MapItemHelper<Event> {
  dirs: string[];
  eventTypes = [];
  eventIcon = null;
  styles: Style[];
  affectedStyles: Style[];
  defaultStyle: Style;

  constructor(public map: Map, public itemLayer: VectorLayer, public eventService: EventService, options: any = {}) {
    super(map, itemLayer);

    options = options || {};
    this.setItemLabel(options.itemLabel || "Event");

    let self = this;
    let getFeatureStyle = function getFeatureStyle(feature: Feature) {
      let eventIcon = new Circle({
        radius: 10,
        stroke: new Stroke({
          color: "#ffc000",
          width: 1
        }),
        fill: new Fill({
          color: "yellow"
        })
      });
      let affectedEventIcon = new Circle({
        radius: 10,
        stroke: new Stroke({
          color: "yellow",
          width: 3
        }),
        fill: new Fill({
          color: "#ffc000"
        })
      });
      let tentativeIcon = new Circle({
        radius: 10,
        stroke: new Stroke({
          color: "#ffc000",
          width: 1,
          lineDash: [3, 3]
        }),
        fill: new Fill({
          color: "rgba(240,240,0,0.7)"
        })
      });
      self.defaultStyle = new Style({ image: tentativeIcon });

      let arrowTexts = ["\u2191", "\u2197", "\u2192", "\u2198", "\u2193", "\u2199", "\u2190", "\u2196"];
      self.styles = arrowTexts.map(function (text) {
        let rotation = 0; // 3.14 * rotation / 180;
        return new Style({
          image: eventIcon,
          text: new Text({
            fill: new Fill({ color: "#606060" }),
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
        let rotation = 0; // 3.14 * rotation / 180;
        return new Style({
          image: affectedEventIcon,
          text: new Text({
            fill: new Fill({ color: "#404040" }),
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
        let style = self.getFeatureStyle(feature);
        feature.setStyle(style);
        return style;
      };
    }(undefined);
    this.itemLayer.setStyle(getFeatureStyle);
    this.eventService.getEventTypes().subscribe(data => { this.eventTypes = data; });
  }

  getFeatureStyle(feature: Feature) {
    let event = feature.get("item");
    if (!event) {
      return this.defaultStyle;
    }
    let textIndex = Math.floor((event.heading % 360) / Math.floor(360 / this.styles.length));
    let rotation = (event.heading % 360) % Math.floor(360 / this.styles.length);
    if (rotation > Math.floor(360 / this.styles.length) / 2) {
      textIndex++;
      if (textIndex === this.styles.length)
        textIndex = 0;
    }
    let affected = feature.get("affected");
    return affected ? this.affectedStyles[textIndex] : this.styles[textIndex];
  };

  updateAffectedEvents(events) {
    var updatedFeatures = [];
    var ids = (events || []).map((e) => { return e.event_id; });
    for (var key in this.itemMap) {
      var event = this.itemMap[key].item;
      var feature = this.itemMap[key].features[0];
      var affected = ids.indexOf(event.event_id) >= 0;
      if (feature.get('affected') != affected) {
        feature.set('affected', affected);
        feature.setStyle(this.getFeatureStyle(feature));
        updatedFeatures.push(feature);
      }
    }
  };
  
  public getItemType() {
    return "event";
  }

  // query items within given area
  public queryItems(min_longitude: number, min_latitude: number, max_longitude: number, max_latitude: number) {
    return this.eventService.queryEvents({
      min_latitude: min_latitude,
      min_longitude: min_longitude,
      max_latitude: max_latitude,
      max_longitude: max_longitude
    }).pipe(map(data => {
      return data.map(function (event) {
        return new Event(event);
      });
    }));
  }

  // query items within given area
  public getItem(id: string) {
    return this.eventService.getEvent(id).pipe(map(data => {
      return new Event(data);
    }));
  }

  public createItemFeatures(event: Event) {
    // Setup current event position
    let coordinates: Coordinate = [event.s_longitude || 0, event.s_latitude || 0];
    let position = olProj.fromLonLat(coordinates, undefined);
    let feature = new Feature({ geometry: new Point(position), item: event });
    //    console.log("created an event feature : " + event.event_id);
    return [feature];
  }

  public createTentativeFeatures(loc: any) {
    // Setup current event position
    let position = olProj.fromLonLat([loc.longitude, loc.latitude], undefined);
    let feature = new Feature({ geometry: new Point(position) });
    return [feature];
  }

  public createItem(param: any) {
    return new Event(param);
  }

  public getHoverProps(event: Event) {
    let eventTypes = this.eventTypes || [];
    // event type or description
    let description = event.event_type;
    for (let i = 0; i < eventTypes.length; i++) {
      let type = eventTypes[i];
      if (type.event_type === event.event_type) {
        description = type.description;
        break;
      }
    }

    let props = [];
    if (description) {
      props.push({ key: "type", value: description });
    }
    // location and heading
    let index = Math.floor(((event.heading / 360 + 1 / 32) % 1) * 16);
    let dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    let dir = dirs[index];
    props.push({ key: "location", value: Math.round(event.s_latitude * 10000000) / 10000000 + "," + Math.round(event.s_longitude * 10000000) / 10000000 });
    props.push({ key: "heading", value: Math.round(event.heading * 10000000) / 10000000 + " [" + dir + "]" });
    return props;
  }
}

export class Event extends Item {
  event_id: string;
  event_type: string;
  event_name: string;
  event_category: string;
  s_longitude: number;
  s_latitude: number;
  heading: number;

  constructor(params) {
    super(params);
  }

  public getId() {
    return this.event_id ? this.event_id.toString() : null;
  }
  public getItemType() {
    return "event";
  }
}
