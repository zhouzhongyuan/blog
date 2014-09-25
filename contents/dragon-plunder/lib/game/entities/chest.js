ig.module('game.entities.chest').requires('game.entities.treasure').defines(function() {

  EntityChest = EntityTreasure.extend({
    value: 1200,

    animSheet: new ig.AnimationSheet('media/chest.png', 16, 16),

    addAnims: function() {
      this.addAnim('spawn', 0.08, [0,1,2,3,4,5], true);
      this.addAnim('idle', 1, [5]);
      this.addAnim('gleem', 1, [5]);
      this.addAnim('falling', 1, [0]);
    }

  });
});
