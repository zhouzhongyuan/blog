(function() {
	ig.module('game.main').requires(
		//'impact.debug.debug',
		'impact.game',
		'plugins.observable',
		'plugins.fixed-entity',
		'plugins.clear-map-tiles',
		'plugins.plunder-entity',
		'game.scenes.transition',
		'game.scenes.title',
		'game.scenes.about',
		'game.scenes.how-to-play',
		'game.scenes.level-intro',
		'game.scenes.level',
		'game.scenes.level-summary',
		'game.scenes.game-won',
		'game.scenes.leaderboard'

	).defines(function() {
		var local = window.location.host.indexOf('localhost') > -1;

		// ig.Game setting ig.game to "this" really sucks, getting rid of it
		ig.Game.prototype.staticInstantiate = function () {
			this.sortBy = this.sortBy || ig.Game.SORT.Z_INDEX;
			return null;
		};

		function setupLoader(callback) {
			var loadingBg = document.createElement('img');
			var MyLoader = ig.Loader.extend({
				draw: function() {
					var w = ig.system.realWidth;
					var h = ig.system.realHeight;

					// draw in bg image
					ig.system.context.drawImage(loadingBg, 0, 0, loadingBg.width, loadingBg.height, 0, 0, w, h);

					// fade it out
					ig.system.context.fillStyle = 'rgba(255, 255, 255, 0.5)'
					ig.system.context.fillRect(0, 0, w, h);

					// loading bar
					var fullWidth = 82 * ig.system.scale;
					var fullHeight = 8 * ig.system.scale;
					var barX = 90 * ig.system.scale;
					var barY = 176 * ig.system.scale;

					// black bg/border
					var offset = 3;
					ig.system.context.fillStyle = 'black';
					ig.system.context.fillRect(barX - offset, barY - offset, fullWidth + (2 * offset), fullHeight + (2 * offset));

					// brown progress
					ig.system.context.fillStyle = '#aa5500';
					ig.system.context.fillRect(barX, barY, fullWidth * this.status, fullHeight);
				}
			});

			loadingBg.src = 'media/titleBg.png';

			loadingBg.onload = function() {
				callback(MyLoader);
			}
		}

		MainGame = ig.Game.extend({
			font: new ig.Font('media/font/04b03.font.png'),
			muteIcon: new ig.Image('media/muteIcon.png'),

			init: function() {
				this.initInput();

				this._onSceneCompleteBound = this._onSceneComplete.bind(this);
				this._setNextScene(new TitleScene(), { dontTransition: true });

				this.muted = false;
			},

			initInput: function() {
				ig.input.bind(ig.KEY.M, 'mute');
				ig.input.bind(ig.KEY.P, 'pause');
				ig.input.bind(ig.KEY.X, 'jump');
				ig.input.bind(ig.KEY.T, 'reset-level');
				ig.input.bind(ig.KEY.LEFT_ARROW, 'left');
				ig.input.bind(ig.KEY.RIGHT_ARROW, 'right');
				ig.input.bind(ig.KEY.SHIFT, 'run');
				ig.input.bind(ig.KEY.A, 'about');
				ig.input.bind(ig.KEY.L, 'leaderboard');
				ig.input.bind(ig.KEY.S, 'screenshot');
				ig.input.bind(ig.KEY.R, 'retry');


				// DEBUG: jump between levels and scenes using the numpad
				this.maxLevel = 3;

				for(var level = 1; level <= this.maxLevel; ++level) {
					if (window['LevelLevel' + level]) {
						ig.input.bind(ig.KEY['NUMPAD_' + level], 'goto' + level);
					}
				}

				ig.input.bind(ig.KEY['NUMPAD_' + (this.maxLevel + 1)], 'gotoLevelSummary');
				ig.input.bind(ig.KEY['NUMPAD_' + (this.maxLevel + 2)], 'gotoGameWon');
				ig.input.bind(ig.KEY['NUMPAD_' + (this.maxLevel + 3)], 'gotoLeaderboard');
			},

			update: function() {
				this.parent();

				for(var i = 1; i <= this.maxLevel; ++i) {
					if (ig.input.pressed('goto' + i)) {
						ig.session.level = (i-1);
						ig.session.nextLevel();
						this._setNextScene(new LevelScene(), { dontTransition: true });
						break;
					}
				}

				if(ig.input.pressed('gotoLevelSummary')) {
					this._setNextScene(new LevelSummaryScene(), { dontTransition: true });
				}

				if(ig.input.pressed('gotoGameWon')) {
					this._setNextScene(new GameWonScene(), { dontTransition: true });
				}

				if(ig.input.pressed('gotoLeaderboard')) {
					this._setNextScene(new LeaderboardScene(), { dontTransition: true });
				}

				if (ig.input.pressed('pause')) {
					ig.paused = !ig.paused;
				}
				if (ig.input.pressed('mute')) {
					this.toggleSound();
				}

				if(ig.input.pressed('screenshot')) {
					window.open(ig.system.canvas.toDataURL());
				}

				if (!ig.paused) {
					if(this._nextScene) {
						this._setScene(this._nextScene, this._nextSceneOptions);
						delete this._nextScene;
						delete this._nextSceneOptions;
					}

					this._currentScene.update();
				}
			},

			draw: function() {
				this.parent();
				this._currentScene.draw();

				if (ig.paused) {
					ig.system.context.save();
					ig.system.context.fillStyle = 'rgba(0, 0, 0, 0.4)';
					ig.system.context.fillRect(0, 0, ig.system.realWidth, ig.system.realHeight);
					ig.system.context.restore();
					this.font.draw('paused', ig.system.width / 2, ig.system.height / 2, ig.Font.ALIGN.CENTER);
				}

				if(!this._currentScene.hideMute) {
					var muteTile = this.muted ? 1 : 0;
					this.muteIcon.drawTile(10, ig.system.height - 12, muteTile, 8);
				}
			},

			toggleSound: function() {
				this.muted = !this.muted;
				var volume = this.muted ? 0 : 1;
				ig.soundManager.volume = ig.music.volume = volume;
			},

			_setNextScene: function(scene, options) {
				this._nextScene = scene;
				this._nextSceneOptions = options;
			},

			_setScene: function(incomingScene, options) {
				if (this._currentScene) {
					this._currentScene.un('scene-complete', this._onSceneCompleteBound);
				}

				var scene = null;

				if(!this._currentScene || (options && options.dontTransition)) {
					scene = incomingScene;
				} else {
					scene = new TransitionScene(this._currentScene, incomingScene);
				}

				scene.on('scene-complete', this._onSceneCompleteBound);
				this._currentScene = scene;
				ig.game = scene;
			},

			_onSceneComplete: function(nextSceneOrClassName, options) {
				var scene = null;
				if(typeof nextSceneOrClassName === 'string') {
					scene = new window[nextSceneOrClassName]();
				} else {
					scene = nextSceneOrClassName;
				}

				this._setNextScene(scene, options);
			}
		});

		function putMobileWarning() {
			var canvas = document.getElementById('canvas');
			var ctx = canvas.getContext('2d');

			ctx.textAlign = 'center';
			ctx.fillStyle = 'white';
			ctx.font = '20px sans-serif';
			ctx.fillText("you need a keyboard", canvas.width / 2, canvas.height / 2 - 11 );
			ctx.fillText("to play Dragon Plunder", canvas.width / 2, canvas.height /2 + 11 );
		}

		ig.track = function(entityName, msg, props) {
			var level = (ig.session && ig.session.level) || 'none';
			var trackMsg = entityName + ":" + level +": " + msg;

			if (local) {
				console.log('would have tracked', trackMsg, props);
			} else if (window.mixpanel) {
				window.mixpanel.track(trackMsg, props);
			}

		};

		function getUrlParam(name) {
			name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
			var regexS = "[\\?&]" + name + "=([^&#]*)";
			var regex = new RegExp(regexS);
			var results = regex.exec(window.location.href);
			if (results == null) return "";
			else return results[1];
		}

		var scale = getUrlParam('scale');
		var nosound = getUrlParam('nosound');
		var nomusic = getUrlParam('nomusic');

		if (nomusic) {
			ig.Music.prototype.play = function() {};
		}

		if(nosound) {
			ig.Sound.enabled = false;
			ig.Music.prototype.play = function() {};
			ig.Music.prototype.fadeOut = function() {};
			ig.Music.prototype.fadeIn = function() {};
		}

		scale = scale ? parseFloat(scale) : 2;
		ig.drawDebugInfo = !!getUrlParam('drawdebug');
		ig.requestedLevel = getUrlParam('level');

		if(ig.ua.mobile) {
			putMobileWarning();
		} else {
			setupLoader(function(Loader) {
				ig.main('#canvas', MainGame, 60, 256, 240, scale, Loader);
			});
		}
	});
})();
