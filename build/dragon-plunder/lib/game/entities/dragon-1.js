ig.module('game.entities.dragon-1')
.requires('game.entities.base-dragon')
.defines(function() {
	EntityDragon1 = EntityBaseDragon.extend({
		animSheet: new ig.AnimationSheet('media/levels/level1/dragon.png', 256, 240)
	});
});
