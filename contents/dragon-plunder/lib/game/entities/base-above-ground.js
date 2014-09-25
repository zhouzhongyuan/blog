ig.module('game.entities.base-above-ground').requires('impact.entity').defines(function() {

  EntityBaseAboveGround = ig.Entity.extend({
    size: {
      x: 256,
      y: 252
    },
    zIndex: -10,
    gravityFactor: 0,

    init: function(x, y, settings) {
      this.parent(x, y, settings);
      this.addAnim('idle', 1, [0]);
    }
  });

});
