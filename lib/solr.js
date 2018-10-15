var http = require('http');
var util = require("util");
var fs = require("fs");
var config = require("../config.json");

http.globalAgent.maxSockets = 40;

function autocomplete(params, callback) {
  var termLower = params.term.toLowerCase();
  var queryElements = [];
  queryElements.push("rows=0");
  queryElements.push("facet.field=dimension");
  var dimension = null;

  var attributeNames = null;
  if (params.fields) {
    var constraints = [];
    attributeNames = [];
    for ( var name in params.fields) {
      queryElements.push("facet.field=attribute");
      var field = params.fields[name];
      attributeNames.push(field.column);
      constraints.push("t_" + field.column + ":" + encodeURIComponent(params.term.replace(" ", "\\ ")) + "*");
    }
    queryElements.push("q=(" + constraints.join("%20OR%20") + ")");
    queryElements.push("f.attribute.facet.prefix=" + encodeURIComponent(termLower));
  } else if (params.field) {
    var field = params.field;
    queryElements.push("facet.field=t_" + field.column);
    dimension = String(field.field.ltable).replace(/^([0-9]+-)?d_/, '');
    queryElements.push("q=t_" + field.column + ":" + encodeURIComponent(params.term.replace(" ", "\\ ")) + "*");
  } else {
    if (params.dimension) {
      dimension = params.dimension;
    }

    queryElements.push("facet.field=attribute");
    queryElements.push("f.attribute.facet.prefix=" + encodeURIComponent(termLower));
    queryElements.push("q=" + encodeURIComponent(params.term.replace(" ", "\\ ")) + "*");
  }
  if (dimension) {
    queryElements.push("fq=dimension:" + dimension);
  }
  if (params.client) {
    queryElements.push("fq=client:" + params.client);
  }

  // console.log("/solr/dw/autocomplete/?" + queryElements.join("&"));

  var result = '';
  console.log("/solr/dw/autocomplete/?" + queryElements.join("&"));
  http.get({
    host : config.solr,
    port : 8080,
    path : "/solr/dw/autocomplete/?" + queryElements.join("&"),
    headers : {
      "Connection" : "keep-alive"
    },
  }, function(res) {
    res.setEncoding("utf8");
    res.on("data", function(chunk) {
      result += chunk;
    });
    res.on("end", function() {
      try {
        result = JSON.parse(result);
        var response = {};
        response.QTime = result.responseHeader.QTime;
        response.term = termLower;
        response.docs = [];
        response.suggestions = [];
        response.dimensionMatches = [];

        // Let's get the suggestions started
        var dimensionFacet = result.facet_counts.facet_fields.dimension;
        for (var i = 0; i < dimensionFacet.length; i += 2) {
          response.dimensionMatches.push({
            name : dimensionFacet[i],
            count : dimensionFacet[i + 1]
          });
        }

        if (params.field) {
          var field = params.field;
          var attributeFacet = result.facet_counts.facet_fields["t_" + field.column];
          for (var i = 0; i < attributeFacet.length; i += 2) {
            var value = attributeFacet[i];
            response.suggestions.push({
              dimension : field.field.ltable.replace(/^d_/, ""),
              attribute : field.column,
              match : value.toLowerCase() == termLower ? "exact" : "startswith",
              value : value,
              count : attributeFacet[i + 1]
            });
          }
        } else {
          var attributeFacet = result.facet_counts.facet_fields.attribute;
          for (var i = 0; i < attributeFacet.length; i += 2) {
            var parts = attributeFacet[i].split(':');
            var dimension = parts.pop();
            var name = parts.pop().replace(/^._/, '');
            var value = parts.join(":");
            if (attributeNames && attributeNames.indexOf(name) == -1) {
              continue;
            }
            response.suggestions.push({
              dimension : dimension,
              attribute : name,
              match : value.toLowerCase() == termLower ? "exact" : "startswith",
              value : value,
              count : attributeFacet[i + 1]
            });
          }
        }

        var suggestions = {};
        result.response.docs.forEach(function(doc) {
          response.docs.push({
            id : doc.id,
            dimension : doc.dimension,
            updated : doc.updated,
            attributes : doc.attribute.map(function(field) {
              var parts = field.split(':');
              var dimension = parts.pop();
              var attribute = parts.pop().replace(/^._/, '');
              var value = parts.join(":");
              // only want to find ones that had a space before them as starts
              // with is already taken care of
              if (value.toLowerCase().indexOf(" " + termLower) > 0) {
                var id = field + ":" + doc.dimension;
                if (!(id in suggestions)) {
                  suggestions[id] = {
                    dimension : doc.dimension,
                    attribute : attribute,
                    match : 'fuzzy',
                    value : value,
                    count : 1
                  };
                } else {
                  suggestions[id].count += 1;
                }
              }
              return {
                label : attribute,
                value : value
              };
            })
          });
        });
        for ( var id in suggestions) {
          response.suggestions.push(suggestions[id]);
        }
        callback(null, response);
      } catch (e) {
        callback(e);
      }
    });
  }).on("error", function(error) {
    callback(error);
  });
}

function index(filename, callback) {
  var result = '';
  var request = http.request({
    host : config.solr,
    port : 8080,
    path : "/solr/dw/update/json?wt=json&commit=true",
    headers : {
      "Content-type" : "application/json",
      "Connection" : "keep-alive"
    },
    method : "POST"
  }, function(res) {
    res.setEncoding("utf8");
    res.on("data", function(chunk) {
      result += chunk;
    });
    res.on("end", function() {
      try {
        var json = JSON.parse(result);
        if (json.responseHeader.status == 0) {
          callback(null, json);
        } else {
          callback(json);
        }
      } catch (e) {
        callback(e);
      }
    });
  }).on("error", function(error) {
    stream.close();
    callback(error);
  });

  var stream = fs.createReadStream(filename);
  stream.pipe(request);
}

module.exports = Object.freeze({
  autoComplete : autocomplete,
  index : index
});
