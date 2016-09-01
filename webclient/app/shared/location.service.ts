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
    {id: 'vegas1'  , name: 'MGM Grand, Las Vegas', center:  [-115.165571,36.102118]},
    {id: 'vegas2' ,name: 'Mandalay Bay, Las Vegas', center:  [-115.176670,36.090754]},
    {id: 'munch1'  ,name: 'Hellabrunn Zoo, Munich', center:  [11.55848,48.0993]},
    {id: 'munch2'  ,name: 'Nymphenburg Palace, Munich', center:  [11.553583,48.176656]},
    {id: 'tokyo1' ,name: 'Tokyo, Japan', center:  [139.731992,35.709026]},
  ];

  //
  // Region is wider than area, e.g. to track the number of cars
  //
  regions: MapArea[] = [
    {id: 'vegas'  ,name: 'Las Vegas', extent: [-116.26637642089848,35.86905016413695,-114.00868599121098,36.423521308323046]},
    {id: "munich" ,name: 'Munich, Germany', extent: [10.982384418945298,48.01255711693946,12.111229633789048,48.24171763772631]},
    {id: 'tokyo'  ,name: 'Tokyo, Japan', extent:  [139.03856214008624,35.53126066670448,140.16740735493002,35.81016922341598]},
    {id: "toronto",name: 'Toronto, Canada', extent: [-80.69297429492181,43.57305259767264,-78.43528386523431,44.06846938917488]},
  ];

  getAreas():MapArea[]{
    return this.areas;
  }
  getRegions():MapArea[]{
    return this.regions;
  }
}

export interface MapArea {
  id: string;
  name: string;
  center?: number[],
  extent?: number[]
};
