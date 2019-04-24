var gulp = require("gulp");
var browserify = require('browserify');
var babelify = require('babelify');
var watchify = require('watchify');
var assign = require('lodash.assign');
var source = require('vinyl-source-stream');
var gutil = require('gulp-util');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var replace = require('gulp-replace');
var util = require("util");
var fs = require('fs');
var ejs = require("gulp-ejs");
var less = require("gulp-less");

var version = "huh?";
var cdn = "huh?";

gulp.task('less', [], function () {

	var builds = [];

	//builds.push(gulp.src(['ui/css/dashboard.less', 'ui/dashboard/fixed-data-table.css', "ui/css/fontello-codes.css", "ui/css/fontello-load.css"])
	builds.push(gulp.src(['ui/css/LeoOEM.less'])
		.pipe(replace(/__VERSION__/g, version))
		.pipe(less().on('error', gutil.log))
		.pipe(concat('leo-oem.css'))
		.pipe(gulp.dest('./static/css'))
	);

	builds.push(gulp.src('./ui/css/main.less').pipe(less()).on('error', function (err) {
		console.log(err.message);
	}).pipe(concat("main.css")).pipe(gulp.dest('./static/css/')));

	builds.push(gulp.src(["./ui/css/fontello-load.css", "./ui/css/fontello-codes.css", './ui/css/internal.less']).pipe(less()).on('error', function (err) {
		console.log(err.message);
	}).pipe(concat('internal.css')).pipe(replace(/__VERSION__/g, version)).pipe(gulp.dest('./static/css/')));

	builds.push(gulp.src('./ui/css/charts.less').pipe(less()).on('error', function (err) {
		console.log(err.message);
	}).pipe(gulp.dest('./static/css/')));

	builds.push(gulp.src('./ui/css/portals.less').pipe(less()).on('error', function (err) {
		console.log(err.message);
	}).pipe(gulp.dest('./static/css/')));

	return builds;
});

gulp.task('views', [], function () {
	return gulp.src(['./views_ejs/**/*.ejs', '!./views_ejs/partials/**'])
		.pipe(ejs({}).on('error', gutil.log))
		.pipe(rename({
			extname: ""
		}))
		.pipe(gulp.dest('./views'));
});

var builders = {
	main: assign({}, watchify.args, {
		entries: ['./ui/js/views/main.jsx'],
		transform: [babelify],
		renameTo: './static/js/leo.js'
	}),
	charts: {
		entries: ['./ui/js/views/charts.jsx'],
		transform: [babelify],
		renameTo: './static/js/charts.js'
	},
	portals: {
		entries: ['./ui/js/views/portals.jsx'],
		transform: [babelify],
		standalone: 'LEO',
		renameTo: './static/js/portals.js'
	}

};

gulp.task('js', [], function () {
	Object.keys(builders).forEach(function (builder) {
		var opts = builders[builder];
		bundle(browserify(opts), opts.renameTo, builder);
	});
});
gulp.task('watch', ['less', 'views'], function () {
	Object.keys(builders).forEach(function (builder) {
		var opts = builders[builder];
		var b = watchify(browserify(opts));
		b.on('update', function () {
			console.log("got an update");
			bundle(b, opts.renameTo, builder);
		});
		b.on('log', function (log) {
			gutil.log("Finished '" + gutil.colors.green(builder) + "'", log);
		});
		bundle(b, opts.renameTo, builder);
	});
	gulp.watch(['./ui/css/*.less', './ui/css/*.css'], ['less']);
	gulp.watch(['./views_ejs/**/*.ejs'], ['views']);
});

gulp.task('common', [], function () {
	return browserify({
		transform: [babelify]
	})
		.require("react")
		.bundle().pipe(source('./ui/js/common.jsx'))
		.pipe(rename('/static/js/common.js'))
		.pipe(gulp.dest('./'));
});

gulp.task('build', ['less', 'js']);
gulp.task('default', ['watch']);

function bundle(b, renameTo, builder) {
	gutil.log("Starting '" + gutil.colors.green(builder) + "...");
	return b.transform('browserify-versionify', {
		placeholder: '__VERSION__',
		version: version,
	}).transform('browserify-versionify', {
		placeholder: '__CDN__',
		version: cdn,
	}).bundle().on('error', function (err) {
		gutil.log(gutil.colors.red('Error: ' + builder), err.message);
	}).on('log', function (err) {
		console.log(err);
	}).pipe(source('./ui/js/leo-oem.js')).pipe(rename(renameTo)).pipe(gulp.dest('./'));
}
