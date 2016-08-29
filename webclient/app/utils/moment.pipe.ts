import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({name: 'moment'})
export class MomentPipe implements PipeTransform{
	transform(date:any, format:string){
		var _date = date ? moment(date) : moment();
		return format ? _date.format(format) : _date.format();
	}
}