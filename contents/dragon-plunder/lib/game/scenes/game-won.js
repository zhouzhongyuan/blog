ig.module('game.scenes.game-won').
requires('impact.game', 'impact.font',

'game.entities.label',
'game.levels.game-won'

).defines(function() {

	GameWonScene = ig.Game.extend({
		gravity: 0,
		hideMute: true,

		init: function() {
			this.loadLevel(LevelGameWon);

			var foundCount = 0;
			for (var level = 1; level <= 3; ++level) {
				var st = ig.session.gotSpecialTreasure(level);
				if (!st) {
					this.getEntityByName("specialTreasure" + level).kill();
				} else {
					foundCount += 1;
					foundASpecialTreasure = true;
				}
			}

			if (foundCount > 0) {
				this.getEntityByName("noneLabel").kill();
			}

			if (foundCount < 3) {
				this.getEntityByName("foundAllLabel").kill();
			}
		},

		update: function() {
			this.parent();

			if(ig.input.pressed('jump')) {
				this._nextScene();
			}
		},

		_nextScene: function() {
			if(new HighScores().isHighScore(ig.session.getTotalScore())) {
				ig.session.playerName = window.prompt("You got a high score! What is your name?");
				ig.session.playerName = ig.session.playerName.substring(0, 5);
			}
			this.fireEvent('scene-complete', 'LeaderboardScene');
		}
	});
});
