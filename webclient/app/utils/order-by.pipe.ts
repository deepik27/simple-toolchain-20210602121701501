import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'orderBy'})
export class OrderByPipe implements PipeTransform{
	transform(array: Array<Object>, key: string, order: boolean){
		array = array || [];
		if(!key){
			return array;
		}
		return array.sort(function(a, b){
			return (order ? -1 : 1)*(<any>(a[key] > b[key]) - <any>(b[key] > a[key]));
		});
	}
}