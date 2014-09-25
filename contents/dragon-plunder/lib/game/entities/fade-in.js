ig.module('game.entities.fade-in').requires('impact.entity').defines(function() {
	EntityFadeIn = ig.Entity.extend({
		_wmDrawBox: true,
		_wmBoxColor: 'rgba(255, 255, 0, 0.7)',
		_wmScalable: true,

		draw: function() {
			this.parent();

			var ctx = ig.system.context;
			ctx.save();

			ctx.fillStyle = 'rgba(0, 0, 0, ' + (typeof this.alpha !== 'number' ? 1 : this.alpha) + ')';
			ctx.fillRect(0, 0, ig.system.realWidth, ig.system.realHeight);
			ctx.restore();
		}
	});
});

