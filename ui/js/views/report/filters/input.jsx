var React = require('react');
var ReportFilterActions = require('../../../actions/ReportFilterActions');

if (typeof String.prototype.startsWith != 'function') {
    // see below for better implementation!
    String.prototype.startsWith = function (str){
        return this.indexOf(str) == 0;
    };
}

module.exports = React.createClass({

    getInitialState: function() {
        return {
            inputValue: ''
        }
    },

    //Added this to update the input value by state
    componentWillReceiveProps: function(nextProp) {
        if(nextProp.value){
            
            this.setState({
                inputValue: nextProp.value
            });

        } else if(nextProp.filter){
            var tempValue = nextProp.filter[this.props.name];

            if($.isArray(tempValue)) {
                if(!this.props.range){
                    tempValue = tempValue.join('; ');
                }
            }

            if(tempValue != "" && tempValue.length > 0){
                tempValue = tempValue + "; ";
            }

            this.setState({
                inputValue: tempValue
            });

        }
    },

    componentDidMount: function() {

        var thisComponent = this;

        //If it's a date field, do a datepicker
        if(this.props.filterInputType == 'date'){

            $(this.refs.input).datepicker({
                dateFormat: "yy-mm-dd",
                setDate: thisComponent.props.value,
                onSelect: function(selectedDate, picker) {
                    thisComponent.props.onChange(thisComponent.props.name, selectedDate);
                }
            });

        }

        //Anything else, regular input with autocomplete
        if(this.props.filterInputType == 'base'){

            var thisComponent = this;
            $(this.refs.input).autocomplete({
                minLength: 0,
                source: function(request, response) {
                    var matches = [];
                    var term = request.term.split(/;\s*/).pop().toLowerCase().trim();

                    ReportFilterActions.autocomplete(thisComponent.props.filter.id, term,  function(results) {
                        if(thisComponent.props.filter.calculation == "d_date.id" && (term == "" || term.startsWith("l"))) { //hack for now
                            matches.push({
                                id: "Last 30 days",
                                label: "Last 30 days"
                            });
                            matches.push({
                                id: "Last 1 months",
                                label: "Last 1 months"
                            });
                            matches.push({
                                id: "Last 1 years",
                                label: "Last 1 years"
                            });
                        }
                        for(var i = 0; i < results.suggestions.length; i++) {
                            matches.push({
                                id: results.suggestions[i].value,
                                label: results.suggestions[i].value.toUpperCase()
                            });
                        }
                        response(matches);
                    });
                },
                select: function(e, ui) {
                    e.preventDefault();
                    if(!thisComponent.props.range){
                        var terms = this.value.split(/;\s*/);
                        terms.pop();
                        terms.push( ui.item.value );
                        terms.push( "" );
                        this.value = terms.join( "; " );
                    } else {
                        this.value = ui.item.value;
                    }
                    $(this).blur();
                    return false;
                }
            }).focus(function(){    
                $(this).autocomplete("search");         
            });
        }
    },

    _onBlur: function(e) {
        this.props.onChange(this.props.name, e.target.value);
    },

    changeFilterText: function(e) {
        this.setState({
            inputValue: $(e.target).val()
        });
    },

    render: function() {

        if(this.props.filterInputType == 'date'){

            return(
                <input type="text" ref="input" 
                    id={this.props.name + "-" + this.props.filter.id}
                    className="uk-width-3-5 uk-form-small uk-margin-small-left"
                    defaultValue={this.state.inputValue} />
            );


        } else {

            return (
                <input type="text" ref="input" 
                    id={this.props.name + "-" + this.props.filter.id}
                    className="uk-width-3-5 uk-form-small uk-margin-small-left"
                    value={this.state.inputValue} 
                    onChange={this.changeFilterText}
                    onBlur={this._onBlur} />
            );

        }

    }

});
