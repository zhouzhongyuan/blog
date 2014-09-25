ig.module('game.entities.howto.howto-walk').requires('game.entities.howto.howto-base-player').defines(function() {

	EntityHowtoWalk = EntityHowtoBasePlayer.extend({
		init: function(x, y, settings) {
			this.parent(x, y, settings);

			this.initialPos = ig.copy(this.pos);
			this.currentAnim = this.anims.walk;

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






