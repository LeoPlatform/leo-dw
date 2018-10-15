module.exports = function (fieldCalc, options) {
	this.fieldWrap(function (prev) {
		return "min(" + prev() + ")";
	});

	this.setField.wrap((prev, field, tables, fieldLookup) => {
		prev(field, tables, fieldLookup);

		this.outColumn.label = "Minimum " + this.outColumn.label;
		return this;
	});
};