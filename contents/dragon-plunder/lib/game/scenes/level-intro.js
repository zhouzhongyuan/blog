ig.module('game.scenes.level-intro').
requires('impact.game',

'plugins.observable',
'game.entities.label',
'game.entities.fade-in',
'game.levels.level1',
'game.levels.level2',
'game.entities.keys.x-key',
'game.entities.lighting'

).defines(function() {

	LevelIntroScene = ig.Game.extend({
		vel: 60,
		fadeInDuration: 3,

		introText: {
			'0': {
				x: 30,
				y: 20,
				text: undefined // introText0
			},
			'20': {
				x: 40,
				y: 60,
				text: undefined // introText1
			},
			'40': {
				x: 76,
				y: 80,
				text: undefined // introText2
			},
			'65': {
				x: 40,
				y: 128,
				text: undefined // introText3
			},
			'100': {
				x: 140,
				y: 220,
				text: 'Press     to begin'
			}
		},

		spawnedTexts: {},

		init: function() {
			ig.session.nextLevel();

			var Level = window['LevelLevel' + ig.session.level];
			this.loadLevel(ig.copy(Level));

			this.aboveGroundEntity = this.getEntityByName("aboveGround")
			this.aboveGroundEntity.zIndex = 999999;

			var grass = this.getEntitiesByType(EntityGrass) && this.getEntitiesByType(EntityGrass)[0];
			if(grass) {
				grass.zIndex = 1000000;
			}

			this.sortEntities();

			this.initIntroText();

			// cheap way to disable player movement during the intro
			this.getEntitiesByType(EntityPlayer)[0].update = function() {};

			this.installRocks();
			this.backgroundMaps.erase(this.getMapByName('crumbleTimings'));
			this.backgroundMaps.erase(this.getMapByName('rockTimings'));

			this.delayTimer = new ig.Timer(Number(this.getLevelConfig('levelIntroDelayDuration', 3)));

			this.lighting = this.spawnEntity(EntityLighting, 0, 0);

			this.getEntitiesByType(EntityLava).forEach(function(lava) {
				lava.forceStanding = true;
			});
		},

		installRocks: function() {
			var platformData = this.getMapByName('platforms').data;
			var cm = this.collisionMap.data;
			var ts = this.collisionMap.tilesize;

			var map = this.getMapByName('rockTimings');
			var data = map.data;

			for(var y = 0; y < data.length; ++y) {
				for(var x = 0; x < data[y].length; ++x) {
					var tile = data[y][x];

					if(tile && (platformData[y][x-1] || platformData[y][x+1])) {
						if(platformData[y][x] !== 0) {
							throw new Error("a rock was installed at a platform, dont do that");
						}
						cm[y][x] = 0;
						this.spawnEntity(EntityRock, x * ts, y * ts);
					}
				}
			}
		},

		initIntroText: function() {
			this.introText['0'].text = this.getLevelConfig('introText0');
			this.introText['20'].text = this.getLevelConfig('introText1');
			this.introText['40'].text = this.getLevelConfig('introText2');
			this.introText['65'].text = this.getLevelConfig('introText3');
		},

		getLevelConfig: function(key, defaultValue) {
			var config = this.getEntitiesByType(EntityLevelConfig)[0];
			return (config && config[key]) || defaultValue;
		},

		getCurrentAboveGroundVisibleHeight: function() {
			return this.aboveGroundEntity.size.y - this.screen.y - Math.abs(this.aboveGroundEntity.pos.y);
		},

		draw: function() {
			this.parent();
			this.lighting.prepareForFrame();

			var currentAboveGroundVisibleHeight = this.getCurrentAboveGroundVisibleHeight();
			if(currentAboveGroundVisibleHeight > 0) {
				this.lighting.eraseRect(0, 0, 256, currentAboveGroundVisibleHeight);
			}
			this.lighting.lightUpTreasure(this.getEntitiesByType(EntityTreasure), this.screen.y, true);

			this.lighting.drawIntoGameFrame();
		},

		update: function() {
			this.parent();
			var vel = this.delayTimer.delta() > 0 ? this.vel : 0;

			if(vel && this.spawnedTexts['0'] && !this.fadedOutIntro) {
				this.fadedOutIntro = true;
				this.spawnedTexts['0'].setFadeOut(2.5);

				ig.music.add('media/music/cave_ambience.*', 'ambience');
				ig.music.play('ambience');
			}

			if(ig.input.pressed('jump') && this.percent >= 100) {
				this.fireEvent('scene-complete', 'LevelScene', { dontTransition: true });
				return;
			}

			if(ig.input.state('jump')) {
				vel *= 6;
			}

			var max = this.height - ig.system.height;
			this.screen.y = (this.screen.y + (vel * ig.system.tick)).limit(0, max);
			this.percent = ((this.screen.y / max) * 100) | 0;

			if(this.percent >= 100 && this.getEntitiesByType(EntityXKey).length === 0) {
				this.spawnEntity(EntityXKey, 168, this.height - 21, {
					animate: true,
					fadeInDuration: this.fadeInDuration
				});
			}

			this.spawnText();
		},

		spawnText: function() {
			for(var key in this.introText) {
				if(this.introText.hasOwnProperty(key)) {
					var percent = +key;
					var value = this.introText[key];
					if(this.percent >= percent) {
						this.spawnedTexts[percent] = this.spawnEntity(EntityLabel, value.x, value.y, {
							label: value.text,
							fixed: true,
							fadeInDuration: this.fadeInDuration
						});
						delete this.introText[key];
					}
				}
			}
		}
	});

	Object.defineProperty(LevelIntroScene.prototype, 'height', {
		get: function() {
			var map = this.getMapByName('platforms');
			return (map && (map.height * this.collisionMap.tilesize)) || 0;
		}
	});
});
