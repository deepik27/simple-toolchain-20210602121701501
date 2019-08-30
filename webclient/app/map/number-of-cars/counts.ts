/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
export interface Counts {
  _region: any;

  all?: number;
  all_anbiguous: boolean;
  in_use?: number;
  available?: number;
  unavailable?: number;

  troubled?: number;
  critical?: number;
}
