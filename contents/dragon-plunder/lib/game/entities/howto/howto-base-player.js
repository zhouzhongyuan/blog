ig.module('game.entities.howto.howto-base-player')
.requires('impact.entity')
.defines(function() {

	EntityHowtoBasePlayer = ig.Entity.extend({
		size: {
			x: 4,
			y: 14
		},
		offset: {
			x: 6,
			y: 10
		},

		gravityFactor: 0,

		zIndex: 2000,

		animSheet: new ig.AnimationSheet('media/male.png', 16, 24),

		init: function(x, y, settings) {
			this.parent(x, y, settings);

			this.addAnim('idle', 1, [0]);
			this.addAnim('walk', 0.2, [0, 1, 2, 1]);
			this.addAnim('run', 0.08, [0, 1, 2, 1]);
			this.addAnim('jump', 1, [3]);
			this.addAnim('fall', 1, [4]);
			this.addAnim('cape', 0.2, [5,6]);
			this.addAnim('death', 0.04, [8,9,10,11,12,13,14,15]);
		}
	});
});
