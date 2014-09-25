ig.module('game.entities.howto.howto-jump').requires('game.entities.howto.howto-base-player').defines(function() {

	EntityHowtoJump = EntityHowtoBasePlayer.extend({
		gravityFactor: 1,
		friction: {
			x: 0,
			y: 50
		},

		init: function(x, y, settings) {
			this.parent(x, y, settings);

			this.initialPos = ig.copy(this.pos);
			this.currentAnim = this.anims.jump;

			this.delayTimer = new ig.Timer();

			this.lastStanding = true;
			this._jumping = true;
		},

		startJumping: function() {
			this._jumping = true;
		},

		stopJumping: function() {
			this._jumping = false;
		},

		update: function() {
			if(this.delayTimer.delta() < 0) {
				this.currentAnim = this.anims.idle;
				return;
			}

			this.parent();

			if(this._jumping) {
				if(this.standing && !this.lastStanding) {
					this.delayTimer.set(1);
				}

				if(this.standing) {
					this.vel.y = -100;
				}

				this.currentAnim = this.vel.y > 0 ?  this.anims.fall : this.anims.jump;

				this.lastStanding = this.standing;
			}
		}
	});

});








