ig.module('game.entities.leaderboard-bg').requires('impact.entity').defines(function() {

	EntityLeaderboardBg = ig.Entity.extend({
		size: {
			x: 256,
			y: 240
		},
		
		animSheet: new ig.AnimationSheet('media/leaderboardBg.png', 256, 240),

		init: function(x, y, settings) {
			this.parent(x, y, settings);
			this.addAnim('idle', 1, [0]);
		}
	});

});





