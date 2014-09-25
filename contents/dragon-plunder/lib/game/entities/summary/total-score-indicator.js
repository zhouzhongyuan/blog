ig.module('game.entities.summary.total-score-indicator')
.requires(
	'impact.entity',
	'plugins.center',
	'plugins.plunder-entity'
).defines(function() {

	var RESTING_SPOT = 40;

	EntityTotalScoreIndicator = ig.Entity.extend({
		sfx: new ig.Sound('media/sfx/big_money_bag.*'),
		size: {
			x: 196,
			y: 75
		},
		maxVel: {
			x: 0,
			y: Infinity
		},

		collides: ig.Entity.COLLIDES.PASSIVE,
		gravityFactor: 0,
		zIndex: Infinity,

		animSheet: new ig.AnimationSheet('media/summary/totalScore.png', 196, 75),
		font: new ig.Font('media/font/ps20b.png'),
		smallFont: new ig.Font('media/font/04b03.font.png'),

		init: function(x, y, settings) {
			this.parent(x, y, settings);

			this.addAnim('idle', 1, [0]);

			// hack to get better kerning, very last line, divide by 1.07
			// to force the characters to get kerned tighter
			this.font._drawChar = function( c, targetX, targetY ) {
				if( !this.loaded || c < 0 || c >= this.indices.length ) { return 0; }

				var scale = ig.system.scale;


				var charX = this.indices[c] * scale;
				var charY = 0;
				var charWidth = this.widthMap[c] * scale;
				var charHeight = (this.height-2) * scale;

				ig.system.context.drawImage(
					this.data,
					charX, charY,
					charWidth, charHeight,
					ig.system.getDrawPos(targetX), ig.system.getDrawPos(targetY),
					charWidth, charHeight
				);

				return (this.widthMap[c] + this.letterSpacing) / 1.07;
			};
		},

		toFinalLocation: function() {
			this.pos.y = RESTING_SPOT;
		},

		draw: function() {
			this.parent();
			var score = ig.session && ig.session.score || 0;
			this.font.draw(score, this.center.x + 28, this.center.y - 13, ig.Font.ALIGN.CENTER);

			ig.system.context.globalAlpha = 0.6;
			this.smallFont.draw("score for level " + ig.session.level, this.center.x - 50, this.center.y - 34);
			this.smallFont.draw("total score: " + ig.session.getTotalScore(), this.center.x - 50, this.center.y + 29);
			ig.system.context.globalAlpha = 0.6;
		}
	});

	EntityTotalScoreIndicator.inject(MixinCenter);
	EntityTotalScoreIndicator.inject(MixinPlunder);
});
