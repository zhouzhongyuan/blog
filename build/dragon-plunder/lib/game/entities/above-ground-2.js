ig.module('game.entities.above-ground-2')
.requires('game.entities.base-above-ground')
.defines(function() {

  EntityAboveGround2 = EntityBaseAboveGround.extend({
    animSheet: new ig.AnimationSheet('media/levels/level2/aboveGround.png', 256, 252)
  });
});
