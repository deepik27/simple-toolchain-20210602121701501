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
import { Component, Input, OnInit, OnDestroy } from '@angular/core';

import { Observable } from 'rxjs/Observable';

@Component({
  moduleId: module.id,
  selector: 'status-hist-graph',
  template: `
  <div class="row noOffsetRow">
    <div class="column-4-med">
      <div class="value-container">
        <div class="value-item">{{title}}</div>
        <div class="value-item"><strong class="carStatus-strong" [ngClass]="lastStatusClass">{{lastValue}}{{valueSuffix}}</strong>{{valueUnit}}</div>
      </div>
    </div>
    <div class="column-8-med">
      <div class="graph-container">
        <div *ngFor="let item of items; let i = index;"
          class="graph-bar"
          [ngClass]="item.statusClass"
          [style.left]="(100 * (i - 1) / historyCount) + '%'"
          [style.width]="(100 / historyCount) + '%'">
          <div [style.height]="(item.ratio*100 + 1) + '%'"></div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .value-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      /* safari */
      display: -webkit-flex;
      -webkit-flex-direction: column;
      -webkit-justify-content: space-between;
    }
    .value-container .value-item {
      margin-bottom: 20px;
    }
    .graph-container {
      background-color: #f8f8f8;
      position: relative;
      overflow: hidden;
      overflow-x: hidden;
      width: 100%;
      height: 150px;
    }
    .graph-container .graph-bar {
      position: absolute;
      top: 0px;
      bottom: 0px;
      align: center;
      -moz-transition:    all 0.5s linear;
      -webkit-transition: all 0.5s linear;
      transition:         all 0.5s linear;
    }
    .graph-container .graph-bar div {
      position: absolute;
      bottom: 0px;
      width: 50%;
      margin-left: 25%;
      background: #666666;
    }
    .graph-container .graph-bar.blue div {
      background: #3774ba;
    }
    .graph-container .graph-bar.green div {
      background: #58a946;
    }
    .graph-container .graph-bar.orange div {
      background: #f67734;
    }
    .graph-container .graph-bar.red div {
      background: #f05153;
    }
    .graph-container .graph-bar.inactive {
      width: 0px;
    }
    .graph-container .graph-bar.inactive div {
      width: 0px;
      height: 0px;
    }
  `],
  providers: [],
})
export class StatusHistoryGrahpComponent implements OnInit, OnDestroy {
  @Input() minValue = 0;
  @Input() maxValue = 100;
  @Input() interval = 2000;
  @Input() title: string;
  @Input() valueSuffix: string;
  @Input() valueUnit: string;
  @Input() historyCount = 20;

  @Input() value: number;
  @Input() status: string; // either 'critical', 'troubled', or 'normal'

  private items: BarItem[] = null;
  private lastValue: any = '-';
  private lastStatusClass = {};

  private subscription;

  ngOnInit(){
    // initialize items
    this.items = [];
    let now = Date.now();
    for(let i=0; i <= this.historyCount + 1; i++){
      this.items.push({ts: now - this.historyCount + i - 1, ratio: 0, value: '-', statusClass: {}, active: i !== 0});
    }

    this.subscription = Observable.interval(this.interval).startWith(-1).map(() => {
      var ratio = Math.max(0, Math.min(1, (this.value - this.minValue) / (this.maxValue - this.minValue)));
      var status = this.status;
      var statusClass = {red: status==='critical', orange: status==='troubled', green: status==='normal', blue: undefined };
      statusClass.blue = (!statusClass.red && !statusClass.orange && !statusClass.green);
      let now = Date.now();
      this.lastValue = this.value;
      this.lastStatusClass = statusClass;
      let lastItem = this.items[this.items.length - 1];
      lastItem.ratio = ratio;
      lastItem.value = this.value;
      lastItem.statusClass = statusClass;
      lastItem.active = true;
      this.items.push({ts: now, ratio: 0, value: 0, statusClass: statusClass, active: false});
      let firstItem = this.items[0];
      firstItem.active = false;
      this.items.shift();
    }).delay(Math.min(this.interval/2, 500)).subscribe(() => {
      // start animation
    })
  }

  ngOnDestroy(){
    if(this.subscription){
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}

interface BarItem {
  ts: number;
  ratio: number;
  value: any;
  statusClass: any;
  active: boolean;
}
