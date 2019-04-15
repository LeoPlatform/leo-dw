module.exports = function (options) {
	this.isGrouping = true;
	this.factTable = null;
	this.type = "attribute";
	this.setField.wrap(function (prev, field, tables, fieldLookup) {
		prev(field, tables, fieldLookup);
		if (field.sort) {
			this.sort = field.sort;
		} else {
			this.sort = {
				type: 'string'
			};
		}
		this.outColumn.sort = this.sort;
		if (field.format) {
			this.format = field.format;
		} else {
			this.format = 'string';
		}

		return this;
	});
};
