ig.module('game.entities.grass').requires('impact.entity').defines(function() {

	EntityGrass = ig.Entity.extend({
		size: {
			x: 256,
			y: 7
		},
		gravityFactor: 0,


		init: function(x, y, settings) {
			this.parent(x, y, settings);

			this.animSheet = new ig.AnimationSheet('media/grass.png', 256, 7);
			this.addAnim('breeze', 0.3, [0,1,0,1,0,0,0,1,0,1,0,1,0,0,1,0,1,1,0,0,1]);
		}
	});

});



