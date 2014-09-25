ig.module('game.entities.keys.base-key')
.requires(
	'impact.entity',
	'plugins.fade-in-entity',
	'plugins.plunder-entity'
)
.defines(function() {

	EntityBaseKey = ig.Entity.extend({
		gravityFactor: 0,
		size: {
			x: 16,
			y: 16
		},
		animSheet: new ig.AnimationSheet('media/keys.png', 16, 16),

		init: function(x, y, settings) {
			this.animSheet = new ig.AnimationSheet('media/keys.png', this.size.x, this.size.y);

			this.parent(x, y, settings);

			this.addAnim('animated', 1, this._getAnimationFrames()); 
		},

		_getAnimationFrames: function() {
			if(this.pressed) {
				return [this.frame+1];
			} else if(this.animationStartOpposite) {
				return [this.frame + 1, this.frame];
			} else if(this.animate) {
				return [this.frame, this.frame + 1];
			} else {
				return [this.frame];
			}
		}
	});

	EntityBaseKey.inject(MixinPlunder);
	EntityBaseKey.inject(MixinFadeInEntity);
});





