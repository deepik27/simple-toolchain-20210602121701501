/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * https://github.com/ibm-watson-iot/iota-starter-server-fm-saas/blob/master/LICENSE
 *
 * You may not use this file except in compliance with the license.
 */
/*
 * User router
 * - to use shared authentication middleware function:
 *    '''var authenticate = require('./auth.js').authenticate;
 *       router.get(path, authenticate, <handler>);```
 */

/**
 * Export routers
 */
module.exports = [
  require('./asset.js'),
  require('./auth.js'),
  require('./event.js'),
  require('./poi.js'),
  require('./geofence.js'),
  require('./analysis.js'),
  require('./monitor.js'),
  require('./simulator.js')
];