ig.module('game.entities.summary.walking-player')
.requires(
	'impact.entity',
	'plugins.plunder-entity'
)
.defines(function() {

	EntityWalkingPlayer = ig.Entity.extend({
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
		}
	});

	EntityWalkingPlayer.inject(MixinPlunder);
});
