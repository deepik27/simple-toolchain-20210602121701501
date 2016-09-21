import * as ol from "openlayers";
import { Injectable } from "@angular/core";
import { EventService } from "./iota-event.service";
import{ MapItemHelper } from "./map-item-helper";
import{ Item } from "./map-item-helper";

@Injectable()
export class MapEventHelper extends MapItemHelper<Event> {
  defaultStyle: ol.style.Style;
  dirEventStyles: ol.style.Style[];
  dirs: string[];

  constructor(public map: ol.Map, public itemLayer: ol.layer.Vector, public eventService: EventService) {
    super(map, itemLayer);

    let eventIcon = new ol.style.Icon({
        scale: 0.14,
        anchor: [79, 158],
        anchorXUnits: "pixels",
        anchorYUnits: "pixels",
        src: "img/iota-event.png"
    });

    this.defaultStyle = new ol.style.Style({image: eventIcon});
    itemLayer.setStyle(this.defaultStyle);
    this.dirEventStyles = [];
    this.dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    this.dirs.forEach(function(dir) {
      this.dirEventStyles.push(new ol.style.Style({
        image: eventIcon,
        text: new ol.style.Text({
            fill: new ol.style.Fill({color: "#808080"}),
            scale: 0.9,
            textAlign: "center",
            textBaseline: "bottom",
            offsetY: -7,
            text: dir,
            font: "monospace"
        })
      }));
    }.bind(this));
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
    let event_type = event.event_type;
    let coordinates: ol.Coordinate = [event.s_longitude || 0, event.s_latitude || 0];
    let position = ol.proj.fromLonLat(coordinates, undefined);
    let feature = new ol.Feature({geometry: new ol.geom.Point(position), item: event});
    let index = Math.floor(((event.heading / 360 + 1 / 32) % 1) * 16);
    let style = index < this.dirEventStyles.length ? this.dirEventStyles[index] : this.defaultStyle;
    feature.setStyle(style);
    console.log("created an event feature : " + event.event_id);
    return [feature];
  }

  public createEventDescriptionHTML(event, eventTypes) {
    eventTypes = eventTypes || [];
    let result = { content: "", title: undefined };
    result.title = event.event_id;
    result.content = "<table><tbody>";

		// event type or description
    let description = event.event_type;
    for (let i = 0; i < eventTypes.length; i++) {
      let type = eventTypes[i];
      if (type.event_type === event.event_type) {
        description = type.description;
        break;
      }
    }
    if (description) {
      result.content += "<tr><th style='white-space: nowrap;text-align:right;'><span style='margin-right:10px;'>TYPE:</span></th><td>" + _.escape(description) + "</td></tr>";
    }
		// location and heading
    let index = Math.floor(((event.heading / 360 + 1 / 32) % 1) * 16);
    let dir = this.dirs[index];
    result.content += "<tr><th style='white-space: nowrap;text-align:right;'><span style='margin-right:10px;'>LOCATION:</span></th><td style='white-space: nowrap'>" + Math.round(event.s_latitude * 10000000) / 10000000 + "," + Math.round(event.s_longitude * 10000000) / 10000000 + "</td></tr>" +
              "<tr><th style='white-space: nowrap;text-align:right;'><span style='margin-right:10px;'>HEADING:</span></th><td>" + Math.round(event.heading * 10000000) / 10000000 + " [" + dir + "]" + "</td></tr>";

		// duration
    if (event.start_time) {
      let startTime = new Date(event.start_time).toLocaleString();
      result.content += "<tr><th style='white-space: nowrap;text-align:right;'><span style='margin-right:10px;'>START:</span></th><td style='white-space: nowrap'>" + startTime + "</td></tr>";
    }
    if (event.end_time) {
      let endTime = new Date(event.end_time).toLocaleString();
      result.content += "<tr><th style='white-space: nowrap;text-align:right;'><span style='margin-right:10px;'>END:</span></th><td style='white-space: nowrap'>" + endTime + "</td></tr>";
    }
    result.content += "</tbody><table>";
    return result;
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
}
