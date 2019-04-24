
if (!chartDetails) {

	var chartDetails = {

		htmlExpand: function(unused, params) {

			/*

			var details = $('#leoChartDetails');

			if (details.length == 0) {
				details = $('<div id="leoChartDetails"></div>');
				$('body').append(details);
			}

			details
				.empty()
				.append($('<header />').html(params.headingText))
				.append($('<main />').html(params.maincontentText).css({
					width: params.width,
					height: params.height
				}))
				.css({
					left: params.pageOrigin.x,
					top: params.pageOrigin.y,
					width: 0,
					height: 0
				})
				.show()
				.animate({
					left: params.pageOrigin.x - params.width/2 - 20,
					top: params.pageOrigin.y - params.height/2 - 35,
					width: params.width + 20,
					height: params.height + 50
				})
				.bind('mouseleave', function() {
					$(this).empty().css({left:0,top:0}).hide();
				})
			*/
	
		}

	};
}

module.exports = chartDetails;
