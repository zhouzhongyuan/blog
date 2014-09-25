ig.module('game.entities.overlay')
.requires(
	'impact.entity',
	'plugins.plunder-entity'
)
.defines(function() {
	EntityOverlay = ig.Entity.extend({
		_wmDrawBox: true,
		_wmBoxColor: 'rgba(0, 25, 90, 0.7)',
		_wmScalable: true,
		isOverlay: true,

		init: function(x, y, settings) {
			this.parent(x, y, settings);

			this.timeline.tween({
				duration: this.fadeInDuration,
				property: 'alpha',
				from: 0,
				to: 0.9
			});
		},

		draw: function() {
			this.parent();

			var s = ig.system.scale;
			var ctx = ig.system.context;

			ctx.save();
			ctx.fillStyle = 'black';
			ctx.fillRect((this.pos.x - ig.game.screen.x) * s, (this.pos.y - ig.game.screen.y) * s, this.size.x * s, this.size.y * s);
			ctx.restore();
		}
	});

	EntityOverlay.inject(MixinPlunder);
});
