ig.module('game.scenes.title').
requires(
	'impact.game',
	'impact.font',
	'plugins.observable',
	'game.session',
	'game.scenes.level',
	'game.entities.twitter',
	'game.levels.title'
).defines(function() {

	TitleScene = ig.Game.extend({
		buttonStart: new ig.Sound('media/sfx/x_game_start.*'),
		hideMute: true,

		init: function() {
			this.loadLevel(ig.copy(LevelTitle));
			ig.session = new Session();

			this.startMusic();

			this.timeout = new ig.Timer(8);
		},

		update: function() {
			this.parent();

			if(ig.input.pressed('jump')) {
				this.buttonStart.play();
				this.fireEvent('scene-complete', 'HowToPlayScene');
			}
			else if (ig.input.pressed('leaderboard')) {
				this.buttonStart.play();
				this.fireEvent('scene-complete', 'LeaderboardScene', { dontTransition: true });
			} else if(ig.input.pressed('about')) {
				this.fireEvent('scene-complete', 'AboutScene', { dontTransition: true });
			} else if(this.timeout.delta() > 0) {
				this.fireEvent('scene-complete', 'LeaderboardScene');
			}
		},

		startMusic: function() {
			if (!ig.music.namedTracks.calm || ig.music.namedTracks.calm != ig.music.currentTrack) {
				ig.music.add( 'media/music/calm_music.*', 'calm' );
				ig.music.play('calm');
			}
		},
	});
});
