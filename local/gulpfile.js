'use strict';

const config = {
  dst: './templates/main',
  src: './templates/main'
};

const gulp = require('gulp');
const Path = require('path');
const plumber = require('gulp-plumber-notifier');
const rename = require('gulp-rename');
const watch = require('gulp-watch');
const PrettyError = require('pretty-error');

const stylus = require('gulp-stylus');
const autoprefixer = require('gulp-autoprefixer');
const beautifyCss = require('gulp-cssbeautify');
const minCss = require('gulp-cssnano');
const base64 = require('gulp-css-base64');
const cssimport = require('gulp-cssimport');

const include = require('gulp-include');
const minJs = require('gulp-uglify');

const errors = new PrettyError();
errors.skipNodeFiles();
errors.start();

function fileSrc(file) {
  return gulp.src(Path.resolve(config.src, file));
}

function dst(folder) {
  let dest = folder ? Path.resolve(config.dst, folder) : config.dst;
  return gulp.dest(dest);
}

gulp.task('build:css', () => {
  return fileSrc('index.styl')
    .pipe(plumber())
    .pipe(stylus())
    .pipe(cssimport())
    .pipe(base64())
    .pipe(autoprefixer({browsers: ['last 2 versions', 'ie >= 11'], cascade: false}))
    .pipe(beautifyCss({indent: '  ', openbrace: 'separate-line'}))
    .pipe(rename('style.css'))
    .pipe(dst())
    .pipe(minCss({discardComments: {removeAll: true}}))
    .pipe(rename('style.min.css'))
    .pipe(dst());
});

gulp.task('build:js', () => {
  return fileSrc('index.js')
    .pipe(plumber())
    .pipe(include())
    .pipe(rename('script.js'))
    .pipe(dst())
    .pipe(minJs())
    .pipe(rename('script.min.js'))
    .pipe(dst());
});

gulp.task('build', [
  'build:css',
  'build:js'
]);

gulp.task('watch', () => {
  let css = Path.resolve(config.src, '**/*.styl');
  let js = Path.resolve(config.src, '**/*.js');
  watch(css, () => gulp.start('build:css'));
  watch(js, () => gulp.start('build:js'));
});

gulp.task('default', [
  'build',
  'watch'
]);