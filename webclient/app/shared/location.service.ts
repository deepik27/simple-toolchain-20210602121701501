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
import { Injectable } from '@angular/core';

@Injectable()
export class LocationService {
  constructor() {  }

  //
  // Area is for focusing on a small region.
  // - to set location, `center` (and `zoom`) or `extent` property
  //   - the default zoom value is 15
  //
  areas: MapArea[] = [
    {id: 'vegas1'  , name: 'MGM Grand, Las Vegas', center:  [-115.1664377,36.102894]},
    {id: 'vegas2' ,name: 'Mandalay Bay, Las Vegas', center:  [-115.177541,36.093703]},
    {id: 'munch1'  ,name: 'Hellabrunn Zoo, Munich', center:  [11.558721,48.100317]},
    {id: 'munch2'  ,name: 'Nymphenburg Palace, Munich', center:  [11.555974,48.176261]},
    {id: 'tokyo1', name: 'Tokyo, Japan', center: [139.731992, 35.709026] },
  ];

  //
  // Track current position from GPS
  //
  private currentArea: MapArea;

  //
  // Region is wider than area, e.g. to track the number of cars
  //
  regions: MapArea[] = [
    {id: 'vegas'  ,name: 'Las Vegas', extent: [-116.26637642089848,35.86905016413695,-114.00868599121098,36.423521308323046]},
    {id: "munich" ,name: 'Munich, Germany', extent: [10.982384418945298,48.01255711693946,12.111229633789048,48.24171763772631]},
    {id: 'tokyo'  ,name: 'Tokyo, Japan', extent:  [139.03856214008624,35.53126066670448,140.16740735493002,35.81016922341598]},
    {id: "toronto",name: 'Toronto, Canada', extent: [-80.69297429492181,43.57305259767264,-78.43528386523431,44.06846938917488]},
  ];

  //
  // Track visible extent in Map
  //
  private mapRegion: MapArea;

  getAreas():MapArea[]{
    return this.areas;
  }
  getCurrentAreaRawSync():MapArea{
    return this.currentArea;
  }
  getCurrentArea(chooseNearestFromList = false):Promise<MapArea>{
    return new Promise((resolve, reject) => {
      var chooseNearest = (from) => {
        // when the location is not "last selected", re-select the map location depending on the current location
        var current_center = from.center;
        var nearest = _.min(this.areas, area => {
            if((area.id && area.id.indexOf('_') === 0) || !area.center) return undefined;
            // approximate distance by the projected map coordinate
            var to_rad = function(deg){ return deg / 180 * Math.PI; };
            var r = 6400;
            var d_lat = Math.asin(Math.sin(to_rad(area.center[1] - current_center[1]))); // r(=1) * theta
            var avg_lat = (area.center[1] + current_center[1]) / 2
            var lng_diff = _.min([Math.abs(area.center[0] - current_center[0]), Math.abs(area.center[0] + 360 - current_center[0]), Math.abs(area.center[0] - 360 - current_center[0])]);
            var d_lng = Math.cos(to_rad(avg_lat)) * to_rad(lng_diff); // r * theta
            var d = Math.sqrt(d_lat * d_lat + d_lng * d_lng);
            //console.log('Distance to %s is about %f km.', area.id, d * 6400);
            return d;
        });
        if(nearest.id){
          return nearest;
        }
        return from;
      }

      if(this.currentArea){
        var r = chooseNearestFromList ? chooseNearest(this.currentArea) : this.currentArea;
        return resolve(r);
      }
      if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(pos => {
            var current_center = [pos.coords.longitude, pos.coords.latitude];
            this.currentArea = {id: '_current', name: 'Current Location', center: current_center};
            var r = chooseNearestFromList ? chooseNearest(this.currentArea) : this.currentArea;
            return resolve(r);
        });
      }else{
        return reject();
      }
    });
  }
  getRegions():MapArea[]{
    return this.regions;
  }
  getMapRegion():MapArea{
    return this.mapRegion;
  }
  setMapRegionExtent(extent: number[]){
    if(!this.mapRegion || this.mapRegion.id !== '_last_selected'){
      this.mapRegion = {id: '_last_selected', name: 'Last Selected Area in Map', extent: extent};
    }else{
      this.mapRegion.extent = extent;
    }
  }

}

export interface MapArea {
  id: string;
  name: string;
  center?: number[],
  extent?: number[]
};
