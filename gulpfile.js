var gulp = require("gulp");
var concat = require('gulp-concat');
var uglify = require("gulp-uglify");
var rename = require("gulp-rename");

gulp.task("compile",function(){
	gulp.src([
			"src/AISplitter.js",
			"src/Movie.js",
			"src/APNGMovie.js",
			"src/XJPEGMovie.js",
			"src/Frame.js"
		])
		.pipe(concat("aisplitter_concat.js"))
		.pipe(uglify({mangle:{
			except: ["AISplitter", "Movie", "Frame"]
		} ,preserveComments:"some"}))
		.pipe(rename("aisplitter.min.js"))
		.pipe(gulp.dest("./"));
});

gulp.task("default", ["compile"]);

gulp.task("watch", function(){
	gulp.start(["compile"]);
	gulp.watch("src/*.js",["compile"]);
});