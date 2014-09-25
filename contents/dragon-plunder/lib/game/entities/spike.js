ig.module('game.entities.spike').requires('impact.entity', 'plugins.edges').defines(function() {

	EntitySpike = ig.Entity.extend({
		size: {
			x: 2,
			y: 14
		},

		offset: {
			x: 3,
			y: 2
		},

		type: ig.Entity.TYPE.B,
		checkAgainst: ig.Entity.TYPE.A,
		gravityFactor: 0,

		init: function(x, y, settings) {
			this.parent(x, y, settings);
			this.initialY = this.pos.y;

			var level = ig.session && ig.session.level || 2;
			this.animSheet = new ig.AnimationSheet('media/levels/level' + level + '/spikes.png', 8, 16);
			var index = ((this.pos.x / 8) | 0) % 4;
			this.addAnim('idle', 1, [index]);
			this.addAnim('crumble', 0.4, [4,5,6,7]);

			this.currentAnim.flip.y = !!this.flip;
		},

		update: function() {
			this.parent();

			if(!this.pos.y === this.initialY) {
				this.currentAnim = this.anims.crumble;
				this.handleMovementTrace = this.noCollide;
			}
		},

		check: function(other) {
			if (other.isPlayer && !other.dying && this.pos.y === this.initialY) {
				other.die('spikeDeath');
			}
		},

		noCollide: function(res) {
			this.pos.x += this.vel.x * ig.system.tick;
			this.pos.y += this.vel.y * ig.system.tick;
		}
	});

	EntitySpike.inject(MixinEdges);
});
