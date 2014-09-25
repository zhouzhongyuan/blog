ig.module('game.entities.lava').requires('impact.entity').defines(function() {

	EntityLava = ig.Entity.extend({
		size: {
			x: 8,
			y: 32
		},
		zIndex: 99999,

		type: ig.Entity.TYPE.B,
		checkAgainst: ig.Entity.TYPE.A,

		init: function(x, y, settings) {
			this.parent(x, y, settings);

			this.animSheet = new ig.AnimationSheet('media/levels/level3/lava.png', 8, 32);
			this.addAnim('idle', 1, [0]);
			this.addAnim('geyser', 0.15, [0,1,2,3,4,5,4,5,6,4,6,5,4,6,3,2,0,0,0,0,0,0,0,0,0,0]);
			this.addAnim('crumble', 0.15, [7,8,9,10], true)

			this.idleTimer = new ig.Timer(this.idleDuration || 0);

			this.currentAnim = this.anims.idle;
		},

		update: function() {
			this.parent();

			if (this.idleTimer && this.idleTimer.delta() > 0) {
				delete this.idleTimer;
				this.currentAnim = this.anims.geyser;
				this.currentAnim.rewind();
			}

			if (!this.standing && !this.forceStanding && this.currentAnim !== this.anims.crumble) {
				this.currentAnim = this.anims.crumble;
				this.currentAnim.rewind();
			}

			if (this.currentAnim == this.anims.crumble && this.currentAnim.loopCount) {
				this.kill();
			}
		},

		check: function(other) {
			if (other.isPlayer
				&& !other.dying
				&& this.standing
				&& this.currentAnim.frame > 0
				&& this.currentAnim.frame < 16
			) {
				other.die('fireDeath');
			}
		}
	});

});
