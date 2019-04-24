let i = 0;
let lookupCache = {};
let operators = {
	"=": "=",
	">": ">",
	"<": "<",
	">=": ">=",
	"<=": "<="
};
module.exports = function (options) {
	this.isGrouping = true;
	this.factTable = null;
	this.type = "attribute";

	let selfAlias = this.requiredTables[0].alias;
	let selfColumn = this.column;
	let extra;
	let append = true;
	let tableNdx = 0;
	let columnNdx = 1;
	let selectNdx = 2;
	if (options[0] && (extra = options[0].match(/^(~+)(.*)/))) {
		append = extra[1].length == 1;
		extra = extra[2];
		tableNdx++;
		columnNdx++;
		selectNdx++;
	}

	let cacheId = `${options[tableNdx]}.${options[columnNdx]}=${selfAlias}.${selfColumn}|${append?'a':'p'}.${extra}`;

	if (selectNdx + 1 <= options.length && !(cacheId in lookupCache)) {
		lookupCache[cacheId] = ('lookup_' + i++);
	}
	let alias = lookupCache[cacheId] || ('lookup_' + i++);

	this.addRequiredTables(this.requiredTables);
	this.addRequiredTable({
		table: options[tableNdx],
		alias: alias,
		on: (util) => {
			let where = "";
			let ndx = selectNdx + 1;
			let loops = 0;
			let joinId = `${util.escapeId(selfAlias)}.${util.escapeId(selfColumn)}`;
			if (extra) {
				if (append) {
					joinId = `CONCAT(${joinId}, ${util.escapeValue(extra)})`;
				} else {
					joinId = `CONCAT(${util.escapeValue(extra)}, ${joinId})`;
				}
			}
			while (options[ndx] && options[ndx + 1] && loops < 10) {
				loops++;
				let operator = operators[options[ndx + 1]];
				let offset = (operator ? 1 : 0);
				where += ` and ${util.escapeId(alias)}.${util.escapeId(options[ndx])} ${operator || "="} ${util.escapeValue(options[ndx + 1 + offset])} `;
				ndx += 2 + offset;
			}
			return `${util.escapeId(alias)}.${util.escapeId(options[columnNdx])} = ${joinId} ${where} `;
		},
		joinTable: null
	}, true);

	let getField = function (prev, util) {
		let fields = options[selectNdx].split("~");
		if (fields[1]) {
			let v = fields.map(f => {
				let t = f.match(/^\$(.*)/);
				let a = alias;
				if (t) {
					f = t[1];
					a = selfAlias;
				}
				return `${util.escapeId(a)}.${util.escapeId(f)}`;
			}).join(", ");
			return `COALESCE(${v})`;
		} else {
			return `${util.escapeId(alias)}.${util.escapeId(fields[0])}`;
		}
	};
	this.mysqlField.wrap(function (prev) {
		return getField(prev, this.mysql);
	});
	this.redshiftField.wrap(function (prev) {
		return getField(prev, this.redshift);
	});
	this.setField.wrap((prev, field, tables, fieldLookup) => {
		prev(field, tables, fieldLookup);
		this.outColumn.label = options[selectNdx].split("~")[0];
		let field2 = fieldLookup[`${options[tableNdx]}.${this.outColumn.label}`];

		if (field2) {
			this.type = field2.type || this.type;
			this.dtype = field2.dtype || this.dtype;

			this.outColumn.label = field2.label || this.outColumn.label;
			if (field2.sort) {
				this.sort = field2.sort;
			} else {
				this.sort = {
					type: 'string'
				};
			}
			this.outColumn.sort = this.sort;
			if (field2.format) {
				this.format = field2.format;
			} else {
				this.format = 'string';
			}
			this.outColumn.format = this.format;
		}

		return this;
	});
};
