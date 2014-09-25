ig.module('game.entities.keys.r-key')
.requires('game.entities.keys.base-key')
.defines(function() {
  EntityRKey = EntityBaseKey.extend({
    frame: 6
  });
});
