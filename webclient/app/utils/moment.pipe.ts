import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({name: 'moment'})
export class MomentPipe implements PipeTransform{
	transform(date:any, format:string){
		var now = date ? moment(date) : moment();
		return format ? now.format(format) : now.format();
	}
}