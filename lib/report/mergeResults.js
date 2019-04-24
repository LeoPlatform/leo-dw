var crypto = require("crypto");

var extraOffset = 1;
var hashColumn = 0;

function mergeResults(results, repeatableSha1s, repeatAcross) {
	var out = [];
	// Use the last one, because it has the full row size and we don't need to
	// update sizes...I think?????
	var lastFactResult = results[results.length - 1];
	var hashRowMapping = {};
	if (lastFactResult === undefined) {
		lastFactResult = [];
	}
	for (let i = 0; i < lastFactResult.length; i++) {
		let row = lastFactResult[i];
		hashRowMapping[row[hashColumn]] = i;
		out.push(row.slice(extraOffset));
	}
	for (let x = 0; x < results.length - 1; x++) { // minus one because we
		// already have the last one
		var resultSet = results[x];
		for (let i = 0; i < resultSet.length; i++) {
			let row = resultSet[i];
			let hash = row[hashColumn];
			if (hash in hashRowMapping) { // Need to do a merge
				var existingRow = out[hashRowMapping[hash]];

				for (var j = extraOffset; j < row.length; j++) {
					var value = row[j];
					if (value !== null && value !== undefined) {
						existingRow[j - 1] = value;
					}
				}
			} else {
				hashRowMapping[row[hashColumn]] = x;
				out.push(row.slice(extraOffset));
			}
		}
	}
	if (repeatAcross.length) {
		var padArray = lastFactResult[0] ? Array.apply(null, Array(lastFactResult[0].length - repeatableSha1s[Object.keys(repeatableSha1s)[0]].length - extraOffset)).map(Number.prototype.valueOf, 0) : [];
		for (var string in repeatableSha1s) {
			var columns = repeatableSha1s[string];
			for (let j = 0; j < repeatAcross.length; j++) {
				var n = repeatAcross[j];
				for (var x = 0; x < n.length; x++) {
					if (n[x] !== undefined) {
						columns[x] = n[x];
					}
				}
				let hash = crypto.createHash('sha1').update(columns.join('')).digest('base64');
				if (!(hash in hashRowMapping)) {
					out.push(columns.slice(0).concat(padArray));
				}
			}
		}
	}
	return out;
}
module.exports = mergeResults;
