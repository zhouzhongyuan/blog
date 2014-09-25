ig.module('game.entities.mirror').requires('game.entities.treasure').defines(function() {

  EntityMirror = EntityTreasure.extend({
    value: 600,
    special: {
      level: 1,
      type: 'EntityMirror',
      offset: {
        x: 0,
        y: 0
      }
    },

    animSheet: new ig.AnimationSheet('media/mirror.png', 16, 16),

    addAnims: function() {
      this.addAnim('spawn', 0.08, [8,9,10,11,12,13], true);
      this.addAnim('idle', 1, [0]);
      this.addAnim('gleem', 0.1, [0, 1, 2, 3, 4, 5, 6, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      this.addAnim('falling', 1, [0]);
    }

  });
});
