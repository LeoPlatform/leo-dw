var fs = require('fs');
var config = require("../../config.json");
var solr = require("../solr.js");
var filename = "/tmp/solrlog";

var isSuccessful = true;
module.exports = Object.freeze({
  runBatch : function(updates, callback) {
    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);
    }
    var stream = fs.createWriteStream(filename);
    stream.write("[");
    var prefix = "";
    for (var i = 0; i < updates.length; i++) {
      if (updates[i].solr == undefined) continue;
      stream.write(prefix + JSON.stringify(updates[i].solr))
      prefix = ",\n";
    }
    stream.end("]", function() {
      solr.index(filename, callback);
    });
  }
});