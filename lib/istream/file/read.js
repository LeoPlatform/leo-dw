var fs = require('fs');
var path = require('path');
var chokidar = require('chokidar');
var binlog = require('./binlog.js');

module.exports = function(file_location, offset, options) {
  options = options || {};
  var recordSliceSize = options.records || 5000;
  var bufferSize = recordSliceSize * 4;

  var filePath = path.parse(file_location);
  var filePrefix = filePath.dir + "/" + filePath.name.split(".")[0];
  var fileSuffix = filePath.ext;
  var globPath = filePrefix + ".*" + filePath.ext;
  var fileNum = parseInt(path.basename(file_location).split(".")[1]);
  var fileHandle = false;
  var events = 0;
  var existingFiles = {};
  existingFiles[fileNum] = {
    fileOffset : offset
  };
  var records = [];

  var currentReadStream = null;
  var hasFile = false;

  var that = {};
  that.get_batch = function(withHeaders) {
    if (currentReadStream && currentReadStream.isPaused()) {
      currentReadStream.resume();
      console.error("resuming read stream");
    }
    if (withHeaders) {
      return records.splice(0, recordSliceSize);
    } else {
      return records.splice(0, recordSliceSize).map(function(record) {
        return record.data;
      });
    }
  };
  var headers = [];
  var datas = [];
  function processFile(number) {
    fileNum = number;
    var file = filePrefix + "." + String('000000' + fileNum).slice(-6) + fileSuffix;
    hasFile = true;
    var header = null;
    var obj = null;
    currentReadStream = fs.createReadStream(file, {
      start : Math.max(existingFiles[fileNum].fileOffset, 3),
      end : existingFiles[fileNum].size,
    }).pipe(binlog(file)).on("header", function(h) {
      header = h;
      existingFiles[fileNum].fileOffset = header.nextPosition;
    }).on("data", function(data) {
      try {
        obj = JSON.parse(data);
      } catch (e) {
        console.error(e, header.startPosition, data.toString('utf-8'), header);
        process.exit();
      }
      records.push({
        headers : header,
        data : obj
      });
      if (records.length >= bufferSize) {
        currentReadStream.pause();
        console.error("pausing read stream: ", records.length);
      }
    }).on("end", function() {
      currentReadStream = null;
      setTimeout(function() {
        var stats = fs.statSync(file);
        existingFiles[fileNum].size = stats.size;
        hasFile = false;
        shouldMove();
      }, 200);
    }).on('error', function(err) {
      console.error(err);
      this.end();
    });
  }

  function shouldMove() {
    if (!hasFile) {
      if (existingFiles[fileNum].fileOffset < existingFiles[fileNum].size) {
        processFile(fileNum);
      } else if (existingFiles[fileNum].fileOffset == existingFiles[fileNum].size && ((fileNum + 1) in existingFiles) && existingFiles[fileNum + 1].size > 0) {
        console.error("Moving to next File", fileNum, existingFiles[fileNum].fileOffset, existingFiles[fileNum].size);
        delete existingFiles[fileNum];// Don't need this one anymore in memory
        processFile(fileNum + 1);
      }
    }
  }

  chokidar.watch(globPath, {
    depth : 1,
    persistent : true,
    alwaysStat : true,
    usePolling : true,
    interval : 100
  }).on('all', function(event, file, fsStat) {
    if (event == "add" || event == "change") {
      var number = parseInt(path.basename(file).split(".")[1]);
      var newFile = filePrefix + "." + String('000000' + number).slice(-6) + fileSuffix;
      if (number >= fileNum) {
        if (!(number in existingFiles)) {
          existingFiles[number] = {
            fileOffset : 0,
            size : fsStat.size
          };
        } else {
          existingFiles[number].size = fsStat.size;
        }
        shouldMove();
      }
    }
  });

  return that;
};
