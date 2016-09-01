import { Component, Input, Output, EventEmitter } from '@angular/core';
import { LocationService, MapArea } from './location.service';

@Component({
	moduleId: module.id,
	selector: 'area-select',
	templateUrl: 'area-select.component.html',
	providers: [LocationService],
})

export class AreaSelectComponent{
	@Input() extent: number[];
	@Input() DEBUG = false;
	@Output() areaChanged = new EventEmitter<number[]>();
	min_lng: string;
	min_lat: string;
	max_lng: string;
	max_lat: string;
	selectedArea: MapArea;
	areas: MapArea[];

	constructor(private locationService: LocationService) {
		this.areas = [{id: "nolocation", name: ""}].concat(locationService.getRegions());
		this.min_lat = this.min_lng = this.max_lat = this.max_lng = "";
	}

	onAreaChanged(event){
		this.selectedArea = this.areas[event.target.selectedIndex];
		if(this.selectedArea.extent){
			this.min_lng = String(this.selectedArea.extent[0]);
			this.min_lat = String(this.selectedArea.extent[1]);
			this.max_lng = String(this.selectedArea.extent[2]);
			this.max_lat = String(this.selectedArea.extent[3]);
			this.extent = this.selectedArea.extent;
		}else{
			this._clearArea();
		}
		this.areaChanged.emit(this.extent);
	}
	onExtentChanged(value){
		// The first area is nolocation
		for(var i=1; i<this.areas.length; i++){
			var area = this.areas[i];
			if(this.min_lng === String(area.extent[0])
			&& this.min_lat === String(area.extent[1])
			&& this.max_lng === String(area.extent[2])
			&& this.max_lat === String(area.extent[3])){
				this.selectedArea = area;
				this.extent = this.selectedArea.extent;
				return;
			}
		}
		this.selectedArea = this.areas[0]; // nolocation
		this.areaChanged.emit(this.extent);
	}
	onClearArea(){
		this._clearArea();
		this.areaChanged.emit(this.extent);
	}
	_clearArea(){
		this.min_lng = this.min_lat = this.max_lng = this.max_lat = "";
		this.extent = null;
	}
}

