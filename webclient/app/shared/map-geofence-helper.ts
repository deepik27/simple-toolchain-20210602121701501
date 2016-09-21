import * as ol from "openlayers";
import { Injectable } from "@angular/core";
import { GeofenceService } from "./iota-geofence.service";
import{ MapItemHelper } from "./map-item-helper";
import{ Item } from "./map-item-helper";

@Injectable()
export class MapGeofenceHelper extends MapItemHelper<Geofence> {

  constructor(public map: ol.Map, public itemLayer: ol.layer.Vector, public geofenceService: GeofenceService) {
    super(map, itemLayer);
    let defaultStyle = new ol.style.Style({
        fill: new ol.style.Fill({
          color: [255, 0, 128, 0.1]
        }),
        stroke: new ol.style.Stroke({
          color: [255, 0, 128, 0.3],
          width: 2
        })
    });
    itemLayer.setStyle(defaultStyle);
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

  public createItemFeatures(geofence: Geofence) {
    // Setup current event position
    let features = [];
    let geometry = geofence.geometry;
    if (geofence.geometry_type === "circle") {
      let center: ol.Coordinate = ol.proj.transform([geometry.longitude, geometry.latitude], "EPSG:4326", "EPSG:3857");
      let circle = new ol.geom.Circle(center, geometry.radius);
      let feature = new ol.Feature(circle);
      features.push(feature);
    } else {
      let points = [];
      points.push(ol.proj.transform([geometry.min_longitude, geometry.min_latitude], "EPSG:4326", "EPSG:3857"));
      points.push(ol.proj.transform([geometry.min_longitude, geometry.max_latitude], "EPSG:4326", "EPSG:3857"));
      points.push(ol.proj.transform([geometry.max_longitude, geometry.max_latitude], "EPSG:4326", "EPSG:3857"));
      points.push(ol.proj.transform([geometry.max_longitude, geometry.min_latitude], "EPSG:4326", "EPSG:3857"));
      points.push(ol.proj.transform([geometry.min_longitude, geometry.min_latitude], "EPSG:4326", "EPSG:3857"));

      let polygonCoordinates = [];
      for (let i = 0; i < points.length - 1; i++) {
        polygonCoordinates.push([points[i], points[i + 1]]);
      }

      let poiygon = new ol.geom.Polygon([]);
      poiygon.setCoordinates(polygonCoordinates);
      let feature = new ol.Feature({geometry: poiygon, item: geofence});
      features.push(feature);
    }
    return features;
  }
}

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

  constructor(params) {
    super(params);
  }

  public getId() {
    return this.id;
  }
}
