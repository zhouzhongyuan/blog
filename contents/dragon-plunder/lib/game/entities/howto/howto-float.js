ig.module('game.entities.howto.howto-float').requires('game.entities.howto.howto-base-player').defines(function() {

	EntityHowtoFloat = EntityHowtoBasePlayer.extend({

		init: function(x, y, settings) {
			this.parent(x, y, settings);

			this.initialPos = ig.copy(this.pos);
			this.currentAnim = this.anims.cape;
		}
	});
});








