ig.module('game.scenes.level').
requires('impact.game', 'impact.font',

'game.entities.player',
'game.entities.rock',
'game.entities.crumble',
'game.entities.door.goal-trigger',
'game.entities.crumble-trigger',
'game.entities.level-config',
'game.levels.level1',
'game.levels.level2',
'game.levels.level3',
'game.entities.lighting',

'plugins.observable'

).defines(function() {

	LevelScene = ig.Game.extend({
		ledge1: new ig.Sound('media/sfx/ledge_1.*'),
		ledge2: new ig.Sound('media/sfx/ledge_2.*'),
		ledge3: new ig.Sound('media/sfx/ledge_3.*'),
		ledge4: new ig.Sound('media/sfx/ledge_4.*'),
		ledge5: new ig.Sound('media/sfx/ledge_5.*'),
		wall1: new ig.Sound('media/sfx/wall_1.*'),
		wall2: new ig.Sound('media/sfx/wall_2.*'),
		wall3: new ig.Sound('media/sfx/wall_3.*'),

		font: new ig.Font('media/font/04b03.font.png'),

		shakeLength: 1.5,
		shakeAmount: 2.5,
		lastCrumbleTime: 0,
		rumbleSfxDelay: 3,
		gravity: 250,

		init: function() {
			this.initLevel(ig.session.level, true);
			delete this.player.checkpoint;
			delete this.player.hasCrumbled;

			ig.session.levelName = this.getLevelConfig('levelName', 'Level ' + ig.session.level);

			this.ledgeSfxs = [
				this.ledge1,
				this.ledge2,
				this.ledge3,
				this.ledge4,
				this.ledge5
			];

			this.wallSfxs = [
				this.wall1,
				this.wall2,
				this.wall3
			];

			this.startMusic();
			this.levelTimer = new ig.Timer();

			this.lighting = this.spawnEntity(EntityLighting, 0, 0);
		},

		getLevelConfig: function(key, defaultValue) {
			var config = this.getEntitiesByType(EntityLevelConfig)[0];
			return (config && config[key]) || defaultValue;
		},

		initLevel: function(levelIndex, firstTime) {
			var level = window['LevelLevel' + levelIndex];
			this.loadLevel(ig.copy(level));

			if (firstTime) {
				var treasures = this.getEntitiesByType(EntityTreasure);
				for(var i = 0; i < treasures.length; ++i) {
					treasures[i].currentAnim = treasures[i].startingAnim = treasures[i].anims.spawn = treasures[i].anims.gleem;
				}
			}

			this.getEntitiesByType(EntityCrumble).forEach(function(crumble) {
				crumble.kill();
			});

			this.shakeTimer = new ig.Timer();
			this.rumbleSfxTimer = new ig.Timer();

			this.initPlayer();
			this.installRocks();
			this.initTriggers();

			// TODO: this is a memory leak
			this.goal = this.getEntitiesByType(EntityGoalTrigger)[0];
			this.goal.on('player-made-it', this.onPlayerMadeIt.bind(this));
		},

		initPlayer: function() {
			var playerFromLevel = this.getEntitiesByType(EntityPlayer)[0];

			if (ig.session.player) {
				if (ig.session.player !== playerFromLevel) {
					if (playerFromLevel) {
						this.entities.erase(playerFromLevel);
						delete this.namedEntities[playerFromLevel.name];
					}

					this.entities.push(ig.session.player);
					if (ig.session.player.name) {
						this.namedEntities[ig.session.player.name] = ig.session.player;
					}
				}
			} else {
				ig.session.player = playerFromLevel;
			}

			this.player = ig.session.player;

			if(playerFromLevel) {
				this.player.pos.x = playerFromLevel.pos.x;
				this.player.pos.y = playerFromLevel.pos.y;
			}

			this.onPlayerDeathBound = this.onPlayerDeathBound || this.onPlayerDeath.bind(this);
			this.onPlayerTreasureReceivedBound = this.onPlayerTreasureReceivedBound || this.onPlayerTreasureReceived.bind(this);
			this.onPlayerCheckpointReachedBound = this.onPlayerCheckpointReachedBound || this.onPlayerCheckpointReached.bind(this);

			this.player.unAll('death', this.onPlayerDeathBound);
			this.player.on('death', this.onPlayerDeathBound);

			this.player.unAll('checkpoint-reached', this.onPlayerCheckpointReachedBound);
			this.player.on('checkpoint-reached', this.onPlayerCheckpointReachedBound);

			this.player.unAll('treasure-received', this.onPlayerTreasureReceivedBound);
			this.player.on('treasure-received', this.onPlayerTreasureReceivedBound);

			this.screen.y = Math.min(this.player.pos.y - ig.system.height / 2, this.height - ig.system.height);

			this.player.reset(undefined, undefined, true);

			this.initialPlayerPos = ig.copy(this.player.pos);

			this.sortEntitiesDeferred();
		},

		startMusic: function() {
			ig.music.add('media/music/cave_ambience.*', 'ambience');
			ig.music.stop();
			ig.music.play('ambience');
			ig.music.loop = true;
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

					if(tile) {
						if(platformData[y][x] !== 0) {
							throw new Error("a rock was installed at a platform, dont do that");
						}
						cm[y][x] = 0;
						if(!this.isOnScreen(y*ts)) {
							// don't install rocks that are currently on screen, this avoids
							// the situation where the player respawns at a checkpoint and some rock is hanging there
							var rock = this.spawnEntity(EntityRock, x * ts, y * ts);
							rock.on('death', this.onRockDeath.bind(this));
						}
					}
				}
			}
		},

		isOnScreen: function(y) {
			// TODO: this is nasty, makes isOnScreen only callable at certain times.
			var playerY = (this.player.checkpoint && this.player.checkpoint.pos.y) || this.player.pos.y;
			return Math.abs(playerY - y) <= ig.system.height / 2;
		},

		getTileAtPixelPosition: function(px, py) {
			var ts = this.collisionMap.tilesize;

			var tx = (px / ts) | 0;
			var ty = (py / ts) | 0;

			return { x: tx, y: ty };
		},

		getTilesBehindTrigger: function(type, trigger) {
			var start = this.getTileAtPixelPosition(trigger.left, trigger.top);
			var end = this.getTileAtPixelPosition(trigger.right, trigger.bottom);

			var tiles = [];

			var timings = this.getMapByName(type + 'Timings');

			for(var y = start.y; y <= end.y; ++y) {
				for(var x = start.x; x <= end.x; ++x) {
					var value = timings.data[y] && timings.data[y][x];

					if(value) {
						tiles.push({
							x: x,
							y: y,
							value: value
						});
					}
				}
			}

			return tiles;
		},

		initTriggers: function() {
			this.crumbleTimings = {};
			this.rockTimings = {};

			var triggers = this.getEntitiesByType(EntityCrumbleRegion);

			for(var t = 0; t < triggers.length; ++t) {
				var trigger = triggers[t];

				trigger.crumbleTiles = this.getTilesBehindTrigger('crumble', trigger);
				trigger.rockTiles = this.getTilesBehindTrigger('rock', trigger);
				this.placeRocksInsideTiles(trigger.rockTiles);
			}

			this.backgroundMaps.erase(this.getMapByName('crumbleTimings'));
			this.backgroundMaps.erase(this.getMapByName('rockTimings'));
		},

		findAtTilePosition: function(pos, entities) {
			for(var i = 0; i < entities.length; ++i) {
				var e = entities[i];

				if(e.pos.x / 8 === pos.x && e.pos.y / 8 === pos.y) {
					return e;
				}
			}
		},

		placeRocksInsideTiles: function(rockTiles) {
			var rocks = this.getEntitiesByType(EntityRock);

			for(var t = 0; t < rockTiles.length; ++t) {
				var tile = rockTiles[t];

				tile.rock = this.findAtTilePosition(tile, rocks);
			}
		},

		installCrumbleTimings: function(tiles) {
			var currentTime = this.levelTimer.delta();

			for (var i = 0; i < tiles.length; ++i) {
				var tile = tiles[i];

				if (tile.value) {
					var value = tile.value - 1;

					if (value === 0) {
						this.crumbleAt(tile);
						if (this.rumbleSfxTimer.delta() > 0) {
							this.rumbleSfxTimer.set(this.rumbleSfxDelay);
							this.playCrumbleSound(tile);
						}
					} else if (value > 0) {
						var crumbleTime = currentTime + (value/5);
						this.crumbleTimings[crumbleTime] = this.crumbleTimings[crumbleTime] || [];
						var timings = this.crumbleTimings[crumbleTime];
						timings.push(tile);
					}
				}
			}
		},

		installRockTimings: function(tiles) {
			var currentTime = this.levelTimer.delta();

			for(var i = 0; i < tiles.length; ++i) {
				var tile = tiles[i];

				if(tile.value) {
					var value = tile.value - 1;

					if(value === 0 && tile.rock) {
						tile.rock.fall();
					} else if(value > 0) {
						var fallTime = currentTime + (value/5);
						this.rockTimings[fallTime] = this.rockTimings[fallTime] || [];
						var timings = this.rockTimings[fallTime];
						timings.push(tile);
					}
				}
			}
		},

		onPlayerTreasureReceived: function(player, treasure) {
			ig.session.addPendingTreasure(treasure);
		},

		onPlayerCheckpointReached: function(player, checkpoint) {
			ig.session.securePendingTreasure();
			ig.music.stop();
			ig.music.play('ambience');
		},

		onPlayerDeath: function(player) {
			ig.music.play('ambience');
			var index = (!player.checkpoint || player.checkpoint.index == null) ? 'none' : player.checkpoint.index;
			ig.track('player', 'death.reached.' + index);

			ig.session.clearPendingTreasure();
			ig.session.addDeath();

			this.initLevel(ig.session.level);

			if (this.player.checkpoint) {
				var newCheckpoint = this.getEntitiesByType(EntityCheckpoint).filter(function(cp) {
					return cp.index === this.player.checkpoint.index;
				}, this).pop();

				if (newCheckpoint) {
					newCheckpoint.activate();
					// move player to checkpoint
					this.player.reset(newCheckpoint.pos.x, newCheckpoint.pos.y + (newCheckpoint.size.y - this.player.size.y));
					// delete all platforms below checkpoint
					this.deleteAllPlatformsBelow(newCheckpoint.bottom);
					this.deleteAllEntitiesBelow(newCheckpoint.bottom);
					this.deleteAllTreasuresAt(ig.session.getSecuredTreasure());
					// move camera to where player is
					this.screen.y = Math.min(this.player.pos.y - ig.system.height / 2, this.height - ig.system.height);
				}
			} else {
				this.player.reset();
			}
		},

		deleteAllTreasuresAt: function(treasureLocations) {
			var treasures = this.getEntitiesByType(EntityTreasure);

			for(var t = 0, tl = treasures.length; t < tl; ++t) {
				var treasure = treasures[t];
				if(this.hasLocation(treasureLocations, treasure)) {
					this.entities.erase(treasure);
				}
			}
		},

		hasLocation: function(locations, entity) {
			for(var i = 0, l = locations.length; i < l; ++i) {
				var location = locations[i];
				if(entity.pos.x === location.x && entity.pos.y === location.y) {
					return true;
				}
			}
			return false;
		},

		deleteAllEntitiesBelow: function(y) {
			var entities = this.getEntitiesByType(ig.Entity);

			for(var i = 0; i < entities.length; ++i) {
				var entity = entities[i];
				if(entity !== this.player && entity.pos.y >= y) {
					this.entities.erase(entity);
				}
			}
		},

		deleteAllPlatformsBelow: function(y) {
			var tile = this.getTileAtPixelPosition(0, y);

			var map = this.getMapByName('platforms');

			for(var y = tile.y + 1; y < map.data.length; ++y) {
				for(var x = 0; x < map.data[y].length; ++x) {
					map.data[y][x] = 0;
					this.collisionMap.data[y][x] = 0;
				}
			}
			map.preRender = true;
			delete map.preRenderedChunks;
		},

		onPlayerMadeIt: function() {
			ig.session.setTime(this.levelTimer.delta());
			ig.session.securePendingTreasure();
			this.fireEvent('scene-complete', 'LevelSummaryScene', { dontTransition: true });
		},

		update: function() {
			this.parent();

			if(ig.input.pressed('reset-level')) {
				this.fireEvent('scene-complete', 'LevelScene', { dontTransition: true });
				return;
			}

			this.screen.y = Math.min(this.player.pos.y - ig.system.height / 2, this.height - ig.system.height);

			if(this.player.pos.y > this.height) {
				this.player.die();
			}

			this.updateCrumbles();
			this.updateRocks();
		},

		onRockDeath: function(rock) {
			// TODO: make this a tile location plugin
			var ts = this.collisionMap.tilesize;
			var x = Math.floor(rock.center.x / ts);
			var y = Math.round(rock.center.y / ts) + 1;

			this.crumbleAt({x: x, y: y});
		},

		updateCrumbles: function() {
			var time = this.levelTimer.delta();

			for (var key in this.crumbleTimings) {
				if (this.crumbleTimings.hasOwnProperty(key)) {
					var crumbleTime = parseFloat(key);

					if (time >= crumbleTime) {
						var tiles = this.crumbleTimings[key];
						if (tiles) {
							for (var t = 0; t < tiles.length; ++t) {
								this.crumbleAt(tiles[t]);
								this.shakeTimer.set(this.shakeLength);

								if (this.rumbleSfxTimer.delta() > 0) {
									this.rumbleSfxTimer.set(this.rumbleSfxDelay);
									this.playCrumbleSound(tiles[t]);
								}
							}
						}
						delete this.crumbleTimings[key];
					}
				}
			}
		},

		updateRocks: function() {
			var time = this.levelTimer.delta();

			for(var key in this.rockTimings) {
				if(this.rockTimings.hasOwnProperty(key)) {
					var rockTime = parseFloat(key);

					if(time >= rockTime) {
						var tiles = this.rockTimings[key];
						if(tiles) {
							for(var t = 0; t < tiles.length; ++t) {
								if(tiles[t].rock) {
									tiles[t].rock.fall();
								}
							}
						}
						delete this.rockTimings[key];
					}
				}
			}
		},

		draw: function() {
			var realX = this.screen.x;
			var realY = this.screen.y;

			if(this.shakeTimer.delta() < 0 && !ig.paused) {
				this.screen.x += Math.random() * this.shakeAmount;
				this.screen.y += Math.random() * this.shakeAmount;
			}

			this.parent();

			if(this.shakeTimer.delta() < 0 && !ig.paused) {
				this.screen.x = realX;
				this.screen.y = realY;
			}

			this.lighting.prepareForFrame();
			this.lighting.lightUpTreasure(this.getEntitiesByType(EntityTreasure), this.screen.y);
			this.lighting.lightUpCheckpoints(this.getEntitiesByType(EntityCheckpoint), this.screen.y);
			this.lighting.drawIntoGameFrame();

			this.font.draw('gold: ' + ig.session.getGold(), 12, 4);
			this.font.draw('deaths: ' + ig.session.getDeaths(), 80, 4);
		},

		playCrumbleSound: function(pos) {
			if(pos.x === 0 || pos.x === this.collisionMap.width - 1) {
				this.wallSfxs.random().play();
			} else {
				this.ledgeSfxs.random().play();
			}
		},

		crumbleAt: function(pos) {
			var x = pos.x;
			var y = pos.y;
			this.collisionMap.data[y][x] = 0;

			var map = this.getMapByName('platforms');

			if(map.data[y][x] !== 0) {
				var tileData = map.data[y][x];
				map.clearTileAt(pos);

				this.spawnEntity(EntityCrumble, x * 8, y * 8, {
					small: this.isSmallPlatform(tileData),
					levelNumber: ig.session.level
				});
			}

			this.player.hasCrumbled = true;
		},

		isSmallPlatform: function(value) {
			// big platforms are 1-10, small are 52-60
			return value > 10;
		}
	});

	Object.defineProperty(LevelScene.prototype, 'height', {
		get: function() {
			var map = this.getMapByName('platforms');
			return (map && (map.height * this.collisionMap.tilesize)) || 0;
		}
	});
});
