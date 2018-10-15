// let fn = (obj, done) => {
// 	for (let key in obj.payload.data) {
// 		let value = obj.payload.data[key];
// 		if (value && (value === 'Invalid date' || value.search && value.match(/^0000/))) {
// 			obj.payload.data[key] = null;
// 		}
// 	}

// 	if (obj.payload.data.first_name) {
// 		obj.payload.data.first_name = "Hairisdrawn\n\r\intocurl " + `${obj.payload.data.first_name}`;
// 		console.log("ADD line", obj.payload.data)
// 	}

// 	done(null, obj);
// }
module.exports = {
	start: "z/2018/",
	source: "dw.load",
	botId: "StagingDw-leo_dw_ingest",
}

// module.exports = {
// 	source: "queue:dw.load",
// 	botId: "ProdClientDW-leo_dw_ingest",
// 	seconds: 180
// }
