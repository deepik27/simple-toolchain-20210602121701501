import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({name: 'moment'})
export class MomentPipe implements PipeTransform{
	transform(date:any, format:string){
<<<<<<< Upstream, based on branch 'master' of https://github.ibm.com/Watson-IoT/iota-starter-server-fleetmanagement
		var now = date ? moment(date) : moment();
		return format ? now.format(format) : now.format();
=======
		var _date = date ? moment(date) : moment();
		return format ? _date.format(format) : _date.format();
>>>>>>> 97dde84 Close #10: Alert page cannot be shown on Safari
	}
}