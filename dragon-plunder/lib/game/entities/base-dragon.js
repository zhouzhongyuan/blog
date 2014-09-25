ig.module('game.entities.base-dragon').requires('impact.entity').defines(function() {

  EntityBaseDragon = ig.Entity.extend({
    size: {
      x: 256,
      y: 240
    },
    offset: {
      x: 0,
      y: 0
    },
    
    init: function(x, y, settings) {
      this.parent(x, y, settings);
      this.addAnim('idle', 1, [0]);
    }
  });
});
