ig.module('game.entities.keys.a-key')
.requires('game.entities.keys.base-key')
.defines(function() {
	EntityAKey = EntityBaseKey.extend({
		frame: 4
	});
});


