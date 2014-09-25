ig.module('game.entities.door.door').requires('impact.entity').defines(function() {

	EntityDoor = ig.Entity.extend({
		size: {
			x: 34,
			y: 67
		},
		type: ig.Entity.TYPE.A,
		checkAgainst: ig.Entity.TYPE.A,
		zIndex: 99999,
		gravityFactor: 0,



		init: function(x, y, settings) {
			this.parent(x, y, settings);

			var level = ig.session && ig.session.level || 1;
			this.animSheet = new ig.AnimationSheet('media/levels/level' + level + '/door.png', 34, 67),

			this.addAnim('idle', 1, [0]);
			this.addAnim('activated', 1, [1]);

			this.currentAnim.flip.x = !!this.flip;
		},

		check: function(other) {
			if(other.isPlayer) {
				this.currentAnim = this.anims.activated;
				this.currentAnim.flip.x = !!this.flip;
			}
		}
	});

});
