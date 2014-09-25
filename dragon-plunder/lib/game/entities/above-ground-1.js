ig.module('game.entities.above-ground-1')
.requires('game.entities.base-above-ground')
.defines(function() {

	EntityAboveGround1 = EntityBaseAboveGround.extend({
		animSheet: new ig.AnimationSheet('media/levels/level1/aboveGround.png', 256, 252)
	});
});
