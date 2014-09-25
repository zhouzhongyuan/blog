ig.module('game.entities.crumble-trigger')
.requires(
	'game.entities.crumble-region'
)
.defines(function() {

	EntityCrumbleTrigger = EntityCrumbleRegion.extend({
		_wmBoxColor: 'rgba(255, 0, 0, 0.3)',
		isCrumbleTrigger: true,

		init: function(x, y, settings) {
			this.parent(x, y, settings);
		},

		check: function(other) {
			if (other.isPlayer && other.standing && ig.game.installCrumbleTimings) {
				ig.game.installCrumbleTimings(this.crumbleTiles);
				ig.game.installRockTimings(this.rockTiles);

				this.installTargetTimings();

				this.kill();
			}
		},

		installTargetTimings: function() {
			if (this.target) {
				for (var t in this.target) {
					if (this.target.hasOwnProperty(t)) {
						var name = this.target[t];
						var trigger = ig.game.getEntityByName(name);
						if (trigger) {
							ig.game.installCrumbleTimings(trigger.crumbleTiles);
							ig.game.installRockTimings(trigger.rockTiles);
							trigger.kill();
						}
					}
				}
			}
		}
	});
});
