var React = require('react');

$.widget( "custom.catcomplete", $.ui.autocomplete, {
    _create: function() {
      this._super();
      this.widget().menu( "option", "items", "> :not(.ui-autocomplete-category)" );
    },
    _renderMenu: function( ul, items ) {
      var that = this,
      currentCategory = "";
      $.each( items, function( index, item ) {
        var li;
        if ( item.category != currentCategory ) {
          ul.append( "<li class='ui-autocomplete-category'>" + item.category + "</li>" );
          currentCategory = item.category;
        }
        li = that._renderItemData( ul, item );
        if ( item.category ) {
          li.attr( "aria-label", item.category + " : " + item.label );
        }
      });
    },
    /*_renderItem: function( ul, item) {

    }*/
  });

module.exports = React.createClass({
  getInitialState: function() {
    return {
    	showDims: false,
    	dimension: null,
    	showAttributes: false
    };
  },

  componentDidMount: function() {
  	var thisComponent = this;
  	$(this.refs.input).catcomplete({
  		minLength: 0,
  		source: function(request, response) {
  			var matches = [];
  			var term = request.term.toLowerCase();
  			for(var dim in thisComponent.props.fieldDimensions) {
  				var dimension = thisComponent.props.fieldDimensions[dim];
  				
  				var categories = [{label: dimension.label, alias: null}];
  				for(var dim in dimension.aliases) {
  					categories.push({label: dimension.aliases[dim], alias: dim});
	  			}
	  			for(var i = 0; i < categories.length; i++) {
	  				var category = categories[i].label;
	  				var alias = categories[i].alias;
	  				var catLower = category.toLowerCase();
	  				
	  				for(var x = 0; x < dimension.attributes.length; x++) {
	  					var attr = dimension.attributes[x];
	  					if(alias) { 
	  						var id = alias+"."+attr.id;
	  					} else {
	  						var id = attr.id;
	  					}
	  					if(catLower.indexOf(term) == 0 || attr.label.toLowerCase().indexOf(term) !== -1) {
	  						matches.push({
	  							category: category,
	  							id: id,
	  							label: attr.label
	  						});
	  					}
	  				}
	  			}
  			}
  			response(matches);
  		},
  		select: function(e, ui) {
  			thisComponent.props.addFilter({
  				id: ui.item.id,
  				value: '',
                comparison: '='
  			});
  			$(e.target).val('');
  			e.preventDefault();
  		}
  	}).focus(function(){    
  	 	$(this).catcomplete("search");         
    });
  },
  
    render: function() {
        return (
        	<li id="showDims" >
        		<input ref="input" type="text" placeholder="Add Filter" />{' '}
        	</li>
        );
    }
});
