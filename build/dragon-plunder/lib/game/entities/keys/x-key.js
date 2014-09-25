ig.module('game.entities.keys.x-key')
.requires('game.entities.keys.base-key')
.defines(function() {
	EntityXKey = EntityBaseKey.extend({
		frame: 0
	});
});

