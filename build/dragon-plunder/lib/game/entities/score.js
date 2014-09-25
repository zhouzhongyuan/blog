ig.module('game.entities.score')
.requires(
	'impact.entity',
	'plugins.plunder-entity'
).defines(function() {

	function getTimeString(seconds) {
		var minutes = (seconds / 60) | 0;
		seconds = (seconds % 60) | 0;

		if (seconds < 10) {
			seconds = "0" + seconds;
		}

		if (minutes < 10) {
			minutes = " " + minutes;
		}

		var time = "" + minutes + ":" + seconds;
		return time;
	}

	EntityScore = ig.Entity.extend({
		font: new ig.Font('media/font/04b03.font.png'),
		size: {
			x: 150,
			y: 15
		},
		gravityFactor: 0,

		init: function(x, y, settings) {
			this.parent(x, y, settings);
			this.time = getTimeString(this.time);
		},

		draw: function() {
			this.parent();
			this.font.draw(this.name, this.pos.x, this.pos.y);
			this.font.draw(this.gold, this.pos.x + 40, this.pos.y);
			this.font.draw(this.time, this.pos.x + 68, this.pos.y);
			this.font.draw(this.deaths.toString(), this.pos.x + 104, this.pos.y);
			this.font.draw(this.total.toString(), this.pos.x + 130, this.pos.y);
		},

		handleMovementTrace: function(res) {
			this.pos.x += this.vel.x * ig.system.tick;
			this.pos.y += this.vel.y * ig.system.tick;
		}
	});

	EntityScore.inject(MixinPlunder);
});
