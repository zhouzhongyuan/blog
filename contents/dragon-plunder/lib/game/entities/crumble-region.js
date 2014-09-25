ig.module('game.entities.crumble-region')
.requires(
	'impact.entity',
	'plugins.edges'
)
.defines(function() {

	EntityCrumbleRegion = ig.Entity.extend({
		_wmDrawBox: true,
		_wmBoxColor: 'rgba(128, 255, 0, 0.4)',
		_wmScalable: true,
		gravityFactor: 0,

		type: ig.Entity.TYPE.B,
		checkAgainst: ig.Entity.TYPE.BOTH
	});

	EntityCrumbleRegion.inject(MixinEdges);
});


