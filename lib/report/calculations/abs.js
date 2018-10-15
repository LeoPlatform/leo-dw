module.exports = function (options) {
	this.fieldWrap(function (prev) {
		return "abs(" + prev() + ")";
	});

	this.setField.wrap((prev, field, tables, fieldLookup) => {
		prev(field, tables, fieldLookup);
		this.outColumn.label = "ABS " + this.outColumn.label;
		return this;
	});

};