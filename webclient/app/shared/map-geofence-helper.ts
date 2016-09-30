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
import { GeofenceService } from "./iota-geofence.service";
import{ MapItemHelper } from "./map-item-helper";
import{ Item } from "./map-item-helper";

@Injectable()
export class MapGeofenceHelper extends MapItemHelper<Geofence> {
  styles = {};
  targetStyle: ol.style.Style;
  constructor(public map: ol.Map, public itemLayer: ol.layer.Vector, public geofenceService: GeofenceService, public featureExtension: any = undefined, public itemLabel: string = "Geofence") {
    super(map, itemLayer, featureExtension);

    this.setItemLabel(this.itemLabel);
    let self = this;
    let getFeatureStyle = function getFeatureStyle(feature: ol.Feature) {
      self.styles["out"] = new ol.style.Style({
          fill: new ol.style.Fill({
            color: [0, 0, 255, 0.1]
          }),
          stroke: new ol.style.Stroke({
            color: [0, 0, 255, 0.3],
            width: 2
          })
      });
      self.styles["in"] = new ol.style.Style({
          fill: new ol.style.Fill({
            color: [255, 0, 128, 0.1]
          }),
          stroke: new ol.style.Stroke({
            color: [255, 0, 128, 0.3],
            width: 2
          })
      });
      self.targetStyle = new ol.style.Style({
          fill: new ol.style.Fill({
            color: [100, 100, 100, 0.1]
          }),
          stroke: new ol.style.Stroke({
            color: [100, 100, 100, 0.3],
            width: 2
          })
      });

      return function(feature, resolution) {
        let style = self.getFeatureStyle(feature);
        feature.setStyle(style);
        return style;
      };
    }(undefined);
    this.itemLayer.setStyle(getFeatureStyle);
  }

  getFeatureStyle(feature: ol.Feature) {
    if (feature.get("area")) {
      return this.targetStyle;
    }
    let geofence = feature.get("item");
    if (!geofence) {
      return null;
    }
    return this.styles[geofence.direction || "out"];
  };

  public getItemType() {
    return "geofence";
  }

  // query items within given area
  public queryItems(min_longitude: number, min_latitude: number, max_longitude: number, max_latitude: number) {
    return this.geofenceService.queryGeofences({
        min_latitude: min_latitude,
        min_longitude: min_longitude,
        max_latitude: max_latitude,
        max_longitude: max_longitude
    }).map(data => {
      return data.map(function(geofence) {
        return new Geofence(geofence);
      });
    });
  }

  // get item with id
  public getItem(id: string) {
    return this.geofenceService.getGeofence(id).map(data => {
      return new Geofence(data);
    });
  }

  public createItemFeatures(geofence: Geofence) {
    let features = [];
    let target = null;
    if (geofence.target && geofence.target.area) {
      let polygonCoordinates = this.createGeofenceCoordinate(geofence.target.area);
      let polygon = new ol.geom.Polygon([polygonCoordinates]);
      let feature = new ol.Feature({geometry: polygon, item: geofence, area: geofence.target.area});
      features.push(feature);
      target = feature;
    }
    let geometry = geofence.geometry;
    if (geofence.geometry_type === "circle") {
      let center: ol.Coordinate = ol.proj.transform([geometry.longitude, geometry.latitude], "EPSG:4326", "EPSG:3857");
      let circle = new (<any>ol.geom.Circle)(center, geometry.radius);
      let feature = new ol.Feature({geometry: circle, item: geofence});
      if (target) {
        feature.set("decorators", [target]);
        target.set("decorates", feature);
      }
      features.push(feature);
    } else {
      let polygonCoordinates = this.createGeofenceCoordinate(geometry);
      let polygon = new ol.geom.Polygon([polygonCoordinates]);
      let feature = new ol.Feature({geometry: polygon, item: geofence});
      if (target) {
        feature.set("decorators", [target]);
        target.set("decorates", feature);
      }
      features.push(feature);
    }
    return features;
  }

  createGeofenceCoordinate(geometry) {
    let points = [];
    points.push(ol.proj.transform([geometry.min_longitude, geometry.min_latitude], "EPSG:4326", "EPSG:3857"));
    points.push(ol.proj.transform([geometry.min_longitude, geometry.max_latitude], "EPSG:4326", "EPSG:3857"));
    points.push(ol.proj.transform([geometry.max_longitude, geometry.max_latitude], "EPSG:4326", "EPSG:3857"));
    points.push(ol.proj.transform([geometry.max_longitude, geometry.min_latitude], "EPSG:4326", "EPSG:3857"));
    points.push(ol.proj.transform([geometry.min_longitude, geometry.min_latitude], "EPSG:4326", "EPSG:3857"));

    let polygonCoordinates = [];
    for (let i = 0; i < points.length; i++) {
      polygonCoordinates.push([points[i][0], points[i][1]]);
    }
    return polygonCoordinates;
  }

  public createItem(param: any) {
    return new Geofence(param);
  }

  public getHoverProps(geofence: Geofence) {
    let props = [];
    props.push({key: "direction", value: geofence.direction});
    return props;
  }
}

@Injectable()
export class Geofence extends Item {
  id: string;
  direction: string;
  geometry_type: string;
  geometry: {
    min_latitude: number,
    min_longitude: number,
    max_latitude: number,
    max_longitude: number,
    latitude: number,
    longitude: number,
    radius: number
  };
  target: {
    area: {
      min_latitude: number,
      min_longitude: number,
      max_latitude: number,
      max_longitude: number
    }
  };

  constructor(params) {
    super(params);
  }

  public getId() {
    return this.id ? this.id.toString() : null;
  }
  public getItemType() {
    return "geofence";
  }
}
