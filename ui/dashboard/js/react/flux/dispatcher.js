var that = {};
var my = {};

require("../emitter.js")(my);

module.exports = {
	on: my.on.bind(my, 0),
	emit: my.emit
};
