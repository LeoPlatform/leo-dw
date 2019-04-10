
module.exports = {
	update : function(fields) {
		var newFields = {};

		fields.forEach(field=>{
			var table = newFields[field.ltable] = newFields[field.ltable] || {
				type: "",
				label: "",
				isDimension: "",
				identifier: field.ltable,
				fields: {}
			};

			if (field._id != field.table){
				var type = getType(field.dtype);
				var id = field.column || field.id;
				if (id in table.fields){
					console.log("Overriding duplicate field id", field.table, id);
					//process.exit();
				}
				table.fields[id] = {
					"column": field.column,
					"default": field.default,
					"dimension": field.dimension && ("d_"+field.dimension.toLowerCase().replace(/[^a-z0-9]+/g, "_")),
					"dtype": type.type,
					"format": field.format,
					"hidden": field.hidden || false,
					"id": field.id,
					"label": field.label,
					"len": type.len,
					"sort": field.sort,
					"aliases" : field.aliases,
					"calc" : field.customCalc ? "virtual" : undefined,
					"customCalc": field.customCalc,
					"description": field.customCalc ? field.label : undefined,
					"type": (field.type == "attribute" && field.degenerate) ? "degenerate" : field.type
				};
			} else {
				table.type = field.type == "dimension" ? "dimension" : "fact";
				table.label = field.label;
				table.isDimension = field.type == "dimension";
			}

		});

		return Object.keys(newFields).map(k=>newFields[k]);
	}
};

function getType(type){
	var types = {
		"varchar" : { "regex": /varchar\((\d+)?\)/, "function": function(data){ return {type: "string", len: parseInt(data[1])}; } },
		"int": {"regex" : /int(\(\d+\))?/, "function": function(data){ return {type: "int", len: null}; }}
	};

	for(var key in types){
		var test = types[key];
		var m = type.match(test.regex);
		if (m){
			return test.function(m);
		}
	}
}
