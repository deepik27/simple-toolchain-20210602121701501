/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'orderBy' })
export class OrderByPipe implements PipeTransform {
	transform(array: Array<Object>, key: string, order: boolean) {
		array = array || [];
		if (!key) {
			return array;
		}
		return array.sort(function (a, b) {
			return (order ? -1 : 1) * (<any>(a[key] > b[key]) - <any>(b[key] > a[key]));
		});
	}
}