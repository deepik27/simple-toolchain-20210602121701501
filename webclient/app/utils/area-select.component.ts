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
import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { LocationService, MapArea } from '../shared/location.service';

@Component({
	moduleId: module.id,
	selector: 'area-select',
	templateUrl: 'area-select.component.html',
	providers: [],
})

export class AreaSelectComponent{
	@Input() DEBUG = false;
	@Input() extent: number[];
	@Output() areaChanged = new EventEmitter<number[]>();
	min_lng: string;
	min_lat: string;
	max_lng: string;
	max_lat: string;
	selectedArea: MapArea;
	areas: MapArea[];

	constructor(private locationService: LocationService) {
		this.areas = [{id: "nolocation", name: ""}].concat(locationService.getRegions());
		let mapregion = locationService.getMapRegion();
		if(mapregion && mapregion.extent){
			this.areas.push({id: "maplocation", name:"Location selected in the Map Page", extent: mapregion.extent});
		}
	}

	ngOnInit(){
		if(this.extent){
			var area = this._matchPredefinedArea();
			if(!area){
				area = this.areas.find(ares => area.id === "maplication");
				if(!area){
					area = {id: "maplocation", name:"Location selected in the Map Page", extent: this.extent};
					this.areas.push(area);
				}else{
					area.extent = this.extent;
				}
			}
			this.selectedArea = area;
		}
	}
	ngOnChanges(changes){
		if(changes.extent && changes.extent.currentValue !== changes.extent.previousValue){
			this._setAreaInput(changes.extent.currentValue);
			var area = this._matchPredefinedArea();
			this.selectedArea = area || this.areas[0];
		}
	}
	onAreaChanged(event){
		this.selectedArea = this.areas[event.target.selectedIndex];
		this.extent = this.selectedArea.extent;
		this.areaChanged.emit(this.extent);
	}
	onExtentInputChanged(event){
		switch(event.target.name){
			case "min_lng":
				this.min_lng = event.target.value;
				break;
			case "min_lat":
				this.min_lat = event.target.value;
				break;
			case "max_lng":
				this.max_lng = event.target.value;
				break;
			case "max_lat":
				this.max_lat = event.target.value;
		}
		var area = this._matchPredefinedArea();
		this.selectedArea = area || this.areas[0]; // nolocation
		if(this.min_lng !== "" && this.min_lat !== "" && this.max_lng !== "" && this.max_lat !== ""
		&& !isNaN(Number(this.min_lng)) && !isNaN(Number(this.min_lat)) && !isNaN(Number(this.max_lng)) && !isNaN(Number(this.max_lat))){
			this.extent = [Number(this.min_lng), Number(this.min_lat), Number(this.max_lng), Number(this.max_lat)];
			this.areaChanged.emit(this.extent);
		}
	}
	onClearArea(){
		this.extent = null;
		this.areaChanged.emit(this.extent);
	}
	private _setAreaInput(extent:number[]){
		if(extent){
			this.min_lng = String(extent[0]);
			this.min_lat = String(extent[1]);
			this.max_lng = String(extent[2]);
			this.max_lat = String(extent[3]);
		}else{
			this.min_lng = this.min_lat = this.max_lng = this.max_lat = "";
		}
	}
	private _matchPredefinedArea():MapArea{
		for(var i=1; i<this.areas.length; i++){ // Start from 1 because the first area is nolocation
			var area = this.areas[i];
			if(this.min_lng === String(area.extent[0])
			&& this.min_lat === String(area.extent[1])
			&& this.max_lng === String(area.extent[2])
			&& this.max_lat === String(area.extent[3])){
				return area;
			}
		}
	}
}
