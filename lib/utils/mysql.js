var exec = require('child_process').exec;
var fs = require('fs');
var config = require("../../config.json");

var filename = "/tmp/sqllog";

module.exports = Object.freeze({
	runBatch : function(events, callback) {
		if (fs.existsSync(filename)) {
			fs.unlinkSync(filename);
		}
		var nextEvent = {};

		var stream = fs.createWriteStream(filename);
		stream.write("use auth; SET autocommit=0; START TRANSACTION;\n");
		for (var i = 0; i < events.length; i++) {
			var event = events[i];
			nextEvent = {
				file : event.headers.file,
				position : event.headers.nextPosition
			};
			var sql = event.data.sql;
			if (sql.match(/^\s*alter/i) || sql.match(/^\s*create/i) || sql.match(/^\s*drop /i) || sql.match(/^\s*set /i)) {
				stream.write("replace into system.tracking values('mysql','" + nextEvent.file + "'," + nextEvent.position + ");");
			}
			stream.write(event.data.sql + "\n");
		}
		stream.write("replace into system.tracking values('mysql','" + nextEvent.file + "'," + nextEvent.position + ");");

		stream.end("commit;", function() {
			var mysql = "mysql -u" + config.mysql_user + " -p" + config.mysql_pass;
			if (fs.existsSync("c:\\")) {
				mysql = '"c:\\Program Files\\MySQL\\MySQL Server 5.6\\bin\\mysql"  -q -u' + config.mysql_user + " -p" + config.mysql_pass;
			}
			exec(mysql + ' < ' + filename, function(err, out, stderr) {
				if (!err) {
					callback(null, true);
				} else { // There was an error, figure out what
					callback(stderr);
				}
			});
		});
	}
});
