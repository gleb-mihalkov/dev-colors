/*jslint node: true */

"use strict";

var gulp = require("gulp"),
    cccp = require("gulp-cccp"),

    cccpConfig = {
        platoDir: "./platoReport",
        checkFixSrc: [
            "**/*.js",
            "**/*.json",
            "!node_modules/**",
            "!platoReport/**"
        ],
        complexityCheck: [
            "index.js",
            "test/**/*.js"
        ]
    };

cccp(cccpConfig);

gulp.task("default", ["cccp"]);