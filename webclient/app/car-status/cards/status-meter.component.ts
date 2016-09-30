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
import { Component, Input, OnInit, OnDestroy, AfterContentInit, ViewChild, OnChanges, SimpleChange } from '@angular/core';

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

var chartComponentNextId = 0;

@Component({
  moduleId: module.id,
  selector: 'status-meter',
  template: `
  <div class="row">
    <div class="column-6-med">
      <div class="row noOffsetRow">
        <div class="column-6-med">{{title}}</div>
        <div class="column-6-med">
          <strong class="carStatus-strong"
              [ngClass]="statusClassObj">
            <span class="numCounter">{{value}}</span>{{valueSuffix}}
          </strong>
          <br *ngIf="valueUnit" />{{valueUnit}}
        </div>
      </div>
    </div>
    <div class="column-6-med">
      <div class="speedometer-container" *ngIf="graphType==='gauge'">
        <div class="speedometer">
          <div class="pointer" id="speedometer-pointer" #speedometerDiv
              [ngClass]="statusClassObj"
              [style.transform]="'rotate(' + speedometerDeg + 'deg)'">
          </div>
          <div class="speedometer bottom-bar"></div>
        </div>
      </div>
      <div class="thermometer-container" *ngIf="graphType==='bar' || graphType==='temp-bar'">
          <ul class="thermometer">
              <li *ngFor="let i of thermometerTicks">
<!--                  <p class="frnh"><span *ngIf="graphType==='temp-bar'">{{(i * 1.8 + 32) | number}}</span></p>-->
                  <p class="cent">{{i}}</p>
              </li>
          </ul>
          <div class="thermometer-range" id="thermometer-range" #thermometerDiv
            [ngClass]="statusClassObj"
            [style.width]="thermometerPercent + '%'">
          </div>
      </div>
    </div>
  </div><!--end row-->
  `,
  providers: [],
})
export class StatusMeterComponent implements OnInit, OnDestroy, AfterContentInit, OnChanges {
  @Input() minValue: number;
  @Input() maxValue: number;
  @Input() tickStep = 30;
  @Input() title: string;
  @Input() valueSuffix: string;
  @Input() valueUnit: string;
  @Input() graphType = 'gauge'; // gauge or temp-bar

  @Input() value: number;
  @Input() status: string; // either 'critical', 'troubled', or 'normal'

  private barMinMaxAdjust = 2;
  private subject = new Subject<any>();
  private subscription;
  private statusClassObj = {};
  private speedometerDeg = -90;
  private thermometerPercent = 10;
  private thermometerTicks = [];

  @ViewChild('speedometerDiv') speedometerDiv;
  @ViewChild('thermometerDiv') thermometerDiv;

  constructor() {
  }

  ngOnInit() {
    // prepare ticks
    for(let i=this.minValue; i<=this.maxValue; i+=this.tickStep){
      this.thermometerTicks.push(i);
    }
  }

  ngAfterContentInit() {
    this.subscription = this.subject.debounceTime(100).distinctUntilChanged().subscribe(value => {
      var gaugeDiv = (this.speedometerDiv && this.speedometerDiv.nativeElement);
      var barDiv = (this.thermometerDiv && this.thermometerDiv.nativeElement);
      if(gaugeDiv){
        let ratio = (value.value - this.minValue) / (this.maxValue - this.minValue);
        ratio = Math.max(0, Math.min(1, ratio));
        this.speedometerDeg = Math.floor(ratio * 180 - 90);
        //gaugeDiv.style.transform = `rotate(${(ratio * 180 - 90).toFixed(0)}deg) !important`;
      }
      if(barDiv){
        let ratio = (value.value - (this.minValue - this.barMinMaxAdjust)) / ((this.maxValue + this.barMinMaxAdjust) - (this.minValue - this.barMinMaxAdjust));
        ratio = Math.max(0, Math.min(1, ratio));
        this.thermometerPercent = Math.floor(ratio * 100);
        //barDiv.style.width = `${(ratio * 100).toFixed(0)}% !important`;
      }
      var status = value.status;
      var obj = {red: status==='critical', orange: status==='troubled', green: status==='normal', blue: undefined };
      obj.blue = (!obj.red && !obj.orange && !obj.green);
      this.statusClassObj = obj;
    });
    this.fireChange();
  }

  ngOnDestroy() {
    if(this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  ngOnChanges(changes: { [key: string]: SimpleChange} ) {
    // translates @Input(s) to observable subjects
    let newValueChange = changes['value'];
    let newStatusChange = changes['status'];
    if (newValueChange || newStatusChange){
      this.fireChange();
    }
  }

  private fireChange(){
    this.subject.next({value: this.value, status: this.status});
  }
}
