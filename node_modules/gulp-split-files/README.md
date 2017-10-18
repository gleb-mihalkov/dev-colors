# gulp-split-files
A gulp plugin for manually splitting a set of files into even more files.

## Use

**superMegaBigCss.css content:**
```css
 [lots of css stuff]
 /*split*/
 [lots more css stuff]
 /*split*/
 [even more css stuff]
```

**In your gulpfile:**
```javascript
var gulp = require("gulp"),
    splitFiles = require("gulp-split-files");

    gulp.task("split", function () {
    	return gulp.src("superMegaBigCss.css")
    		.pipe(splitFiles())
    		.pipe(gulp.dest("path/to/dest"));
    });
```

This will produce three files:
* superMegaBigCss-0.css
* superMegaBigCss-1.css
* superMegaBigCss-2.css


## Name the new files
```css
 /*splitfilename=first.css*/
 [lots of css stuff]
 /*split*/
 /*splitfilename=second.css*/
 [lots more css stuff]
```

This will produce two files:
* first.css
* second.css

```css
/*splitfilename=first.css*/
[lots of css stuff]
 /*split*/
 [lots more css stuff]
 /*split*/
 /*splitfilename=third.css*/
 [even more css stuff]
```

This will produce three files:
* first.css
* superMegaBigCss-1.css
* third.css
