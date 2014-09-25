ig.module('game.entities.checkpoint').requires('impact.entity', 'plugins.edges', 'plugins.center', 'game.entities.label').defines(function() {

	EntityCheckpoint = ig.Entity.extend({
		size: {
			x: 16,
			y: 24
		},

		type: ig.Entity.TYPE.A,
		checkAgainst: ig.Entity.TYPE.A,
		sfx: new ig.Sound('media/sfx/checkpoint.*'),

		init: function(x, y, settings) {
			this.parent(x, y, settings);
			var level = ig.session && ig.session.level || 1;
			this.animSheet = new ig.AnimationSheet('media/levels/level' + level + '/checkpoint.png', 16, 24),

			this.addAnim('idle', 1, [0]);
			this.addAnim('activated', 1, [1]);

			this.index = parseInt(this.index, 10);
		},

		activate: function() {
			ig.track('checkpoint', 'reached ' + this.index);
			this.sfx.volume = 0.5;
			this.sfx.play();
			this.activated = true;
			this.currentAnim = this.anims.activated;

			if (this.activationLabel) {
				var label = ig.game.spawnEntity(EntityLabel, 0, 0, {
					label: this.activationLabel,
					fadeInDuration: 1,
					solidDuration: 0.4,
					fadeOutDuration: 0.5,
					killAfterFadeOut: true,
					vel: {
						x: 0,
						y: -10
					}
				});
				label.centerAt(this.pos.x + (this.size.x / 2), this.top - 14);
			}
		},

		check: function(other) {
			if(other.isPlayer && !this.activated) {
				if(!other.checkpoint || other.checkpoint.index < this.index) {
					other.setCheckpoint(this);
					this.activate();
				}
			}
		}
	});

	EntityCheckpoint.inject(MixinEdges);
	EntityCheckpoint.inject(MixinCenter);
});
