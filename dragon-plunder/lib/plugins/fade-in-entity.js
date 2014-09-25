ig.module('plugins.fade-in-entity')
.defines(function() {

	MixinFadeInEntity = {
		init: function(x, y, settings) {
			this.parent(x, y, settings);

			if(this.fadeInDuration) {
				var me = this;
				
				this.timeline.sequence(function(ani) {
					if(me.delayDuration) {
						ani.wait(me.delayDuration);
					}
					ani.fadeIn({
						duration: me.fadeInDuration
					});
					ani.wait(typeof me.solidDuration === 'number' ? me.solidDuration : Infinity);
					
					if(me.fadeOutDuration) {
						ani.fadeOut({
							duration: me.fadeOutDuration
						});
						if(me.killAfterFadeOut) {
							ani.invoke(function() {
								me.kill();
							});
						}
					}
				});

				this.alpha = 0;
			}
		},

		setFadeOut: function(duration) {
			this.timeline.stop();

			var me = this;
			this.timeline.sequence(function(ani) {
				ani.fadeOut({
					duration: me.fadeOutDuration
				});
				if(me.killAfterFadeOut) {
					ani.invoke(function() {
						me.kill();
					});
				}
			});
			
		}
	};
});

