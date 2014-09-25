ig.module('game.entities.dragon-3')
.requires('game.entities.base-dragon')
.defines(function() {
  EntityDragon3 = EntityBaseDragon.extend({
    animSheet: new ig.AnimationSheet('media/levels/level3/dragon.png', 256, 240)
  });
});
