ig.module('game.entities.crown').requires('game.entities.treasure').defines(function() {

	EntityCrown = EntityTreasure.extend({
		value: 1400,
		special: {
			level: 3,
			type: 'EntityCrown',
			offset: {
				x: -1,
				y: -4
			}
		},

		animSheet: new ig.AnimationSheet('media/crown.png', 16, 16),

		addAnims: function() {
			this.addAnim('spawn', 0.08, [8,9,10,11,12,13], true);
			this.addAnim('idle', 1, [0]);
			this.addAnim('gleem', 0.1, [0, 1, 2, 3, 4, 5, 6, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
			this.addAnim('falling', 1, [0]);
		}

	});
});
