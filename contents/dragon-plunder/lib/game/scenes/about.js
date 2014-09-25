ig.module('game.scenes.about').
requires(
	'impact.game',
	'impact.font',
	'plugins.observable',
	'game.entities.twitter',
	'game.levels.about'
).defines(function() {

	AboutScene = ig.Game.extend({
		hideMute: true,

		fadeOutDuration: 0.4,

		init: function() {
			this.loadLevel(ig.copy(LevelAbout));
		},

		update: function() {
			this.parent();

			if (ig.input.pressed('about')) {
				this.fadeOutTimer = new ig.Timer(this.fadeOutDuration);
				this.setFadeOuts(this.fadeOutDuration);
			} else if(this.fadeOutTimer && this.fadeOutTimer.delta() > 0) {
				this.fireEvent('scene-complete', 'TitleScene', { dontTransition: true });
			}
		},

		setFadeOuts: function(duration) {
			var entities = this.getEntitiesByType(ig.Entity);
			for(var i = 0; i < entities.length; ++i) {
				if(entities[i].setFadeOut) {
					entities[i].setFadeOut(duration);
				}
			}
		}
	});
});
