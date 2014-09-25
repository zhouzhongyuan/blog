ig.module('game.scenes.leaderboard').
requires(
	'impact.game',
	'game.high-scores',
	'game.entities.score',
	'game.levels.leaderboard'
).defines(function() {

	LeaderboardScene = ig.Game.extend({
		buttonStart: new ig.Sound('media/sfx/x_game_start.*'),
		hideMute: true,

		init: function() {
			var highScores = new HighScores();
			this.loadLevel(ig.copy(LevelLeaderboard));
			this._addScores(highScores.getScores());

			if (ig.session.gameWasPlayed) {
				var gold = ig.session.getTotalGold();
				var time = ig.session.getTotalTime();
				var deaths = ig.session.getTotalDeaths();
				var total = ig.session.getTotalScore();

				if (highScores.isHighScore(total)) {
					highScores.saveScore(ig.session.playerName, gold, time, deaths);
					var newScore = this.spawnEntity(EntityScore, 0, 0, {
						name: ig.session.playerName,
						gold: gold,
						time: time,
						deaths: deaths,
						total: total
					});

					this._initAnimation(newScore);
				}
			} else {
				this.timeout = new ig.Timer(8);
			}
		},

		update: function() {
			this.parent();

			if (ig.input.pressed('jump') || (this.timeout && this.timeout.delta() > 0)) {
				if (ig.input.pressed('jump')) {
					this.buttonStart.play();
				}

				this.fireEvent('scene-complete', 'TitleScene', { dontTransition: true });
			}
		},

		_addScores: function(scores) {
			var x = 55;
			var y = 78;

			scores.forEach(function(score, i) {
				var s = this.spawnEntity(EntityScore, x, y, {
					name: score.name,
					gold: score.gold,
					time: score.time,
					deaths: score.deaths,
					total: score.total
				});
				s.timeline.fadeIn(1);
				y += 17;
			}, this);
		},

		_initAnimation: function(newScore) {
			var scores = this.getEntitiesByType(EntityScore).filter(function(s) { return s !== newScore });
			var lastScore = scores[scores.length - 1];

			if(lastScore.total < newScore.total) {

				var scoresToMove = scores.filter(function(s) {
					return s.total < newScore.total;
				});
				var me = this;

				newScore.pos.x = -newScore.size.x;
				newScore.pos.y = scoresToMove[0].pos.y;

				lastScore.timeline.sequence(function(t) {
					t.wait(1);

					t.fadeOut({
						target: lastScore,
						duration: 1
					});


					t.wait(0.5);

					t.together(function(t) {
						scoresToMove.forEach(function(stm) {
							t.tween({
								target: stm.pos,
								property: 'y',
								from: stm.pos.y,
								to: stm.pos.y + 17,
								duration: 0.4,
								easing: 'easeOutQuad'
							});
						});
					});

					t.tween({
						target: newScore.pos,
						from: newScore.pos.x,
						to: 55,
						property: 'x',
						duration: 2,
						easing: 'easeOutQuad'
					});

					t.invoke(function() {
						lastScore.kill();
					});
				});
			}
		}
	});
});
