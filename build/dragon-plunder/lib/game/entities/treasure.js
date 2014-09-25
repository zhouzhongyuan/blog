ig.module('game.entities.treasure').requires(
	'impact.entity',
	'game.entities.label',
	'plugins.center',
	'plugins.edges',
	'plugins.fade-in-entity'
).defines(function() {

	EntityTreasure = ig.Entity.extend({
		size: {
			x: 16,
			y: 16
		},
		value: 100,

		pickUp1: new ig.Sound('media/sfx/treasure_1.*'),
		pickUp2: new ig.Sound('media/sfx/treasure_2.*'),
		pickUp3: new ig.Sound('media/sfx/treasure_3.*'),

		type: ig.Entity.TYPE.B,
		checkAgainst: ig.Entity.TYPE.A,
		collides: ig.Entity.COLLIDES.PASSIVE,

		animSheet: new ig.AnimationSheet('media/treasure.png', 16, 16),

		init: function(x, y, settings) {
			this.parent(x, y, settings);

			this.initialY = y;
			this.addAnims();

			if (this.skipSpawnAnim) {
				this.startingAnim = this.anims.gleem;
			} else {
				this.startingAnim = this.anims.spawn;
			}

			this.gleemDelayTimer = new ig.Timer(10 * Math.random());

			this.pickUps = [
			this.pickUp1, this.pickUp2, this.pickUp3];
		},

		addAnims: function() {
			this.addAnim('spawn', 0.08, [8,9,10,11,12,13], true);
			this.addAnim('idle', 1, [0]);
			this.addAnim('gleem', 0.1, [0, 1, 2, 3, 4, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
			this.addAnim('falling', 1, [7]);
		},

		update: function() {
			this.parent();

			if (this.pos.y >= this.initialY + 1 && !this.standing) {
				this.currentAnim = this.anims.falling;
			} else if (this.gleemDelayTimer.delta() > 0) {
				this.currentAnim = this.anims.gleem;
			} else {
				this.currentAnim = this.startingAnim;
			}
		},

		check: function(other) {
			if (other.isPlayer && !other.dying) {
				other.addTreasure(this);
				this.kill();
				this.pickUps.random().play();

				var label = ig.game.spawnEntity(EntityLabel, 0, 0, {
					label: this.value,
					fadeInDuration: 0.2,
					solidDuration: 0.3,
					fadeOutDuration: 1,
					killAfterFadeOut: true,
					vel: {
						x: 0,
						y: -10
					}
				});
				label.centerAt(this.center.x, this.top);
			}
		}
	});
	EntityTreasure.inject(MixinCenter);
	EntityTreasure.inject(MixinEdges);
	EntityTreasure.inject(MixinPlunder);
	EntityTreasure.inject(MixinFadeInEntity);

});
