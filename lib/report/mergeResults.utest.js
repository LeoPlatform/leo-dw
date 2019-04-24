require("chai").should();
const { assert } = require("chai");
const mergeResults = require('./mergeResults');

describe("mergeResults", () => {
	it('merges results properly', () => {
		const results = [[["xGfhaf7D1TQvscO2e++gWirYY0M=",1000005690,4]],[["xGfhaf7D1TQvscO2e++gWirYY0M=",1000005690,null,4]],[]];
		const res = mergeResults(results, { '1000005690': [ 1000005690 ] }, []);
		assert.deepEqual(res, [[ 1000005690, 4, 4 ]]);
	});
	it('merges results properly', () => {
		const results = [[["xGfhaf7D1TQvscO2e++gWirYY0M=",1000005690,4]],[["xGfhaf7D1TQvscO2e++gWirYY0M=",1000005690,null,4]]];
		const res = mergeResults(results, { '1000005690': [ 1000005690 ] }, []);
		assert.deepEqual(res, [[ 1000005690, 4, 4 ]]);
	});
	it('merges results properly', () => {
		const results = [[["2jmj7l5rSw0yVb/vlWAYkK/YBwk=",4]],[["2jmj7l5rSw0yVb/vlWAYkK/YBwk=",null,4]],[["2jmj7l5rSw0yVb/vlWAYkK/YBwk=",null,null,0]]];
		const res = mergeResults(results, { '': [] }, []);
		assert.deepEqual(res, [[ 4, 4, 0 ]]);
	});
	it('merges results properly', () => {
		const results = [[["xGfhaf7D1TQvscO2e++gWirYY0M=",1000005690,4]],[]];
		const res = mergeResults(results, { '1000005690': [ 1000005690 ] }, []);
		assert.deepEqual(res, [[ 1000005690, 4 ]]);
	});
});
