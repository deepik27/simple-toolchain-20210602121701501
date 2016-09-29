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
