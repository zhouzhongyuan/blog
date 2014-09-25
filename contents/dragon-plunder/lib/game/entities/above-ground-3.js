ig.module('game.entities.above-ground-3')
.requires('game.entities.base-above-ground')
.defines(function() {

  EntityAboveGround3 = EntityBaseAboveGround.extend({
    animSheet: new ig.AnimationSheet('media/levels/level3/aboveGround.png', 256, 252)
  });
});
