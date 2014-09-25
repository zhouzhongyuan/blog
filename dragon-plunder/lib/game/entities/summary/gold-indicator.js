ig.module('game.entities.summary.gold-indicator')
.requires('game.entities.summary.base-indicator').defines(function() {

	EntityGoldIndicator = EntityBaseIndicator.extend({
		doneSfx: new ig.Sound('media/sfx/slide_in_3.*'),
		size: {
			x: 128,
			y: 17
		},

		animSheet: new ig.AnimationSheet('media/summary/goldIndicator.png', 128, 17),

		getValue: function() {
			return ig.session.getGold();
		}
	});

});
