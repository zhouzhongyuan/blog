ig.module('game.entities.goblet').requires('game.entities.treasure').defines(function() {

	EntityGoblet = EntityTreasure.extend({
		value: 1000,
		special: {
			level: 2,
			type: 'EntityGoblet',
			offset: {
				x: 0,
				y: -2
			}
		},

		animSheet: new ig.AnimationSheet('media/goblet.png', 16, 16),

		addAnims: function() {
			this.addAnim('spawn', 0.08, [6,7,8,9,10,11], true);
			this.addAnim('idle', 1, [0]);
			this.addAnim('gleem', 0.1, [0, 1, 2, 3, 4, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
			this.addAnim('falling', 1, [0]);
		}

	});
});
