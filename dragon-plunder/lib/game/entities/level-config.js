ig.module('game.entities.level-config').requires('impact.entity').defines(function() {

	EntityLevelConfig = ig.Entity.extend({
		zIndex: 1,
		_wmDrawBox: true,
		_wmBoxColor: 'blue',
		name: 'levelConfig'
	});
});


