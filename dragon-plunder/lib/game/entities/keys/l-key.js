ig.module('game.entities.keys.l-key')
.requires('game.entities.keys.base-key')
.defines(function() {
  EntityLKey = EntityBaseKey.extend({
    frame: 2
  });
});
