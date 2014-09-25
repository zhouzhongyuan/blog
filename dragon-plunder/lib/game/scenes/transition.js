ig.module('game.scenes.transition').
requires(
	'impact.game'
).defines(function() {

	TransitionScene = ig.Game.extend({
		init: function(fromScene, toScene, duration) {
			this.duration = duration || 0.4;
			this._toScene = toScene;
			this._timer = new ig.Timer(this.duration);
			this._mode = "fadeOut";

			ig.game = this._currentScene = fromScene;

			Object.defineProperty(this, 'hideMute', {
				get: function() {
					return this._currentScene && this._currentScene.hideMute;
				}
			});
		},

		update: function() {
			this.parent();

			if(this._timer.delta() > 0) {
				if(this._mode === "fadeOut") {
					ig.game = this._currentScene = this._toScene;
					this._timer.set(this.duration);
					this._mode = "fadeIn";
				} else {
					this.fireEvent('scene-complete', this._toScene, { dontTransition: true });
				}
			}

			ig.game = this._currentScene;
			this._currentScene.update();
		},

		draw: function() {
			this._currentScene.draw();

			var alpha = (Math.abs(this._timer.delta()) / this.duration).limit(0.04, 1);

			if(this._mode === 'fadeOut') {
				alpha = 1 - alpha;
			}

			ig.system.context.save();
			ig.system.context.fillStyle = 'rgba(0, 0, 0, ' + alpha + ')';
			ig.system.context.fillRect(0, 0, ig.system.realWidth, ig.system.realHeight);
			ig.system.context.restore();
		}
	});
});
