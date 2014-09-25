ig.module('game.entities.label')
.requires(
	'impact.entity',
	'plugins.plunder-entity',
	'plugins.fade-in-entity'

).defines(function() {
	EntityLabel = ig.Entity.extend({
		zIndex: 1,
		gravityFactor: 0,
		collides: ig.Entity.COLLIDES.NONE,
		checkAgainst: ig.Entity.TYPE.NONE,

		zIndex: Infinity,

		_wmScalable: true,
		_wmDrawBox: true,
		_wmBoxColor: 'rgba(0, 255, 0, 0.3)',

		font: new ig.Font('media/font/04b03.font.png'),

		init: function(x, y, settings) {
			this.parent(x, y, settings);

			if(this.fontFile) {
				this.font = new ig.Font(this.fontFile);
			}
		},

		centerAt: function(x, y) {
			this.pos.y = y;
			this.pos.x = x;
			this.centered = true;
		},

		draw: function() {
			this.parent();
			if(this.label) {
				var centerArg = undefined;
				if(this.centered) {
					centerArg = ig.Font.ALIGN.CENTER;
				}
				this.font.draw(this.label, (this.pos.x - ig.game.screen.x), (this.pos.y + (this.size.y / 3) - ig.game.screen.y), centerArg);
			}
		},

		handleMovementTrace: function(res) {
			this.pos.x += this.vel.x * ig.system.tick;
			this.pos.y += this.vel.y * ig.system.tick;
		}
	});

	EntityLabel.inject(MixinPlunder);
	EntityLabel.inject(MixinFadeInEntity);
});


