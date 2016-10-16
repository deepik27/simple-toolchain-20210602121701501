/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AEGGZJ&popup=y&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
import { Component, OnInit } from '@angular/core';

import { ChartItemComponent } from './chart-item.component'
import { CarListComponent } from './car-list.component'
import { CarStatusDataService } from './car-status-data.service';

@Component({
  moduleId: module.id,
  selector: 'fmdash-car-status-summary',
  templateUrl: 'car-status-summary.component.html',
  providers: [CarStatusDataService],
})
export class CarStatusSummaryComponent implements OnInit {
  private selectedGroupingProp: string;
  private selectedGroupingLabel: string;

  constructor() {  }

  ngOnInit() {}

  chartSelectionChanged($event) {
    this.selectedGroupingProp = $event.key;
    this.selectedGroupingLabel = $event.value;
  }
}
