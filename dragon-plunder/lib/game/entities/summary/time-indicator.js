ig.module('game.entities.summary.time-indicator')
.requires('game.entities.summary.base-indicator').defines(function() {

	EntityTimeIndicator = EntityBaseIndicator.extend({
		doneSfx: new ig.Sound('media/sfx/slide_in_2.*'),
		size: {
			x: 115,
			y: 17
		},

		init: function(x, y, settings) {
			this.parent(x, y, settings);

			if(ig.session) {
				this.formattedTime = this.formatTime(ig.session.getTime());
			} else {
				this.formattedTime = '??:??';
			}
		},

		animSheet: new ig.AnimationSheet('media/summary/timeIndicator.png', 115, 17),

		getValue: function() {
			return this.formattedTime;
		},

		formatTime: function(time) {
			var minutes = (time / 60) | 0;
			var seconds = (time % 60) | 0;

			seconds = seconds < 10 ? '0' + seconds : seconds.toString();

			return minutes + ':' + seconds;
		}
	});

});




