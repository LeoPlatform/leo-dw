/* global $ */
/* global List */

/* jshint curly: false, es5: false, loopfunc: true, forin: false, noempty: false */

// This will be injected by the init method.
var LeoWeb = null;
var Formatter = require("../data/format.js");

var convertRowToMapByIdNotCss = function(columns, rowMap)
{
	var result = {};
	$.each(columns, function(index, column)
	{
		result[column.name] = rowMap[column.cssName];
	});
    
	return result;
};

var convertRowArrayToMapById = function(columns, rowArr)
{
	var result = {};
	$.each(columns, function(index, column)
	{
		result[column.name] = rowArr[index];
	});
    
	return result;
};

var LeoSimpleTable = function(params)
{
	var self = this;
    
	// The ID of the container of the table element itself
	self.id = null;
	self.columns = {};
	self.columnNameMap = null;
	self.columnIdMap = null;
	self.filters = {};
	self.listObj = null;
	self.sortingColumn = null;

	self.setParams = function(p)
	{
		self.id = p.id;
		self.group = p.group;
	};
    
	self.applyFilters = function()
	{
		if (self.listObj)
		{
			// First, loop through the filters and if they are all "" then simply clear the filter.
			var foundFilterValue = false;
			var filtersArr = [];
			for (var filterId in self.filters)
			{
				if (self.filters[filterId].value !== null && self.filters[filterId].value.length > 0)
				{
					foundFilterValue = true;
					filtersArr[filtersArr.length] = self.filters[filterId];
				}
			}
            
			if (!foundFilterValue)
			{
				// Remove all filters
				self.listObj.filter();
				return;
			}
            
			self.listObj.filter(function(row)
			{
				var result = true;
				// All filters must be true for the row to be included in the result
				var filterValue, columnName, rowValue, filter, i, count = filtersArr.length;
				for (i = 0; i < count; i++)
				{
					if (result === false) {break;}
                    
					filter = filtersArr[i];
					columnName = filter.name;

					if (filter.filterFnName && LeoWeb.filters[filter.filterFnName])
					{
						//TODO: might need to convert from their cssName based object to our normal name object
						result = LeoWeb.filters[filter.filterFnName](filter.value, convertRowToMapByIdNotCss(self.columns, row.values()), columnName);
					}
					else
					{
						// If we're here, it means just go ahead and do a starts with on the column
						rowValue = row.values()[self.columnNameMap[filter.name].cssName];
						if ($.type(rowValue) !== "string")
						{
							//TODO: need to evaluate if we need to do something more sophisticated here
							if (rowValue.toString) {rowValue = rowValue.toString();}
							else {rowValue = rowValue + "";}
						}
                        
						result = rowValue.toLowerCase().indexOf(filter.value) === 0;
					}
				}
                
				return result;
			});
		}
	};
    
	self.refresh = function()
	{
		self.columns = [];
		self.columnNameMap = {};
		self.columnIdMap = {};
		$("#" + self.id + " thead th[data-field]").each(function()
		{
			$(this).uniqueId();
			var id = $(this).attr("id");
			var name = $(this).data("field");
			var sort = $(this).data("sort");
			var cssName = name.replace(/[!\"#$%&'\(\)\*\+,\.\/:;<=>\?\@\[\\\]\^`\{\|\}~]/g, "");
            
			if (sort)
				$(this).data("sort", cssName);
            
			var formatFn = $(this).data("format");
			var type = name.match("^d_.+") ? "dimension" : "metric";
			var obj = {id: id, name: name, cssName: cssName, type: type};
            
			if (formatFn) {obj.formatFn = formatFn;}
			self.columns.push(obj);
			self.columnNameMap[name] = obj;
			self.columnIdMap[id] = obj;
		});
        
		self.filters = {};
		$("#" + self.id + " thead th input[data-field]").each(function()
		{
			// Be aware this comes from jquery ui
			// If doesn't have an ID, adds one.
			$(this).uniqueId();
			var filterFnName = $(this).data("filter");
			var id = $(this).attr("id");
			var obj = {id: id, name: $(this).data("field"), value: null};
			if (filterFnName) {obj.filterFnName = filterFnName;}
			self.filters[id] = obj;
		});

		//TODO: may need polyfill for onsearch event
		$.each(self.filters, function(idx, filter)
		{
			$("#" + filter.id).off("search").on("search", function(e)
			{
				var newValue = this.value;
				newValue = (newValue === null || newValue === undefined) ? "" : newValue.trim().toLowerCase();
                
				var filter = self.filters[this.id];
                
				if (filter && newValue !== filter.value)
				{
					filter.value = newValue;
					self.applyFilters();
				}
			});
		});
        
		$("#" + self.id).off("LeoWeb:DataLoaded").on("LeoWeb:DataLoaded", function(evt, obj)
		{
			self.dataLoaded(obj.err, obj.data);
		});
        
		// Create the list.js object if it doesn't already exist.
		//        if (!self.listObj)
		//        {
		//            var options =
		//            {
		//                valueNames: [ 'name', 'age' ]
		//            };
		//            debugger;
		//            self.listObj = new List(self.id, options);
		//            self.listObj.add([{"name": "me", "age": "3"}]);
		//                //[{"d_customer.name": "Customer 1", "d_carrier.name": "Carrier 1", "f_webship|count": "Count1"}]);
		//                              //"f_webship.weight|sum": "weight", "f_webship.quote|sum": "sum quote", "f_webship.margin|sum": "margin sum"}]);
		//        }
        
		// Load the data...
		self.loadData();
	};
    
	self.loadData = function()
	{
		var columns = [];
		$.each(self.columns, function(idx, column) {columns[columns.length] = column.name;});
		LeoWeb.loadReportData({id: self.id, group: self.group, rows: columns});
	};
    
	self.formatColumn = function(row, idx)
	{
		var column = self.columns[idx], result;
        
		// If they specified a function name to use, then use it, otherwise try the built-in formatters.
		if (column.formatFn && LeoWeb.formats[column.formatFn])
		{
			result = LeoWeb.formats[column.formatFn](convertRowArrayToMapById(self.columns, row), column.name);
		}
		else
		{
			var value = row[idx];
			if (value === null || value === undefined)
				result = "";
			else
				result = Formatter.get(column.format)(value); 
		}
        
		return result;
	};
    
    
	self.reapplySort = function()
	{
		if (self.sortingColumn)
		{
			var asc = $("#" + self.sortingColumn.id).hasClass("asc");
			self.listObj.sort(self.sortingColumn.cssName, {order: asc ? "asc" : "desc"});
		}
	};
    
	self.dataLoaded = function(err, data)
	{
		//TODO: deal with err case
        
		// Update the columns
		$.each(data.columns, function(name, columnDef)
		{
			var column = self.columnNameMap[name];

			if (!column.sort)
				column.sort = columnDef.sort && columnDef.sort.type ? columnDef.sort.type : null;
            
			column.format = columnDef.format ? columnDef.format : null; 
		});
        
		var exists = false;
		if (self.listObj)
		{
			$("#" + self.id + " tbody tr").remove();
			exists = true;
		}
        
		var buf = [], tdOpens = [], trOpen = "<tr>", trClose = "</tr>", tdClose = "</td>";
		var listJsOptions = {valueNames: []};
        
		$.each(self.columns, function(idx, column)
		{
			tdOpens[idx] = '<td class="' + column.cssName + '">';
			listJsOptions.valueNames[idx] = column.cssName;
            
			// Add the column click handlers for sorting
			$("#" + column.id).css( 'cursor', 'pointer' ).off("click").on("click", function()
			{
				if (!self.listObj) {return;}
                
				var colClicked = self.columnIdMap[$(this).attr("id")];
				var asc;
				if (self.sortingColumn && colClicked.id === self.sortingColumn.id)
				{
					if ($(this).hasClass("asc"))
					{
						$(this).removeClass("asc").addClass("desc");
						asc = false;
					}
					else if ($(this).hasClass("desc"))
					{
						$(this).removeClass("desc").addClass("asc");
						asc = true;
					}
					else
					{
						$(this).addClass("asc");
						asc = true;
					}
				}
				else
				{
					if (!$(this).hasClass("leo-sort"))
						$(this).addClass("leo-sort");

					if (self.sortingColumn)
						$("#" + self.sortingColumn.id).removeClass("desc").removeClass("asc");
                    
					$(this).addClass("asc");
					asc = true;
					self.sortingColumn = colClicked;
				}
                
				self.listObj.sort(self.sortingColumn.cssName, {order: asc ? "asc" : "desc"});
			});
		});
        
		var i, j, row, rowCount = data.rows ? data.rows.length : 0, columnCount = self.columns ? self.columns.length : 0;
        
		for (i = 0; i < rowCount; i++)
		{
			row = data.rows[i];
			buf[buf.length] = trOpen;
			for (j = 0; j < columnCount; j++)
			{
				buf[buf.length] = tdOpens[j];
				buf[buf.length] = self.formatColumn(row, j);
				buf[buf.length] = tdClose;
			}
			buf[buf.length] = trClose;
		}
        
		if (buf.length == 0) {
			buf = ['<tr><td>No data to display</td></tr>'];
		}
        
		$("#" + self.id + " tbody").html(buf.join(""));
        
		if (exists)
		{
			self.listObj.reIndex();
			self.reapplySort();
			self.applyFilters();
		}
		else
		{
			self.listObj = new List(self.id, listJsOptions);
		}
	};
    
	self.destroyTransientObjects = function()
	{
		if (self.filters)
		{
			$.each(self.filters, function(idx, filter)
			{
				$("#" + filter.id).off("search");
			});
			self.filters = {};
		}
        
		self.columnNameMap = {};
		self.columnIdMap = {};
		self.columns = [];
        
		//TODO: deal with cleaninp up columns
        
		// Remove all rows from the table.
		if (self.listObj)
			self.listObj.clear();
	};
    
	self.setParams(params);
	self.refresh();
};



// Internal method used to share objects from LeoWeb into this class
LeoSimpleTable.init = function(obj)
{
	LeoWeb = obj.LeoWeb;
	return LeoSimpleTable;
};

module.exports = LeoSimpleTable;
