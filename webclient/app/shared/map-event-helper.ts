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
import * as ol from "openlayers";
import { Injectable } from "@angular/core";
import { EventService } from "./iota-event.service";
import{ MapItemHelper } from "./map-item-helper";
import{ Item } from "./map-item-helper";

@Injectable()
export class MapEventHelper extends MapItemHelper<Event> {
  dirs: string[];
  eventTypes = [];
  eventIcon = null;
  styles: ol.style.Style[];
  affectedStyles: ol.style.Style[];
  defaultStyle: ol.style.Style;

  constructor(public map: ol.Map, public itemLayer: ol.layer.Vector, public eventService: EventService, public featureExtension: any = undefined, public itemLabel: string = "Event") {
    super(map, itemLayer, featureExtension);

    this.setItemLabel(this.itemLabel);
    let self = this;
    let getFeatureStyle = function getFeatureStyle(feature: ol.Feature) {
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
        let tentativeIcon = new ol.style.Circle({
            radius: 10,
            stroke : new ol.style.Stroke({
              color: "#ffc000",
              width: 1,
              lineDash: [3, 3]
            }),
            fill : new ol.style.Fill({
              color: "rgba(240,240,0,0.7)"
            })
          });
      self.defaultStyle = new ol.style.Style({image: tentativeIcon});

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
        let style = self.getFeatureStyle(feature);
        feature.setStyle(style);
        return style;
      };
    }(undefined);
    this.itemLayer.setStyle(getFeatureStyle);
    this.eventService.getEventTypes().subscribe(data => { this.eventTypes = data; });
  }

  getFeatureStyle(feature: ol.Feature) {
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

  // query items within given area
  public getItem(id: string) {
    return this.eventService.getEvent(id).map(data => {
      return new Event(data);
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

  public createTentativeFeatures(id: string, loc: any) {
    // Setup current event position
    let position = ol.proj.fromLonLat([loc.longitude, loc.latitude], undefined);
    let feature = new ol.Feature({geometry: new ol.geom.Point(position)});
    return [feature];
  }

  public createItem(param: any) {
    return new Event(param);
  }

  public getHoverProps(event: Event) {
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
    return this.event_id ? this.event_id.toString() : null;
  }
  public getItemType() {
    return "event";
  }
}
