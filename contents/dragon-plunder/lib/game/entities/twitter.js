ig.module(
	'game.entities.twitter'
)
.requires(
	'impact.entity',
	'plugins.fade-in-entity',
	'plugins.plunder-entity',
	'plugins.clickable'
)
.defines(function(){

var clickHandlerSetup = false;

EntityTwitter = ig.Entity.extend({
	size: {
		x: 8,
		y: 8
	},
	zIndex: 10000,

	animSheet: new ig.AnimationSheet('media/twitter.png', 8, 8),

	init: function(x, y, settings) {
		this.parent(x, y, settings);
		this.addAnim('idle', 1, [0]);

		if (!clickHandlerSetup) {
			clickHandlerSetup = true;
			this.onClick = function() {
				window.open('http://twitter.com/cityfortyone');
			};
		}
	}
});

	EntityTwitter.inject(MixinPlunder);
	EntityTwitter.inject(MixinFadeInEntity);
	EntityTwitter.inject(MixinClickable);
});
