var util = require('util');
var Transform = require('stream').Transform;
util.inherits(Binlog, Transform);

var headerBytes = 22;

module.exports = function(file, options) {
  return new Binlog(file, options);
};

function Binlog(file, options) {
  if (!(this instanceof Binlog)) return new Binlog(file, options);
  Transform.call(this, options);

  var prevBuffer = new Buffer(0);
  var headers;
  this._transform = function(chunk, encoding, done) {
    var buffer = Buffer.concat([ prevBuffer, chunk ]);
    var bufferOffset = 0;
    var recordEnd = 0;
    var obj = null;
    while (bufferOffset + headerBytes < buffer.length) {
      headers = buffer.slice(bufferOffset, bufferOffset + headerBytes);
      recordEnd = bufferOffset + headers.readUInt32LE(12);
      if (recordEnd <= buffer.length) {
        var details = {
          time : headers.readDoubleLE(0),
          serverId : headers.readUInt32LE(8),
          eventLength : headers.readUInt32LE(12),
          startPosition : headers.readUInt32LE(16) - headers.readUInt32LE(12),
          nextPosition : headers.readUInt32LE(16),
          flags : headers.readUInt16LE(20),
          file : file
        };
        this.emit('header', details);
        this.push(buffer.toString('utf-8', bufferOffset + headerBytes, recordEnd));
        bufferOffset = recordEnd;
      } else {
        break;
      }
    }
    prevBuffer = new Buffer(buffer.length - bufferOffset);
    buffer.copy(prevBuffer, 0, bufferOffset);
    done();
  };
}