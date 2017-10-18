'use strict';

const config = {
  dst: './templates/main',
  src: './templates/main'
};

const gulp = require('gulp');
const Path = require('path');
const Fs = require('fs');
const plumber = require('gulp-plumber-notifier');
const rename = require('gulp-rename');
const watch = require('gulp-watch');
const PrettyError = require('pretty-error');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const beautifyCss = require('gulp-cssbeautify');
const minCss = require('gulp-cssnano');
const base64 = require('gulp-css-base64');
const cssimport = require('gulp-cssimport');
const include = require('gulp-include');
const minJs = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');

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
  return fileSrc('index.scss')
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(cssimport())
    .pipe(base64())
    .pipe(autoprefixer({browsers: ['last 2 versions', 'ie >= 11'], cascade: false}))
    .pipe(sourcemaps.write())
    .pipe(rename('style.css'))
    .pipe(dst())
    .pipe(minCss({discardComments: {removeAll: true}}))
    .pipe(rename('style.min.css'))
    .pipe(dst());
});

gulp.task('build:js', () => {
  return fileSrc('index.js')
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(include())
    .pipe(sourcemaps.write())
    .pipe(rename('script.js'))
    .pipe(dst())
    .pipe(minJs())
    .pipe(rename('script.min.js'))
    .pipe(dst());
});

gulp.task('build:php', (done) => {
  let indexFile = Path.resolve(config.src, 'index.php');
  let headerFile = Path.resolve(config.dst, 'header.php');
  let footerFile = Path.resolve(config.dst, 'footer.php');

  Fs.readFile(indexFile, 'utf8', (error, data) => {
    if (error) throw error;

    let parts = data.split('#WORK_AREA#');
    let header = parts[0];
    let footer = parts[1];
    let count = 2;

    let cb = () => {
      if (--count > 0) return;
      done();
    };

    Fs.writeFile(headerFile, header, 'utf8', cb);
    Fs.writeFile(footerFile, footer, 'utf8', cb);
  });
});

gulp.task('build', [
  'build:css',
  'build:js',
  'build:php'
]);

gulp.task('watch', () => {
  let css = Path.resolve(config.src, '**/*.scss');
  let js = Path.resolve(config.src, '**/*.js');
  let php = Path.resolve(config.src, 'index.php');
  watch(php, () => gulp.start('build:php'));
  watch(css, () => gulp.start('build:css'));
  watch(js, () => gulp.start('build:js'));
});

gulp.task('default', [
  'build',
  'watch'
]);