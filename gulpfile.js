'use strict';
/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
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

var gulp = require('gulp'),
  cleanCSS = require('gulp-clean-css'),
  stylesheetsDir = 'public/stylesheets/';

gulp.task('minify-css:watch', function () {
  gulp.watch(stylesheetsDir + "style.css", ['minify-css']);
});

gulp.task('minify-css', function () {
  return gulp.src(stylesheetsDir + "style.css")
    .pipe(cleanCSS({ debug: true }, function (details) {
      console.log(details.name + ': ' + details.stats.originalSize);
      console.log(details.name + ': ' + details.stats.minifiedSize);
    }))
    .pipe(gulp.dest(stylesheetsDir + "minified"));
});

gulp.task('default', ['minify-css']);
gulp.task('watch', ['minify-css:watch']);