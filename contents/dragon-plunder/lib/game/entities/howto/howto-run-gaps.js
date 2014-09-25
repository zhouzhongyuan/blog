ig.module('game.entities.howto.howto-run-gaps').requires('game.entities.howto.howto-run').defines(function() {

	EntityHowtoRunGaps = EntityHowtoRun.extend({
		gravityFactor: 1,

		vel: {
			x: 150,
			y: 0
		},
		maxVel: {
			x: 150,
			y: 0
		},

		init: function(x, y, settings) {
			this.parent(x, y, settings);

			this.initialPos = ig.copy(this.pos);
			this.currentAnim = this.anims.run;

			this.size.x = 10;

			this.waitTimer = new ig.Timer(2);
		},

		update: function() {
			if(this.waitTimer.delta() < 0) {
				return;
			}
			
			this.parent();

			if(this.pos.x > 200 || this.pos.x < 40) {
				this.vel.x *= -1;
				this.waitTimer.set(2);

				this.pos.x = this.pos.x.limit(41, 199);
			}

			this.currentAnim.flip.x = this.vel.x < 0;
		}
	});

});








