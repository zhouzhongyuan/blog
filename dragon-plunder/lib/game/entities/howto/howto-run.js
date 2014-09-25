ig.module('game.entities.howto.howto-run').requires('game.entities.howto.howto-base-player').defines(function() {

	EntityHowtoRun = EntityHowtoBasePlayer.extend({
		init: function(x, y, settings) {
			this.parent(x, y, settings);

			this.initialPos = ig.copy(this.pos);
			this.currentAnim = this.anims.run;

			this.turnAroundTimer = new ig.Timer((Math.random() * 5) | 0 + 3);
		},

		update: function() {
			this.parent();

			if(this.turnAroundTimer.delta() > 0) {
				this.currentAnim.flip.x = !this.currentAnim.flip.x;
				this.turnAroundTimer.set((Math.random() * 5) | 0 + 3);
			}
		}
	});

});







