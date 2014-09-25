ig.module('game.entities.summary.base-indicator')
.requires(
	'impact.entity'
).defines(function() {

	EntityBaseIndicator = ig.Entity.extend({
		font: new ig.Font('media/font/ps8.png'),
		size: {
			x: 0,
			y: 17
		},

		vel: {
			x: 0,
			y: 0
		},

		maxVel: {
			x: Infinity,
			y: 0
		},

		gravityFactor: 0,
		zIndex: Infinity,

		init: function(x, y, settings) {
			this.parent(x, y, settings);

			this.addAnim('idle', 1, [0]);

			this.pos.x = -this.size.x;
		},

		toFinalLocation: function() {
			this.pos.x = 0;
		},

		draw: function() {
			this.parent();
			var value = window.wm ? 'value' : this.getValue();
			this.font.draw(value, this.pos.x + 64, this.pos.y + 5);
		}
	});
});


