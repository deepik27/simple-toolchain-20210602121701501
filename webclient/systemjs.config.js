/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * System configuration for Angular 2
 * Adjust as necessary for your application needs.
 */
(function (global) {
  var bundles = {
    'c3': ['d3'],
    // 'bootstrap': ['jquery'],
  }
  var paths = {
    'npm:': 'node_modules/',
  };
  // map tells the System loader where to look for things
  var map = {
    'app': 'app',
    'rxjs': 'npm:rxjs',

    // angular
    '@angular/core': 'npm:@angular/core/bundles/core.umd.js',
    '@angular/common': 'npm:@angular/common/bundles/common.umd.js',
    '@angular/compiler': 'npm:@angular/compiler/bundles/compiler.umd.js',
    '@angular/platform-browser': 'npm:@angular/platform-browser/bundles/platform-browser.umd.js',
    '@angular/platform-browser-dynamic': 'npm:@angular/platform-browser-dynamic/bundles/platform-browser-dynamic.umd.js',
    '@angular/http': 'npm:@angular/http/bundles/http.umd.js',
    '@angular/router': 'npm:@angular/router/bundles/router.umd.js',
    '@angular/forms': 'npm:@angular/forms/bundles/forms.umd.js',
    //'angular2-in-memory-web-api': 'npm:angular2-in-memory-web-api',

    // additional external libraries
    'openlayers': 'https://cdnjs.cloudflare.com/ajax/libs/ol3/3.18.2/ol.js',
    'd3': 'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.7/d3.js',
    'c3': 'https://cdnjs.cloudflare.com/ajax/libs/c3/0.4.9/c3.js',
    'moment': 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.12.0/moment.min.js',
    'underscore': 'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.2/underscore-min.js',
    // 'jquery':                     'https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js',
    // 'bootstrap':                  'https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/js/bootstrap.min.js',
  };
  // packages tells the System loader how to load when no filename and/or no extension
  var packages = {
    'app': { main: 'main.js', defaultExtension: 'js' },
    'rxjs': { main: 'index.js', defaultExtension: 'js' },
    'rxjs/operators': { main: 'index.js', defaultExtension: 'js' },
    'rxjs/webSocket': { main: 'index.js', defaultExtension: 'js' },
  };
  // define metadata for Subresource Integrity
  var meta = {
    'https://cdnjs.cloudflare.com/ajax/libs/ol3/3.18.2/ol.js': {
      scriptLoad: true,
      integrity: 'sha256-35ctZ5IjfdsiXz703ODpJuj4EdJUiYL45o2kn1NKkaE=',
      crossOrigin: 'anonymous',
      exports: 'ol'
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
      crossOrigin: 'anonymous',
      exports: 'moment'
    },
    'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.2/underscore-min.js': {
      scriptLoad: true,
      integrity: 'sha256-LeGeo7heAyOd2cvjDZVFobWnzi8GYv6urz0tCIF56lw=',
      crossOrigin: 'anonymous',
      exports: '_'
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
  var config = {
    paths: paths,
    map: map,
    meta: meta,
    packages: packages
  };
  System.config(config);
})(this);
