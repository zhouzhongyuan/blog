ig.module('game.entities.dragon-2')
.requires('game.entities.base-dragon')
.defines(function() {
	EntityDragon2 = EntityBaseDragon.extend({
		animSheet: new ig.AnimationSheet('media/levels/level2/dragon.png', 256, 240)
	});
});
