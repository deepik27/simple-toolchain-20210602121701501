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
import * as _ from 'underscore';

/* --------------------------------------------------------------
 * AnimatedDeviceManager
 *
 * This class manages devices and update the device data with device
 * samples sent from the server.
 */
export class RealtimeDeviceDataProvider {
  devices = <{ [key: string]: RealtimeDeviceData }>{};

  getDevice(id){
    return this.devices[id];
  }
  getDevices(){
    return Object.keys(this.devices).map(id => this.devices[id]);
  }
  addDeviceSamples(newDeviceSamples, syncAllDevices = false){
      newDeviceSamples.forEach(sample => {
          if (!sample)
              return;
          // fixup samples
          if(!sample.t) sample.t = sample.ts;
          if(!sample.deviceID) sample.deviceID = sample.mo_id;
          if(!sample.lat) sample.lat = sample.latitude || sample.matched_latitude;
          if(!sample.lng) sample.lng = sample.longitude || sample.matched_longitude;

          // fixup alerts
          if(sample.info && sample.info.alerts && !sample.status){
            // translate alerts to troubled, critical, normal
            let a = sample.info.alerts;
            if(a.Critical || a.High){
              sample.status = 'critical';
            } else if (a.Medium || a.Low) {
              sample.status = 'troubled';
            } else {
              sample.status = 'normal';
            }
          }

          // polyfill status
          if(sample.info && sample.info.alerts && sample.info.alerts.byType){
            var byType = sample.info.alerts.byType;
            if(!sample.info.alerts.fuelStatus){
              sample.info.alerts.fuelStatus = byType.low_fuel ? 'critical' : (byType.half_fuel ? 'troubled' : 'normal');
            }
            if(!sample.info.alerts.engineTempStatus){
              sample.info.alerts.engineTempStatus = byType.high_engine_temp ? 'critical' : 'normal';
            }
          }

          // update the device latest location
          var device = this.devices[sample.deviceID];
          if (device) {
              device.addSample(sample);
          }
          else {
              device = this.devices[sample.deviceID] = new RealtimeDeviceData(sample);
          }
      });
      if(syncAllDevices){
        // delete devices not in the newDeviceSamples
        let devicesMap = _.groupBy(newDeviceSamples, (sample: any) => sample.deviceID);
        Object.keys(this.devices).forEach(deviceID => {
          if(!devicesMap[deviceID]){
            delete this.devices[deviceID];
          }
        });
      }
  };

}

/* --------------------------------------------------------------
 * RealtimeDeviceData
 *
 * This class manages data for a single device and provides read/update
 * access to the data. The incoming data would be a series of samples which
 * includes a timestamp and the device metrics (e.g. position of a car).
 * For such series of data, this class provides linear approximation for
 * the metrics for any timestamp.
 */
export class RealtimeDeviceData {
  latestInfo = null;
  latestSample = null;
  samples: any[];
  deviceID: string;
  vehicle: any;

  constructor(initialSample){
    var s0 = Object.assign({}, initialSample);
    s0.t = 0; // move to epoc
    this.samples = [s0];
    this.deviceID = s0.deviceID;
    // add sample
    this.addSample(initialSample);
  }

  getAt(animationProgress) {
    var linearApprox = function (s0, s1, prop, t) {
        var t0 = s0.t, t1 = s1.t, v0 = s0[prop], v1 = s1[prop];
        if (t1 == t0)
            return v1; // assume that t0 < t1
        var r = ((v1 - v0) / (t1 - t0)) * (t - t0) + v0;
        return r;
    };
    var r = null; // result
    var i_minus_1 = this.samples.length - 1;
    while (i_minus_1 >= 0 && this.samples[i_minus_1].t > animationProgress) {
        i_minus_1--;
    }
    var i = i_minus_1 + 1;
    if (0 <= i_minus_1 && i < this.samples.length) {
        var s0 = this.samples[i_minus_1];
        var s1 = this.samples[i];
        r = Object.assign({}, s1);
        ['lat', 'lng'].forEach(function (prop) {
            r[prop] = linearApprox(s0, s1, prop, animationProgress);
        });
    }
    else if (i_minus_1 == this.samples.length - 1) {
        var s0 = this.samples[i_minus_1];
        r = s0; // no approximation
    }
    else if (i == 0 && i < this.samples.length) {
        var s0 = this.samples[i];
        r = s0; // no approximation
    }
    else
        throw new Error('Never');
    this.removeOldSamples(animationProgress);
    return r;
  }

  public addSample(sample, animationProgress?) {
    // add missing props from previous sample
    var prev = this.samples.length > 0 ? this.samples[this.samples.length - 1] : null;
    if (prev) {
        Object.keys(prev).forEach(function (prop) {
            if (typeof sample[prop] === 'undefined')
              sample[prop] = prev[prop];
        });
    }
    // update considering sample time
    sample.t = sample.t || sample.lastEventTime || sample.lastUpdateTime || (new Date().getTime());
    if (sample.t > this.samples[this.samples.length - 1].t) {
        this.samples.push(sample);
    }
    else if (sample.t < this.samples[this.samples.length - 1].t) {
        console.log('sample is reverted by %d', this.samples[this.samples.length - 1].t - sample.t);
    }
    else {
        this.samples[this.samples.length - 1] = sample; // replace
    }
    this.removeOldSamples(animationProgress);
    // update the latest additional info
    this.latestSample = sample;
    if (sample.info)
        this.latestInfo = sample.info;
  };
  removeOldSamples(animationProgress) {
    if (!animationProgress)
        return;
    // remove old samples
    var i = this.samples.findIndex(function (s) { return (s.t > animationProgress); });
    var deleteCount;
    if (i == -1) {
        // when there is no data newer than sim_now, we keep the last `1`
        deleteCount = this.samples.length - 1; // '1' is the number of samples that we need to retain
    }
    else {
        // keep `1` old data
        deleteCount = i - 1;
    }
    if (deleteCount > 1)
        this.samples.splice(0, deleteCount);
  };
}
