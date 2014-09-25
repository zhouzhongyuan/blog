ig.module('game.entities.player')
.requires(
	'impact.entity',
	'plugins.center',
	'plugins.edges',
	'plugins.plunder-entity'

).defines(function() {

	EntityPlayer = ig.Entity.extend({
		jump1: new ig.Sound('media/sfx/jump_1.*'),
		jump2: new ig.Sound('media/sfx/jump_2.*'),
		jump3: new ig.Sound('media/sfx/jump_3.*'),
		respawnSfx: new ig.Sound('media/sfx/respawn.*'),
		fallDeathSfx: new ig.Sound('media/sfx/death_fall.*'),
		fallDeathVolume: 0.45,
		fireDeathSfx: new ig.Sound('media/sfx/death_fire.*'),
		spikeDeathSfx: new ig.Sound('media/sfx/death_spike.*'),
		rockDeathSfx: new ig.Sound('media/sfx/death_rock.*'),
		capeSfx: new ig.Sound('media/sfx/float.*'),

		size: {
			x: 4,
			y: 14
		},
		offset: {
			x: 6,
			y: 10
		},
		isPlayer: true,

		maxVel: {
			x: 0,
			y: 200
		},

		maxXVelAir: 76,
		maxXVelGround: 90,

		frictionAir: {
			x: 50,
			y: 0
		},

		frictionGround: {
			x: 200,
			y: 0
		},

		accelGround: 380,
		accelAir: 300,

		zIndex: 9000,
		health: 1,
		name: 'player',

		type: ig.Entity.TYPE.A,
		checkAgainst: ig.Entity.TYPE.NONE,

		animSheet: new ig.AnimationSheet('media/male.png', 16, 24),

		floatVel: 40,
		jump: 115,
		flip: false,
		jumpCount: 0,
		maxJumpCount: 1,

		init: function(x, y, settings) {
			Object.defineProperty(this, 'collides', {
				get: function() {
					if (this.vel.y < 0) {
						return ig.Entity.COLLIDES.NONE;
					}
					return ig.Entity.COLLIDES.PASSIVE;
				}
			});
			this.parent(x, y, settings);

			this.addAnim('idle', 1, [0]);
			this.addAnim('walk', 0.07, [0, 1, 2, 1]);
			this.addAnim('jump', 1, [3]);
			this.addAnim('fall', 1, [4]);
			this.addAnim('cape', 0.2, [5,6]);
			this.addAnim('fallDeath', 0.04, [8,9,10,11,12,13,14,15], true);
			this.addAnim('fireDeath', 0.06, [24, 25, 26, 27, 28, 29, 30, 31], true);
			this.addAnim('spikeDeath', 0.08, [32,33,34,35,36,37,38,39], true);
			this.addAnim('rockDeath', 0.08, [40,41,42,43,44,45,46,47], true);
			this.addAnim('spawn', 0.08, [16,17,18,19,20,21,22], true);

			this.jumpTimer = new ig.Timer();
			this.highJumpTimer = new ig.Timer();

			this.minY = this.pos.y;

			this.jumps = [
				this.jump1, this.jump2, this.jump3
			];
		},

		update: function() {
			if (this.currentAnim === this.anims.spawn) {
				this.currentAnim.update();
				if (this.currentAnim.loopCount) {
						this.currentAnim = this.anims.idle.rewind();
				}
				else {
						return;
				}
			}

			if (this.isInDeathAnim()) {
				this.parent();
				if (this.deathDelayTimer.delta() > 0) {
					this.fireEvent('death', this);
				}
				return;
			}

			var accel;
			if (this.standing) {
				this.maxVel.x = this.maxXVelGround;
				this.friction = this.frictionGround;
				accel = this.accelGround;
			} else {
				this.maxVel.x = this.maxXVelAir;
				this.friction = this.frictionAir;
				accel = this.accelAir;
			}

			if (ig.input.state('left')) {
				this.accel.x = -accel;
				this.flip = true;
			}
			else if (ig.input.state('right')) {
				this.accel.x = accel;
				this.flip = false;
			}
			else {
				this.accel.x = 0;
			}

			this.lastCapeIt = this.capeIt;
			this.capeIt = false;

			if (this.jumpCount < this.maxJumpCount && ig.input.pressed('jump')) {
				this.jumpCount += 1;
				this.jumpTimer.set(0.055);
				this.highJumpTimer.set(0.15);
				this.jumps.random().play();
			}

			if (!ig.input.state('jump')) {
				this.highJumpTimer.set(0);
			}

			if (this.jumpTimer.delta() < 0 || this.highJumpTimer.delta() < 0 || this.lastTimerWasUnderZero) {
				this.vel.y = -this.jump;
			}


			if (!this.standing && ig.input.state('jump') && this.vel.y > 0) {
				this.capeIt = true;
				this.vel.y = this.floatVel;
			}


			this.lastTimerWasUnderZero = (this.jumpTimer.delta() < 0 || this.highJumpTimer.delta() < 0);

			if (this.vel.y < 0) {
				this.currentAnim = this.anims.jump;
			}
			else if (this.vel.y > 0) {
				this.currentAnim = this.anims.fall;
			}
			else if (this.vel.x != 0) {
				this.currentAnim = this.anims.walk;
			}
			else {
				this.currentAnim = this.anims.idle;
			}

			this.currentAnim.flip.x = this.flip;

			if (this.capeIt) {
				this.currentAnim = this.anims.cape;
				this.currentAnim.flip.x = this.flip;

				if (!this.lastCapeIt) {
					this.capeSfx.play();
				}
			}

			if (this.standing && !ig.input.state('jump')) {
				this.jumpCount = 0;
			}

			this.parent();
			this.minY = Math.min(this.minY, this.pos.y);

			if (this.pos.y > this.minY + ig.system.height / 2 && this.checkpoint && this.hasCrumbled) {
				this.die('fallDeath');
			}

			this.boundToLevel();

			if (this.drawArc) {
				this.arcs = this.arcs || [];
				this.arcs.push(ig.copy(this.pos));

				while(this.arcs.length > 60) {
					this.arcs.shift();
				}
			}
		},

		isInDeathAnim: function() {
			return this.currentAnim === this.anims.fallDeath
				|| this.currentAnim === this.anims.fireDeath
				|| this.currentAnim === this.anims.spikeDeath
				|| this.currentAnim === this.anims.rockDeath;
		},

		boundToLevel: function() {
			if (this.pos.x < 0) {
				this.pos.x = 0;
			}
			if (this.pos.x > ig.system.width - this.size.x) {
				this.pos.x = ig.system.width - this.size.x;
			}
		},

		reset: function(x, y, skipRespawn) {
			delete this.dying;

			if (typeof x !== 'undefined') {
				this.pos.x = x;
			}
			if (typeof y !== 'undefined') {
				this.pos.y = y;
			}
			this.vel.x = 0;
			this.vel.y = 0;
			this.accel.x = 0;
			this.accel.y = 0;
			this.last.x = this.pos.x;
			this.last.y = this.pos.y;
			this.highJumpTimer.set(0);
			this.jumpTimer.set(0);
			this.lastTimerWasUnderZero = false;

			if (!skipRespawn) {
				var flip = this.currentAnim.flip.x;
				this.currentAnim = this.anims.spawn;
				this.currentAnim.flip.x = flip;
				this.currentAnim.rewind();

				this.respawnSfx.volume = 0.16;
				this.respawnSfx.play();
			}

			this.minY = this.pos.y;
		},

		setCheckpoint: function(checkpoint) {
			this.checkpoint = checkpoint;
			this.fireEvent('checkpoint-reached', this, checkpoint);
		},

		addTreasure: function(treasure) {
			this.fireEvent('treasure-received', this, treasure);
		},

		die: function(deathType) {
			deathType = deathType || 'fallDeath';

			if (!this.dying) {
				this.dying = true;
				var flip = this.currentAnim.flip.x;
				this.currentAnim = this.anims[deathType];
				this.currentAnim.flip.x = flip;
				this.currentAnim.rewind();

				var sfx = this[deathType + 'Sfx'];
				sfx.volume = this[deathType + 'Volume'] || 1;
				sfx.play();

				this.deathDelayTimer = new ig.Timer(1.3);
			}
		},

		draw: function() {
			this.parent();

			if (this.drawArc) {
				this.arcs.forEach(function(arc) {
					ig.system.context.fillStyle = 'red';
					var x = (arc.x - ig.game.screen.x) * ig.system.scale;
					var y = (arc.y - ig.game.screen.y) * ig.system.scale;
					ig.system.context.fillRect(x, y, 4, 4);
				});
			}
		}
	});

	EntityPlayer.inject(MixinCenter);
	EntityPlayer.inject(MixinEdges);
	EntityPlayer.inject(MixinPlunder);
});
