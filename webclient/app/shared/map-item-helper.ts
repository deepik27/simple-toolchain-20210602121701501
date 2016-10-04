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
import { Injectable } from "@angular/core";
import * as ol from "openlayers";
import * as _ from "underscore";

/*
 * Abstract helper class to handle items shown on a map
*/
@Injectable()
export abstract class MapItemHelper<T extends Item> {
  loadingHandle = null;
  itemMap = {};
  tentativeItemMap = {};
  preCreatingItemMap = {};
  itemLabel: string;
  featureExtension: any = null;

  constructor(public map: ol.Map, public itemLayer: ol.layer.Vector) {
    this.map.getView().on("change:center", this.viewChanged.bind(this));
    this.map.getView().on("change:resolution", this.viewChanged.bind(this));
    setTimeout(this.updateView.bind(this), 100);
  }

  /*
  * Get a type of the item to be managed with this helper
  */
  public getItemType() {
    return "unknown";
  }

  /*
  * Set displayable label of the item to be managed with this helper
  */
  public setItemLabel(itemLabel: string) {
    this.itemLabel = itemLabel;
  }

  /*
  * Get displayable label of the item to be managed with this helper
  */
  public getItemLabel() {
    let label = this.itemLabel;
    if (!label) {
      label = this.getItemType();
      label = label.charAt(0).toUpperCase() + label.slice(1);
    }
    return label;
  }

  /*
  * callback function to be called when view position is changed
  */
  public viewChanged() {
    if (this.loadingHandle) {
      clearTimeout(this.loadingHandle);
      this.loadingHandle = null;
    }
    this.loadingHandle = setTimeout(this.updateView.bind(this), 1000);
  }

  /*
  * update view items according to the current location
  */
  public updateView() {
    let size = this.map.getSize();
    if (!size) {
      return;
    }
    let ext = this.map.getView().calculateExtent(size);
    let extent = ol.proj.transformExtent(ext, "EPSG:3857", "EPSG:4326");
    this.queryItems(extent[0], extent[1], extent[2], extent[3]).subscribe(data => {
      this.updateItems(data);
    });
  }

  /*
  * query items shown within given area
  */
  public abstract queryItems(min_longitude: number, min_latitude: number, max_longitude: number, max_latitude: number);

  /*
  * get specific item with given id
  */
  public abstract getItem(id: string);

  /*
  * Show items on a map
  */
  public updateItems(items: T[]) {
    if (!items) {
      return;
    }

    let itemsToAdd = [];
    let itemsToRemoveMap = {};

    // back up existing items to compare with new items
    for (let key in this.itemMap) {
      itemsToRemoveMap[key] = this.itemMap[key].item;
    }

    // compare new items with existing ones and find items to be added and items to be removed
    _.each(items, function(item: T) {
      let id = item.getId();

      if (!this.itemMap[id]) {
        itemsToAdd.push(item);
      }
      if (itemsToRemoveMap[id]) {
        delete itemsToRemoveMap[id];
      }
    }.bind(this));

    // add new items
    if (itemsToAdd.length > 0) {
      this.addItemsToView(itemsToAdd);
    }

    // remove unnecessary items
    let itemsToRemove = [];
    for (let key in itemsToRemoveMap) {
      itemsToRemove.push(itemsToRemoveMap[key]);
    }
    if (itemsToRemove.length > 0) {
      this.removeItemsFromView(itemsToRemove);
    }
  }

  /*
  * Create and show a tentative feature on a map until item is created by service
  */
  public addTentativeItem(loc: any) {
    let index = null;
    for (let i = 0; i < Number.MAX_VALUE; i++) {
      index = "index" + i;
      if (!this.preCreatingItemMap[index]) {
        break;
      }
    }
    let features = this.createTentativeFeatures(loc);
    if (features) {
      this.preCreatingItemMap[index] = {features: features};
      this.itemLayer.getSource().addFeatures(features);
    }
    return index;
  }

