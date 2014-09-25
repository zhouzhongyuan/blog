ig.module('game.entities.lighting').requires('impact.entity').defines(function() {
  EntityLighting = ig.Entity.extend({
    lightingImage: new ig.Image('media/lighting.png'),
    glowImage: new ig.Image('media/treasureGlow.png'),

    init: function(x, y, settings) {
      this.parent(x, y, settings);

      this._canvas = document.createElement('canvas');
      this._canvas.width = 256 * ig.system.scale;
      this._canvas.height = 240 * ig.system.scale;
      this._context = this._canvas.getContext('2d');
    },

    prepareForFrame: function() {
      this.eraseRect(0, 0, 256, 240);
      this._context.drawImage(this.lightingImage.data, 0, 0);
    },

    eraseRect: function(x, y, w, h) {
      this._context.clearRect(
        x * ig.system.scale,
        y * ig.system.scale,
        w * ig.system.scale,
        h * ig.system.scale
      );
    },

    lightUpCheckpoints: function(checkpoints, screenY) {
      checkpoints.forEach(function(checkpoint) {
        if (checkpoint.activated) {
          var x = checkpoint.pos.x - 8;
          var y = checkpoint.pos.y - screenY - 8;

          this.glowAt(x, y);
        }
      }, this);
    },

    lightUpTreasure: function(treasures, screenY, forceStanding) {
      treasures.forEach(function(treasure) {
        var standing = forceStanding || treasure.standing;
        var x = treasure.pos.x - 8;
        var y = treasure.pos.y - screenY + 1;

        if (!standing) {
          y -= 6;
        }
        if(y > -16 && y < 240) {
          this.glowAt(x, y, standing);
        }
      }, this);
    },

    glowAt: function(x, y, half) {
      this._context.globalCompositeOperation = 'xor';
      this._context.globalAlpha = 0.4;

      var height = this.glowImage.height * ig.system.scale;
      if (half) {
        height /= 2;
      }

      this._context.drawImage(
        this.glowImage.data,
        0,
        0,
        this.glowImage.width * ig.system.scale,
        height,
        ig.system.getDrawPos(x),
        ig.system.getDrawPos(y),
        this.glowImage.width * ig.system.scale,
        height
      );
      this._context.globalCompositeOperation = 'source-over';
      this._context.globalAlpha = 1;
    },

    drawIntoGameFrame: function() {
      ig.system.context.drawImage(this._canvas, 0, 0);
    }
  });
});
