ig.module('game.entities.rock').requires('impact.entity', 'plugins.center').defines(function() {

	EntityRock = ig.Entity.extend({
		hitSfx1: new ig.Sound('media/sfx/platform_hit_1.*'),
		hitSfx2: new ig.Sound('media/sfx/platform_hit_2.*'),
		hitSfx3: new ig.Sound('media/sfx/platform_hit_3.*'),

		fallSfx1: new ig.Sound('media/sfx/rock_fall_1.*'),
		fallSfx2: new ig.Sound('media/sfx/rock_fall_2.*'),
		fallSfx3: new ig.Sound('media/sfx/rock_fall_3.*'),

		size: {
			x: 8,
			y: 8
		},

		isRock: true,
		gravityFactor: 0,

		type: ig.Entity.TYPE.B,
		checkAgainst: ig.Entity.TYPE.BOTH,
		collides: ig.Entity.COLLIDES.PASSIVE,

		init: function(x, y, settings) {
			this.parent(x, y, settings);

			var level = ig.session && ig.session.level || 1;
			this.animSheet = new ig.AnimationSheet('media/levels/level' + level + '/rocks.png', 8, 8);

			var index = ((this.pos.x / 8) | 0) % 4;
			this.addAnim('idle', 1, [index]);

			if(typeof this.fallAfter !== 'undefined') {
				this.setFallAfter(this.fallAfter);
			}

			this.hitSfxs = [
				this.hitSfx1,
				this.hitSfx2,
				this.hitSfx3
			];

			this.fallSfxs = [
				this.fallSfx1,
				this.fallSfx2,
				this.fallSfx3
			];
		},

		update: function() {
			this.parent();

			if(this.timer && this.timer.delta() > 0) {
				delete this.timer;
				this.gravityFactor = 1;
				this.fallSfxs.random().play();
			}
		},

		setFallAfter: function(fallAfter) {
			this.timer = new ig.Timer(fallAfter);
		},

		fall: function() {
			this.setFallAfter(0);
		},

		shouldHurtPlayer: function(player) {
			// only hurt player if rock falls onto him
			return this.gravityFactor && this.center.y < player.center.y;
		},

		check: function(other) {
			if(other.isPlayer && this.shouldHurtPlayer(other)) {
				other.die('rockDeath');
				this.kill();
			}
		},

		die: function() {
			// switch to an explosion animation of some sort
			this.fireEvent('death', this);
			this.kill();
			this.hitSfxs.random().play();
		},

		handleMovementTrace: function(res) {
			if(res.collision.slope || res.collision.y) {
				this.die();
				return;
			}
			this.parent(res);
		}
	});

	EntityRock.inject(MixinCenter);
});