  /*
  * Set the id assigned to new item by service. If the service doesn't return the instance with the id for a while after its creation,
  * set the monitor flag on to monitor the item get acually available
  */
  public setTentativeItemId(id: string, item_id: string, monitor: boolean = true) {
    if (item_id && !this.itemMap[item_id] && !this.tentativeItemMap[item_id]) {
      if (this.preCreatingItemMap[id]) {
        this.tentativeItemMap[item_id] = this.preCreatingItemMap[id];
        delete this.preCreatingItemMap[id];
        if (monitor) {
          this.monitorTentativeItems([item_id]);
        }
      }
    }
  }

  /*
  * Remove a tentative feature on a map. It should be called after the real item is returned by service
  */
  public removeTentativeItem(id: string) {
    let features = this.preCreatingItemMap[id] && this.preCreatingItemMap[id].features;
    if (features) {
      let self = this;
      _.each(features, function(feature: ol.Feature) {
        self.itemLayer.getSource().removeFeature(feature);
      });
      return id;
    }
    return null;
  }

  /*
  * Monitor items to be created periodically and add items when they are created by service.
  */
  monitorTentativeItems(monitoringIds) {
    let promises = [];
    if (!monitoringIds) {
      monitoringIds = _.map(<any>this.tentativeItemMap, function(value, key) { return key; });
    }
    _.each(monitoringIds, function(id) {
      promises.push(new Promise((resolve, reject) => {
        this.getItem(id).subscribe(data => {
          if (data.getId()) {
            this.addItemsToView([data]);
          }
          resolve();
        }, error => {
          if (error.statusCode !== 404) {
            delete this.tentativeItemMap[id];
          }
          resolve();
        });
      }));
    }.bind(this));

    Promise.all(promises).then(function() {
      if (Object.keys(this.tentativeItemMap).length > 0) {
        setTimeout(function() {
          this.monitorTentativeItems();
        }.bind(this), 1000);
      }
    }.bind(this));
  }

  /*
  * Add items to a map
  */
  addItemsToView(items: T[]) {
    let self = this;
    _.each(items, function(item) {
      let id = item.getId();
      if (self.tentativeItemMap[id]) {
        let features = self.tentativeItemMap[id].features;
        delete self.tentativeItemMap[id];
        if (features) {
          _.each(features, function(feature: ol.Feature) {
            self.itemLayer.getSource().removeFeature(feature);
          });
        }
      }
      if (!self.itemMap[id]) {
        let features = self.createItemFeatures(item);
        if (features) {
          if (self.featureExtension && self.featureExtension.decorate) {
            self.featureExtension.decorate(item, features);
          }
          self.itemLayer.getSource().addFeatures(features);
          self.itemMap[id] = {item: item, features: features};
        }
      }
    });
  }

  /*
  * Remove items from a map
  */
  removeItemsFromView(items: T[]) {
    let self = this;
    _.each(items, function(item) {
      let id = item.getId();
      if (self.itemMap[id]) {
        let features = self.itemMap[id].features;
        _.each(features || [], function(feature: ol.Feature) {
          if (feature)
            self.itemLayer.getSource().removeFeature(feature);
        });
        delete self.itemMap[id];
      }
    });
  }

  public abstract createItem(param: any): T;

  public abstract createItemFeatures(item: T);

  public createTentativeFeatures(loc: any) {
    return null;
  }

  public getFeatureStyle(feature: ol.Feature) {
    return this.itemLayer.getStyle();
  }

  public updateAffectedItems(ids: string[]) {
    _.each(<any>this.itemMap, function(value, key) {
      let item = value.item;
      let feature = value.features[0];
      let affected = _.contains(ids, item.getId());
      if (feature.get("affected") !== affected) {
        feature.set("affected", affected);
        feature.setStyle(this.getFeatureStyle(feature));
      }
    }.bind(this));
  }

  public getHoverProps(item: T) {
    return [];
  }
}

@Injectable()
export abstract class Item {
  constructor(params) {
    for (let key in params) {
      this[key] = params[key];
    }
  }

  public abstract getId();
  public getItemType() {
    return "unknown";
  }
}
