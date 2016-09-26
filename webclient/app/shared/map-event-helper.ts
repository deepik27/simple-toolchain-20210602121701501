import * as ol from "openlayers";
import { Injectable } from "@angular/core";
import { EventService } from "./iota-event.service";
import{ MapItemHelper } from "./map-item-helper";
import{ Item } from "./map-item-helper";

@Injectable()
export class MapEventHelper extends MapItemHelper<Event> {
  defaultStyle: ol.style.Style;
  dirs: string[];
  eventTypes = [];
  eventIcon = null;
  styles: ol.style.Style[];
  affectedStyles: ol.style.Style[];

  constructor(public map: ol.Map, public itemLayer: ol.layer.Vector, public eventService: EventService, public itemLabel: string = "Event") {
    super(map, itemLayer, itemLabel);
    let self = this;

    let getEventStyle = function getEventStyle(feature) {
      let eventIcon = new ol.style.Circle({
          radius: 10,
          stroke : new ol.style.Stroke({
            color: "#ffc000",
            width: 1
          }),
          fill : new ol.style.Fill({
            color: "yellow"
          })
        });
      let affectedEventIcon = new ol.style.Circle({
          radius: 10,
          stroke : new ol.style.Stroke({
            color: "yellow",
            width: 3
          }),
          fill : new ol.style.Fill({
            color: "#ffc000"
          })
        });

      let arrowTexts = ["\u2191", "\u2197", "\u2192", "\u2198", "\u2193", "\u2199", "\u2190", "\u2196"];
      self.styles = arrowTexts.map(function(text) {
        let rotation = 0; // 3.14 * rotation / 180;
        return new ol.style.Style({
            image: eventIcon,
            text: new ol.style.Text({
                fill: new ol.style.Fill({color: "#606060"}),
                scale: 1.0,
                textAlign: "center",
                textBaseline: "middle",
                text: text,
                rotation: rotation,
                font: "16px monospace"
            })
          });
      });
      self.affectedStyles = arrowTexts.map(function(text) {
        let rotation = 0; // 3.14 * rotation / 180;
        return new ol.style.Style({
            image: affectedEventIcon,
            text: new ol.style.Text({
                fill: new ol.style.Fill({color: "#404040"}),
                scale: 1.0,
                textAlign: "center",
                textBaseline: "middle",
                text: text,
                rotation: rotation,
                font: "16px monospace"
            })
          });
      });

      return function(feature, resolution) {
        let style = self.getEventStyle(feature);
        feature.setStyle(style);
        return style;
      };
    }(undefined);
    itemLayer.setStyle(getEventStyle);
    this.eventService.getEventTypes().subscribe(data => { this.eventTypes = data; });
  }

  getEventStyle(feature) {
    let event = feature.get("item");
    if (!event) {
      return;
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

  public updateAffectedEvents(events) {
    let ids = (events || []).map(function(e)  { return e.event_id; });
    for (let key in this.itemMap) {
      let event = this.itemMap[key].item;
      let feature = this.itemMap[key].features[0];
      let affected = ids.indexOf(event.event_id) >= 0;
      if (feature.get("affected") !== affected) {
        feature.set("affected", affected);
        feature.setStyle(this.getEventStyle(feature));
      }
    }
  }

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
    }).map(data => {
      return data.map(function(event) {
        return new Event(event);
      });
    });
  }

  public createItemFeatures(event: Event) {
    // Setup current event position
    let coordinates: ol.Coordinate = [event.s_longitude || 0, event.s_latitude || 0];
    let position = ol.proj.fromLonLat(coordinates, undefined);
    let feature = new ol.Feature({geometry: new ol.geom.Point(position), item: event});
    console.log("created an event feature : " + event.event_id);
    return [feature];
  }

  public createItem(param: any) {
    return new Event(param);
  }

  public getHoverProps(event) {
    let eventTypes =   this.eventTypes || [];
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
      props.push({key: "type", value: description});
    }
    // location and heading
    let index = Math.floor(((event.heading / 360 + 1 / 32) % 1) * 16);
    let dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    let dir = dirs[index];
    props.push({key: "location", value: Math.round(event.s_latitude * 10000000) / 10000000 + "," + Math.round(event.s_longitude * 10000000) / 10000000});
    props.push({key: "heading", value: Math.round(event.heading * 10000000) / 10000000 + " [" + dir + "]"});
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
    return this.event_id;
  }
  public getItemType() {
    return "event";
  }
}
