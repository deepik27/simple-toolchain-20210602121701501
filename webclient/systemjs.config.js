/**
 * System configuration for Angular 2 samples
 * Adjust as necessary for your application needs.
 */
(function(global) {
  var bundles = {
    'c3': ['d3'],
    // 'bootstrap': ['jquery'],
  }
  // map tells the System loader where to look for things
  var map = {
    'app':                        'app', // 'dist',
    '@angular':                   'node_modules/@angular',
//    'angular2-in-memory-web-api': 'node_modules/angular2-in-memory-web-api',
    'rxjs':                       'node_modules/rxjs',
    // additional libraries
    'openlayers':                 'https://cdnjs.cloudflare.com/ajax/libs/ol3/3.5.0/ol.js',
    'd3':                         'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.7/d3.js',
    'c3':                         'https://cdnjs.cloudflare.com/ajax/libs/c3/0.4.9/c3.js',
    'moment':                     'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.12.0/moment.min.js',
    'underscore':                 'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.2/underscore-min.js',
    // 'jquery':                     'https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js',
    // 'bootstrap':                  'https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/js/bootstrap.min.js',
  };
  // define metadata for Subresource Integrity
  var meta = {
    'https://cdnjs.cloudflare.com/ajax/libs/ol3/3.5.0/ol.js': {
      scriptLoad: true,
      integrity: 'sha256-ybQnvDcVTLFnbUmkq5oSsJ62Pij7mhFrdeUtnyYJnTk=',
      crossOrigin: 'anonymous'
    },
    'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.7/d3.js': {
      scriptLoad: true,
      integrity: 'sha256-M1yTN9xSjkvhn9W6lr/vC4z1haMXf86JEpLWT4gosd0=',
      crossOrigin: 'anonymous'
    },
    'https://cdnjs.cloudflare.com/ajax/libs/c3/0.4.9/c3.js': {
      scriptLoad: true,
      integrity: 'sha256-uWSq0mObZ65yexU+Ywtj0MwpYPlLo85oJy+Mt4l0UcY=',
      crossOrigin: 'anonymous'
    },
    'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.12.0/moment.min.js': {
      scriptLoad: true,
      integrity: 'sha256-QTFbCMKzMsKmdagXusjKHMZIwzEJtpnGYJ/v/ArHklQ=',
      crossOrigin: 'anonymous'
    },
    'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.2/underscore-min.js': {
      scriptLoad: true,
      integrity: 'sha256-LeGeo7heAyOd2cvjDZVFobWnzi8GYv6urz0tCIF56lw=',
      crossOrigin: 'anonymous'
    },
    // 'https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js': {
    //   scriptLoad: true,
    //   integrity: 'sha256-I1nTg78tSrZev3kjvfdM5A5Ak/blglGzlaZANLPDl3I=',
    //   crossOrigin: 'anonymous'
    // },
    // 'https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/js/bootstrap.min.js': {
    //   scriptLoad: true,
    //   integrity: 'sha256-KXn5puMvxCw+dAYznun+drMdG1IFl3agK0p/pqT9KAo=',
    //   crossOrigin: 'anonymous'
    // },
  };
  // packages tells the System loader how to load when no filename and/or no extension
  var packages = {
    'app':                        { main: 'main.js',  defaultExtension: 'js' },
    'rxjs':                       { defaultExtension: 'js' },
//    'angular2-in-memory-web-api': { main: 'index.js', defaultExtension: 'js' },
  };
  var ngPackageNames = [
    'common',
    'compiler',
    'core',
    'forms',
    'http',
    'platform-browser',
    'platform-browser-dynamic',
    'router',
    'router-deprecated',
    'upgrade',
  ];
  // Individual files (~300 requests):
  function packIndex(pkgName) {
    packages['@angular/'+pkgName] = { main: 'index.js', defaultExtension: 'js' };
  }
  // Bundled (~40 requests):
  function packUmd(pkgName) {
    packages['@angular/'+pkgName] = { main: '/' + pkgName + '.umd.js', defaultExtension: 'js' }; // for >= rc.4, replace '/' with '/bundles/'
  }
  // Most environments should use UMD; some (Karma) need the individual index files
  var setPackageConfig = System.packageWithIndex ? packIndex : packUmd;
  // Add package entries for angular packages
  ngPackageNames.forEach(setPackageConfig);
  var config = {
    map: map,
    meta: meta,
    packages: packages
  };
  System.config(config);
})(this);
