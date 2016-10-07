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
  tentativeStyle: ol.style.Style;
  AREA_OFFSET = 1000;
  constructor(public map: ol.Map, public itemLayer: ol.layer.Vector, public geofenceService: GeofenceService, options: any = {}) {
    super(map, itemLayer);

    options = options || {};
    this.setItemLabel(options.itemLabel || "Geofence");

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
      self.tentativeStyle = new ol.style.Style({
          fill: new ol.style.Fill({
            color: [100, 0, 100, 0.05]
          }),
          stroke: new ol.style.Stroke({
            color: [100, 0, 100, 0.3],
            width: 2,
            lineDash: [5, 5]
          })
      });

      return function(feature, resolution) {
        let style = self.getFeatureStyle(feature);
        feature.setStyle(style);
        return style;
      };
    }(undefined);
    this.itemLayer.setStyle(getFeatureStyle);

    this.featureExtension = options.editable && <any>function() {
      let handleStyle = new ol.style.Style({
        text: new ol.style.Text({
            fill: new ol.style.Fill({color: "#404040"}),
            scale: 1.0,
            textAlign: "center",
            textBaseline: "middle",
            text: "\u25cf",
            font: "18px monospace"
        })
      });
      return {
        decorate: function(item: any, features: ol.Feature[]) {
          if (item.geometry) {
            let areaFeature = null;
            _.each(features, function(feature) {
              if (feature.get("area")) {
                areaFeature = feature;
              } else if (feature.get("item")) {

                let handles: ol.Feature[] = [];
                let areaOffset = item.direction === "in" ? 0 : self.AREA_OFFSET;

                // Constraint for rectangle geofence
                let rectangleConstraint = function rectangleConstraint(handle, point, deltaX, deltaY) {

                  let moveHandle = function moveHandle(coords, index, p) {
                    if (index === 0) {
                      coords[0][0] = p[0];
                      coords[0][1] = p[1];
                      coords[4][0] = p[0];
                      coords[4][1] = p[1];
                      coords[1][0] = p[0];
                      coords[3][1] = p[1];
                    } else if (index === 1) {
                      coords[1][0] = p[0];
                      coords[1][1] = p[1];
                      coords[0][0] = p[0];
                      coords[4][0] = p[0];
                      coords[2][1] = p[1];
                    } else if (index === 2) {
                      coords[2][0] = p[0];
                      coords[2][1] = p[1];
                      coords[3][0] = p[0];
                      coords[1][1] = p[1];
                    } else if (index === 3) {
                      coords[3][0] = p[0];
                      coords[3][1] = p[1];
                      coords[2][0] = p[0];
                      coords[0][1] = p[1];
                      coords[4][1] = p[1];
                    }
                  };

                  // update geofence area
                  let index = this.index;
                  let geometry = feature.getGeometry();
                  let coordinates = (<any>geometry).getCoordinates()[0];
                  moveHandle(coordinates, index, point);
                  (<any>geometry).setCoordinates([coordinates]);

                  let area_dir;
                  let handleIndex;
                  let areaGeometry = areaFeature && areaFeature.getGeometry();
                  let areaCoordinates = areaGeometry && (<any>areaGeometry).getCoordinates()[0];

                  if (index === 0) {
                    handleIndex = [1, 3];
                    if (areaCoordinates) {
                      area_dir = [270, 180];
                    }
                  } else if (index === 1) {
                    handleIndex = [0, 2];
                    if (areaCoordinates) {
                      area_dir = [270, 0];
                    }
                  } else if (index === 2) {
                    handleIndex = [3, 1];
                    if (areaCoordinates) {
                      area_dir = [90, 0];
                    }
                  } else if (index === 3) {
                    handleIndex = [2, 0];
                    if (areaCoordinates) {
                      area_dir = [90, 180];
                    }
                  }

                  // update related handles
                  let h_geometry = handle.getGeometry();
                  (<any>h_geometry).translate(deltaX, deltaY);
                  h_geometry = handles[handleIndex[0]].getGeometry();
                  (<any>h_geometry).translate(deltaX, 0);
                  h_geometry = handles[handleIndex[1]].getGeometry();
                  (<any>h_geometry).translate(0, deltaY);

                  // update target area
                  if (areaCoordinates) {
                    let handleGeometry = handle.getGeometry();
                    let handleCoordinates = (<any>handleGeometry).getCoordinates();
                    let p = ol.proj.toLonLat(handleCoordinates, undefined);
                    let p1 = self.calcPosition(p, areaOffset, area_dir[0]);
                    let p2 = self.calcPosition(p, areaOffset, area_dir[1]);
                    moveHandle(areaCoordinates, index, ol.proj.fromLonLat([p1[0], p2[1]], undefined));
                    (<any>areaGeometry).setCoordinates([areaCoordinates]);
                  }
                };

                // Constraint for circle geofence
                let circleConstraint = function rectangleConstraint(handle, point, deltaX, deltaY) {
                  let index = this.index;

                  // update geofence area
                  let geometry = feature.getGeometry();
                  let center = (<any>geometry).getCenter();
                  let radius = (<any>geometry).getRadius();

                  let centerLonLat = ol.proj.toLonLat(center, undefined);
                  let handleLonLat = ol.proj.toLonLat(point, undefined);

                  let dx = self.calcDistance([handleLonLat[0], centerLonLat[1]], centerLonLat);
                  let dy = self.calcDistance([centerLonLat[0], handleLonLat[1]], centerLonLat);

                  // Update radius of curcle feature
                  let new_radius = Math.min(dx, dy);
                  (<any>geometry).setRadius(new_radius);

                  // Update handless
                  let min_x = self.calcPosition(centerLonLat, new_radius, 270)[0];
                  let min_y = self.calcPosition(centerLonLat, new_radius, 180)[1];
                  let max_x = self.calcPosition(centerLonLat, new_radius, 90)[0];
                  let max_y = self.calcPosition(centerLonLat, new_radius, 0)[1];
                  let p = [];
                  p.push(ol.proj.fromLonLat([min_x, min_y], undefined));
                  p.push(ol.proj.fromLonLat([min_x, max_y], undefined));
                  p.push(ol.proj.fromLonLat([max_x, max_y], undefined));
                  p.push(ol.proj.fromLonLat([max_x, min_y], undefined));

                  _.each(handles, function(handle, i) {
                    let h_geometory = handle.getGeometry();
                    (<any>h_geometory).setCoordinates(p[i]);
                    if (i === index) {
                      point[0] = p[i][0];
                      point[1] = p[i][1];
                    }
                  });

                  // update target area
                  let areaGeometry = areaFeature && areaFeature.getGeometry();
                  let areaCoordinates = areaGeometry && (<any>areaGeometry).getCoordinates()[0];
                  if (areaCoordinates) {
                    min_x = self.calcPosition(centerLonLat, new_radius + areaOffset, 270)[0];
                    min_y = self.calcPosition(centerLonLat, new_radius + areaOffset, 180)[1];
                    max_x = self.calcPosition(centerLonLat, new_radius + areaOffset, 90)[0];
                    max_y = self.calcPosition(centerLonLat, new_radius + areaOffset, 0)[1];
                    p = [];
                    p.push(ol.proj.fromLonLat([min_x, min_y], undefined));
                    p.push(ol.proj.fromLonLat([min_x, max_y], undefined));
                    p.push(ol.proj.fromLonLat([max_x, max_y], undefined));
                    p.push(ol.proj.fromLonLat([max_x, min_y], undefined));
                    p.push(p[0]);

                    _.each(areaCoordinates, function(coords, i) {
                      coords[0] = p[i][0];
                      coords[1] = p[i][1];
                      // coords[i + 1][0] = p[i + 1][0];
                      // coords[i + 1][1] = p[i + 1][1];
                    });
                    (<any>areaGeometry).setCoordinates([areaCoordinates]);
                  }
                };

                // Show handles on each corner
                let geometry = item.geometry;
                let points: ol.Coordinate[] = [];
                let constraint = null;
                if (item.geometry_type === "circle") {
                  let top = self.calcPosition([geometry.longitude, geometry.latitude], geometry.radius, 0);
                  let bottom = self.calcPosition([geometry.longitude, geometry.latitude], geometry.radius, 180);
                  let left = self.calcPosition([geometry.longitude, geometry.latitude], geometry.radius, 270);
                  let right = self.calcPosition([geometry.longitude, geometry.latitude], geometry.radius, 90);
                  points.push([left[0], bottom[1]]);
                  points.push([left[0], top[1]]);
                  points.push([right[0], top[1]]);
                  points.push([right[0], bottom[1]]);
                  constraint = circleConstraint;
                } else if (item.geometry_type === "rectangle") {
                  points.push([geometry.min_longitude, geometry.min_latitude]);
                  points.push([geometry.min_longitude, geometry.max_latitude]);
                  points.push([geometry.max_longitude, geometry.max_latitude]);
                  points.push([geometry.max_longitude, geometry.min_latitude]);
                  constraint = rectangleConstraint;
                } else {
                  return;
                }

                _.each(points, function(coordinates: ol.Coordinate, index) {
                  let position = ol.proj.fromLonLat(coordinates, undefined);
                  let handle = new ol.Feature({geometry: new ol.geom.Point(position), resizeHandle: {item: item, index: index, constraint: constraint}});
                  handle.setStyle(handleStyle);
                  handles.push(handle);
                  features.push(handle);
                });

                let decorators = feature.get("decorators") || [];
                decorators = decorators.concat(handles);
                feature.set("decorators", decorators);
              }
            });
          }
        }
      };
    }();
  }

  getFeatureStyle(feature: ol.Feature) {
    if (feature.get("area")) {
      return this.targetStyle;
    }
    let geofence = feature.get("item");
    if (!geofence) {
      return this.tentativeStyle;
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
    if (geofence.direction !== "in" && geofence.target && geofence.target.area) {
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
    } else if (geofence.geometry_type === "rectangle") {
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

  public createTentativeFeatures(loc: any) {
    let features = [];
    let geometry = loc.geometry;
    if (loc.geometry_type === "circle") {
      let center: ol.Coordinate = ol.proj.transform([geometry.longitude, geometry.latitude], "EPSG:4326", "EPSG:3857");
      let circle = new (<any>ol.geom.Circle)(center, geometry.radius);
      let feature = new ol.Feature({geometry: circle});
      features.push(feature);
    } else if (loc.geometry_type === "rectangle") {
      let polygonCoordinates = this.createGeofenceCoordinate(geometry);
      let polygon = new ol.geom.Polygon([polygonCoordinates]);
      let feature = new ol.Feature({geometry: polygon});
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

  /*
  * Create a geometry of effective area for given geofence
  */
  public createTargetArea(geometry_type: string, geometry: any, direction: string) {
    let areaOffset = direction === "in" ? 0 : this.AREA_OFFSET;
    if (geometry_type === "circle") {
      let top = this.calcPosition([geometry.longitude, geometry.latitude], geometry.radius + areaOffset, 0);
      let bottom = this.calcPosition([geometry.longitude, geometry.latitude], geometry.radius + areaOffset, 180);
      let left = this.calcPosition([geometry.longitude, geometry.latitude], geometry.radius + areaOffset, 270);
      let right = this.calcPosition([geometry.longitude, geometry.latitude], geometry.radius + areaOffset, 90);
      return {
          min_longitude: left[0],
          min_latitude: bottom[1],
          max_longitude: right[0],
          max_latitude: top[1]
      };
    } else if (geometry_type === "rectangle") {
      let area0 = this.calcPosition([geometry.min_longitude, geometry.max_latitude], areaOffset, 0);
      let area1 = this.calcPosition([geometry.max_longitude, geometry.max_latitude], areaOffset, 90);
      let area2 = this.calcPosition([geometry.max_longitude, geometry.min_latitude], areaOffset, 180);
      let area3 = this.calcPosition([geometry.min_longitude, geometry.min_latitude], areaOffset, 270);
      return {
          min_longitude: area3[0],
          min_latitude: area2[1],
          max_longitude: area1[0],
          max_latitude: area0[1]
      };
    }
  }

  /*
  * Calculate a distance between point1[longitude, latitude] and point2[longitude, latitude]
  */
  public calcDistance(point1, point2) {
    let R = 6378e3;
    let lon1 = this._toRadians(point1[0]);
    let lat1 = this._toRadians(point1[1]);
    let lon2 = this._toRadians(point2[0]);
    let lat2 = this._toRadians(point2[1]);
    let delta_x = lon2 - lon1;
    let delta_y = lat2 - lat1;
    let a = Math.sin(delta_y / 2) * Math.sin(delta_y / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(delta_x / 2) * Math.sin(delta_x / 2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let distance = R * c;
    return distance;
  }

  /*
  * Calculate a point[longitude, latitude] by distance meters toward bearing(0-359 degrees) far from start point[longitude, latitude]
  */
  public calcPosition(start, distance, bearing) {
    let R = 6378e3;
    let d = distance;
    let angular_distance = d / R;
    bearing = this._toRadians(bearing);
    let s_lon = this._toRadians(start[0]);
    let s_lat = this._toRadians(start[1]);
    let sin_s_lat = Math.sin(s_lat);
    let cos_s_lat = Math.cos(s_lat);
    let cos_angular_distance = Math.cos(angular_distance);
    let sin_angular_distance = Math.sin(angular_distance);
    let sin_bearing = Math.sin(bearing);
    let cos_bearing = Math.cos(bearing);
    let sin_e_lat = sin_s_lat * cos_angular_distance + cos_s_lat * sin_angular_distance * cos_bearing;

    let e_lat = this._toDegree(Math.asin(sin_e_lat));
    let e_lon = this._toDegree(s_lon + Math.atan2(sin_bearing * sin_angular_distance * cos_s_lat,
                             cos_angular_distance - sin_s_lat * sin_e_lat));
    e_lon = (e_lon + 540) % 360 - 180;
    return [e_lon, e_lat];
  }

  _toRadians(n) {
    return n * (Math.PI / 180);
  }

  _toDegree(n) {
    return n * (180 / Math.PI);
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
