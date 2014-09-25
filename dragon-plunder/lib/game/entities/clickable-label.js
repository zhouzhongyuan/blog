ig.module('game.entities.clickable-label')
.requires('game.entities.label',
	'plugins.clickable'
)
.defines(function() {
		EntityClickableLabel = EntityLabel.extend({

			onClick: function() {
				if(this.url) {
					window.open(this.	url);
				}
			}

		});

		EntityClickableLabel.inject(MixinClickable);
});

