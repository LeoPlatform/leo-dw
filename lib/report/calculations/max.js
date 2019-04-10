module.exports = function (options) {
	this.fieldWrap(function (prev) {
		return "max(" + prev() + ")";
	});

	this.setField.wrap((prev, field, tables, fieldLookup) => {
		prev(field, tables, fieldLookup);

		this.outColumn.label = "Maximum " + this.outColumn.label;
		return this;
	});
};
