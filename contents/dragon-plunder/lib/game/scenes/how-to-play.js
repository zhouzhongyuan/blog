ig.module('game.scenes.how-to-play').
requires('impact.game', 'impact.font',

'game.levels.how-to-play',
'game.entities.lighting',

'plugins.observable'

).defines(function() {

	HowToPlayScene = ig.Game.extend({
		gravity: 250,

		font: new ig.Font('media/font/brownFont.png'),
		buttonStart: new ig.Sound('media/sfx/x_game_start.*'),

		init: function() {
			this.loadLevel(ig.copy(LevelHowToPlay));

			// TOOD: figure out why prerendering is so expensive on this screen
			// at scale=3. it's just fine in the game level, which is like 8 times bigger!
			this.backgroundMaps.forEach(function(m) {
				m.preRender = false;
			});
			this.lighting = this.spawnEntity(EntityLighting, 0, 0);
		},

		update: function() {
			this.parent();

			if(ig.input.pressed('jump')) {
				this.buttonStart.play();
				ig.music.stop();
				this.fireEvent('scene-complete', 'LevelIntroScene');
			}
		},

		draw: function() {
			this.parent();

			this.lighting.prepareForFrame();
			this.lighting.drawIntoGameFrame();
		}
	});
});
