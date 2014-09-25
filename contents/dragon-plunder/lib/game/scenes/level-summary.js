ig.module('game.scenes.level-summary').
requires(
	'impact.game',
	'impact.font',
	'game.entities.keys.x-key',
	'game.levels.level-summary-1',
	'game.levels.level-summary-2',
	'game.levels.level-summary-3',
	'game.high-scores'

).defines(function() {

	LevelSummaryScene = ig.Game.extend({
		font: new ig.Font('media/font/04b03.font.png'),

		gravity: 600,

		init: function() {
			var level = window['LevelLevelSummary' + ig.session.level];
			this.loadLevel(ig.copy(level));

			this.setTitle();
			ig.session.score = ig.session.getScore();

			this._initAnimation();

			this._player = this.getEntityByName('player');

			ig.track("LevelSummary", "finished level " + ig.session.level, {score: ig.session.score})

			this._playMusic();
		},

		_initAnimation: function() {
			var totalScoreIndicator = this.getEntityByName('totalScoreIndicator');
			var goldIndicator = this.getEntityByName('goldIndicator');
			var timeIndicator = this.getEntityByName('timeIndicator');
			var livesIndicator = this.getEntityByName('livesIndicator');
			var nextLevelLabel = this.getEntityByName('nextLevelLabel');
			var xKey = this.getEntityByName('xKey');
			var rKey = this.getEntityByName('rKey');
			var retryLevelLabel = this.getEntityByName('retryLevelLabel');

			var easing = 'easeOutQuad';
			var me = this;

			xKey.alpha = nextLevelLabel.alpha = 0;
			rKey.alpha = retryLevelLabel.alpha = 0;

			totalScoreIndicator.timeline.sequence(function(ani) {
				ani.wait(1);
				ani.together(function(ani) {
					ani.tween({
							target: goldIndicator,
							property: 'pos.x',
							from: goldIndicator.pos.x,
							to: 0,
							duration: 1,
							easing: easing
					});
					ani.sequence(function(ani) {
						ani.wait(0.5);
						ani.tween({
							target: timeIndicator,
							property: 'pos.x',
							from: timeIndicator.pos.x,
							to: 0,
							duration: 1,
							easing: easing
						});
					});
					ani.sequence(function(ani) {
						ani.wait(0.7);
						ani.tween({
							target: livesIndicator,
							property: 'pos.x',
							from: livesIndicator.pos.x,
							to: 0,
							duration: 1,
							easing: easing
						});
					});
				});

				var specialTreasure = ig.session.gotSpecialTreasure();
				if (specialTreasure) {
					var ox = specialTreasure.offset.x || 0;
					var oy = specialTreasure.offset.y || 0;
					ani.invoke(function() {
						me.specialTreasure = me.spawnEntity(specialTreasure.type, 26 + ox, 47 + oy, {
							gravityFactor: 0
						});
					});
				}

				ani.tween({
					target: totalScoreIndicator,
					property: 'pos.x',
					to: (256 - totalScoreIndicator.size.x),
					duration: 1,
					easing: easing
				});
				ani.wait(0.5);
				ani.fadeIn({
					target: [xKey, nextLevelLabel, rKey, retryLevelLabel],
					duration: 0.6
				});
				ani.wait(0.2);
				ani.invoke(function() {
					me.canProceed = true;
				});
			});
		},

		setTitle: function() {
			var label = this.getEntityByName('titleLabel');
			label.label = 'Level ' + ig.session.level + ': ' + ig.session.levelName;
		},

		update: function() {
			this.parent();

			if ((ig.input.pressed('jump') || ig.input.pressed('retry')) && this.canProceed) {
				ig.music.fadeOut(3);
				this._walkOff({retry: !!ig.input.pressed('retry')});
			}
		},

		_walkOff: function(options) {
			var player = this.getEntityByName('player');
			var nextLevelLabel = this.getEntityByName('nextLevelLabel');
			var retryLevelLabel = this.getEntityByName('retryLevelLabel');
			var xKey = this.getEntityByName('xKey');
			var rKey = this.getEntityByName('rKey');
			var goldIndicator = this.getEntityByName('goldIndicator');
			var timeIndicator = this.getEntityByName('timeIndicator');
			var livesIndicator = this.getEntityByName('livesIndicator');
			var totalScoreIndicator = this.getEntityByName('totalScoreIndicator');
			var easing = 'easeInQuad';

			player.gravityFactor = 0;

			var me = this;

			player.timeline.sequence(function(t) {
				t.invoke(function() {
					if (me.specialTreasure) {
						me.specialTreasure.kill();
					}
				});

				t.invoke(function() {
					player.currentAnim = player.anims.walk;
					player.currentAnim.flip.x = !!(options && options.retry);
				});
				t.together(function(t) {
					t.tween({
						property: 'pos.x',
						from: player.pos.x,
						to: (options && options.retry) ? -16 : ig.system.width + 3,
						duration: (options && options.retry) ? 1 : 3
					});
					t.fadeOut({
						target: [xKey, nextLevelLabel, rKey, retryLevelLabel],
						duration: 1
					});
					t.sequence(function(t) {
						t.wait(0.6);
						t.together(function(t) {
							t.tween({
								target: timeIndicator,
								property: 'pos.x',
								to: -timeIndicator.size.x,
								duration: 1.7,
								easing: easing
							});
							t.sequence(function(t) {
								t.wait(0.3)
								t.tween({
									target: goldIndicator,
									property: 'pos.x',
									to: -goldIndicator.size.x,
									duration: 1.9,
									easing: easing
								});
							});
							t.sequence(function(t) {
								t.wait(0.7)
								t.tween({
									target: livesIndicator,
									property: 'pos.x',
									to: -livesIndicator.size.x,
									duration: 1.2,
									easing: easing
								});
							});
							t.tween({
								target: totalScoreIndicator,
								property: 'pos.x',
								to: 256,
								duration: 1.7,
								easing: easing
							});
						});
					});
				});
				t.invoke(function() {
					me._nextScene(options);
				});
			});

		},

		_nextScene: function(options) {
			var scene;

			if (options && options.retry) {
				ig.session.resetLevel();
				ig.track('LevelSummary', 'retrying level ' + ig.session.level);
				scene = 'LevelScene';
			} else {
				if (window['LevelLevel' + (ig.session.level + 1)]) {
					scene = 'LevelIntroScene';
				} else {
					scene = 'GameWonScene';
				}
			}
			this.fireEvent('scene-complete', scene);
		},

		_playMusic: function() {
			ig.music.add('media/music/win_music.*', 'win');
			ig.music.volume = 0.5;
			ig.music.play('win');
		}
	});
});
