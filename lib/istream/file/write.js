var fs = require('fs');
var path = require('path');
var glob = require('glob');
var moment = require('moment');

module.exports = function(file_location, callback) {
  var filePath = path.parse(file_location);
  var filePrefix = filePath.dir + "/" + filePath.name;
  var fileNum = 0;
  var fileSuffix = filePath.ext;
  var globPath = filePrefix + ".*" + fileSuffix;

  var files = glob.sync(globPath).sort(function(a, b) {
    return b.localeCompare(a);
  });
  if (files.length) {
    fileNum = parseInt(path.basename(files[0]).split(".")[1]);
  }
  var streamsToEnd = [];
  var isFlushing = false;
  function flushStreams() {
    if (!isFlushing && streamsToEnd.length) {
      isFlushing = true;
      var s = streamsToEnd.shift();
      console.error("flushing stream ", s.fileNum);
      s.stream.end(function() {
        isFlushing = false;
        console.error("Flushed ", s.fileNum);
        s.nextStream.uncork();
        process.nextTick(flushStreams);
      });
    }
  }

  var writeStream = false;
  var written = false;
  var mybytes = 0;
  function start_new_file() {
    var thisFileNum = fileNum++;
    console.error("Starting new File", fileNum);
    var nextStream = fs.createWriteStream(filePrefix + "." + String('000000' + fileNum).slice(-6) + fileSuffix);
    var previousStream = writeStream;
    if (writeStream) {
      console.error("Going to close a file");
      nextStream.cork();
      streamsToEnd.push({
        stream : previousStream,
        nextStream : nextStream,
        fileNum : fileNum - 1
      });
      flushStreams();
    }
    writeStream = nextStream;
    var headers = new Buffer(3);
    writeStream.write(headers);
    mybytes = 3;
  }
  start_new_file();

  var headerSize = 22;
  return Object.freeze({
    put : function(event, callback) {
      var data = JSON.stringify(event) + "\n";
      var eventLength = Buffer.byteLength(data, 'utf8') + headerSize;
      mybytes += eventLength;

      var headers = new Buffer(22);
      // Time
      headers.writeDoubleLE(new Date().getTime(), 0, false);
      // Server Id?????
      headers.writeUInt32LE(0, 8, false);
      // event length
      headers.writeUInt32LE(eventLength, 12, false);
      // next_position
      headers.writeUInt32LE(mybytes, 16, false);
      // flags
      headers.writeUInt16LE(0, 20, false);
      writeStream.write(headers);
      written = writeStream.write(data, callback);
      if (mybytes > 104857600) start_new_file();
    },
    shouldPause : function(callback) {
      return isFlushing;
    }
  });
};