var kcl = require('aws-kcl');
var fs = require('fs');

var entities = [];
var checkpointer = function() {
};
var sequenceNumber = false;
// Garbage can just be null, it's only there to keep the api consistent between different istream readers. It's named appropriately.
function init(garbage, callback) {
	var logSuccess = true;

	var recordProcessor = {
		initialize : function(initializeInput, completeCallback) {
			completeCallback();
		},
		processRecords : function(processRecordsInput, completeCallback) {
			var sequenceNumber;
			if (!processRecordsInput || !processRecordsInput.records) {
				// Empty group
				completeCallback();
				return;
			}
			checkpointer = processRecordsInput.checkpointer;
			var records = processRecordsInput.records;
			var callback_when_ready = function() {
				checkpointer = function() {
					if (entities.length == 0) {
						checkpointer = function() {
						};
						processRecordsInput.checkpointer.checkpoint(sequenceNumber, function(err, checkpointedSequenceNumber) {
							completeCallback();
						});
					}
				};
			};
			for (var i = 0; i < records.length; i++) {
				var myrecord = JSON.parse(new Buffer(records[i].data, 'base64').toString());
				sequenceNumber = records[i].sequenceNumber;
				entities.push(myrecord);
			}

			callback_when_ready();
		},
		shutdown : function(shutdownInput, completeCallback) {
			completeCallback();
		}
	};
	kcl(recordProcessor).run();
	process.nextTick(callback);
}

function get_batch() {
	checkpointer();
	var outgoing = entities.splice(0, 5000);
	if (outgoing.length == 0) return outgoing;
	return outgoing;
}

module.exports = {
	init : init,
	get_batch : get_batch,
	get_count : function() {
		return entities.length;
	}
};
