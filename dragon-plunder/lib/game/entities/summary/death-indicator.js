ig.module('game.entities.summary.death-indicator')
.requires('game.entities.summary.base-indicator').defines(function() {

	EntityDeathIndicator = EntityBaseIndicator.extend({
		doneSfx: new ig.Sound('media/sfx/slide_in_1.*'),
		size: {
			x: 129,
			y: 17
		},

		animSheet: new ig.AnimationSheet('media/summary/deathIndicator.png', 129, 17),

		getValue: function() {
			return ig.session.getDeaths();
		}
	});

});




