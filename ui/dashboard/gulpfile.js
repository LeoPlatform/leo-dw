var gulp = require("gulp");
var browserify = require('browserify');
var babelify = require('babelify');
var watchify = require('watchify');
var assign = require('lodash.assign');
var source = require('vinyl-source-stream');
var gutil = require('gulp-util');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var concat = require('gulp-concat');

var less = require('gulp-less');

var util = require("util");
var AWS = require('aws-sdk');
var fs = require("fs");

var liveVersion = ".1.10.34.";
var devVersion = ".1.10.";
var cdn = "https://s3-us-west-2.amazonaws.com/cdnleo";
var version = ".";

gulp.task('less', [], function () {
	//return gulp.src(['../css/dashboard.less', 'fixed-data-table.css', "../css/fontello-codes.css", "../css/fontello-load.css"])
	return gulp.src(['../css/LeoOEM.less'])
		.pipe(replace(/__VERSION__/g, version))
		.pipe(less().on('error', gutil.log))
		.pipe(concat('leo-oem.css'))
		.pipe(gulp.dest('./'));
});
gulp.task('copy', [], function () {
	gulp.src('../../static/css/font/**').pipe(gulp.dest('./font'));
	gulp.src('./leo-oem.js').pipe(gulp.dest('../../static/js/'));
	gulp.src('./leo-oem.css').pipe(gulp.dest('../../static/css/'));
});

var buildOpts = {
	entries: ['./js/dashboard.js'],
	standalone: 'LEO',
	transform: [babelify]
};
var opts = assign({}, watchify.args, buildOpts);
gulp.task('js', function () {
	return bundle(browserify(opts));
});
var b;
gulp.task('watch', ['less', 'copy'], function () {
	cdn = "file:///C:/Steve/Businesses/Event%20System/code/dashboard";
	//cdn = "file:///home/darin/Documents/leo/leo/dashboard/";

	b = watchify(browserify(opts));
	b.on('update', function () {
		bundle(b);
	});
	b.on('log', function (log) {
		gutil.log("Finished '" + gutil.colors.green('build') + "'", log);
	});
	gulp.watch('../css/**', ['less']);
	gulp.watch(['../css/font/**', './leo-oem.js', './leo-oem.css'], ['copy']);

	return bundle(b);
});

gulp.task('default', ['build']);
gulp.task('build', ['js', 'less', 'copy']);

/*
gulp.task('common', [], function() {
  return browserify( {transform : [ babelify ]})
    .require("react/addons")
    .bundle().pipe(source('./js/common.jsx'))
    .pipe(rename('common.js'))
    .pipe(gulp.dest('./'));
});
*/

gulp.task('deploy', ['setDevVersion', 'build', 'putS3']);
gulp.task('deploylive', ['setLiveVersion', 'build', 'putS3']);

gulp.task('putS3', ["build"], function (done) {
	uploadCDNFile('leo-oem' + version + 'js', "./leo-oem.js", false, function () {
		uploadCDNFile('css/leo-oem' + version + 'css', "./leo-oem.css", false, function () {
			uploadCDNFile('font/fontello' + version + 'eot', "../font/fontello.eot", false, function () {
				uploadCDNFile('font/fontello' + version + 'svg', "../font/fontello.svg", false, function () {
					uploadCDNFile('font/fontello' + version + 'ttf', "../font/fontello.ttf", false, function () {
						uploadCDNFile('font/fontello' + version + 'woff', "../font/fontello.woff", false, function () {
							uploadCDNFile('font/fontello' + version + 'woff2', "../font/fontello.woff2", false, function () {
								done();
							});
						});
					});
				});
			});
		});
	});
});

gulp.task('setLiveVersion', [], function () {
	version = liveVersion;
});
gulp.task('setDevVersion', [], function () {
	version = devVersion;
});

var s3 = new AWS.S3({
	params: {
		Bucket: 'cdnleo'
	}
});

function uploadCDNFile(key, file, nocache, callback) {
	var contentType = "application/x-javascript";
	if (file.match(/\.css/)) {
		contentType = "text/css";
	}

	var params = {
		Key: key,
		Body: fs.createReadStream(file),
		ACL: "public-read",
		ContentType: contentType
	};
	if (nocache) {
		params.CacheControl = 'no-store, no-cache, must-revalidate, max-age=0';
		params.Expires = new Date('2001-01-01T06:00:00');
	} else {
		params.CacheControl = 'max-age=315360000';
		params.Expires = new Date('2025-01-01T06:00:00');
	}

	s3.putObject(params, function (err, data) {
		if (err) {
			console.log(err, err.stack); // an error occurred
		} else {
			console.log(data);
			callback(null, data);
		}
	});
}

function bundle(b) {
	gutil.log("Starting '" + gutil.colors.green('build') + "'...");
	//  return b.exclude("react/addons").exclude("react").transform('browserify-versionify', {
	return b.transform('browserify-versionify', {
		placeholder: '__VERSION__',
		version: version,
	}).transform('browserify-versionify', {
		placeholder: '__CDN__',
		version: cdn,
	}).bundle().on('error', function (err) {
		gutil.log(gutil.colors.red('Error: '), err.message);
	}).on('log', function (err) {
		console.log(err);
	}).pipe(source('./js/leo-oem.js')).pipe(rename({
		dirname: ''
	})).pipe(gulp.dest('./')).pipe(gulp.dest('../static/js/'));
}
