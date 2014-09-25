ig.module('game.entities.sprite')
.requires(
	'impact.entity',
	'plugins.fade-in-entity',
	'plugins.plunder-entity'
)
.defines(function() {

	EntitySprite = ig.Entity.extend({
		gravityFactor: 0,
		animSheet: new ig.AnimationSheet('media/matt.png', 16, 24),


		init: function(x, y, settings) {
			this.parent(x, y, settings);

			this.animSheet = new ig.AnimationSheet('media/' + this.img + '.png', this.width, this.height);

			this.size = {
				x: this.width,
				y: this.height
			};

			this.addAnim('idle', 1, [0]);
		},
		
		draw: function() {
			this.parent();
		}
	});

	EntitySprite.inject(MixinPlunder);
	EntitySprite.inject(MixinFadeInEntity);
});
