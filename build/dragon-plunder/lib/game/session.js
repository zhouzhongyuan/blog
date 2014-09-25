ig.module('game.session').
defines(function() {

	Session = function() {
		this.level = 0;
		this.pendingTreasure = [];
		this.securedTreasure = [];
		this.deaths = [];
		this.times = [];
	};

	function getDeathPenalty(numDeaths) {
		var deathPenalties = [10, 9, 8, 7, 6, 5, 4, 3];
		var penalty = 0;
		for(var i = 0; i < numDeaths; ++i) {
			penalty += deathPenalties[i] || 0;
		}

		return penalty * 5;
	}

	// gold is in 100's, ie gathered 5 pieces of gold, then gold = 500
	// time is in seconds
	Session.calcScore = function(gold, time, deaths) {
		var score = (gold || 0) * 100 / (time || 1) - getDeathPenalty(deaths);//((deaths || 0) * 10);
		return Math.max(0, score | 0);
	};

	Session.prototype = {
		getTotalScore: function() {
			var totalScore = 0;
			for(var level = 1; level < this.deaths.length; ++level) {
				totalScore += this.getScore(level);
			}

			return totalScore;
		},

		getTotalGold: function() {
			var totalGold = 0;
			for(var level = 1; level < this.deaths.length; ++level) {
				totalGold += this.getGold(level);
			}

			return totalGold;
		},

		getTotalTime: function() {
			var totalTime = 0;
			for(var level = 1; level < this.deaths.length; ++level) {
				totalTime += this.getTime(level);
			}

			return totalTime;
		},

		getTotalDeaths: function() {
			var totalDeaths = 0;
			for(var level = 1; level < this.deaths.length; ++level) {
				totalDeaths += this.getDeaths(level);
			}

			return totalDeaths;
		},

		getScore: function(level) {
			if(typeof level === 'undefined') {
				level = this.level;
			}

			return Session.calcScore(this.getGold(level), this.getTime(level), this.getDeaths(level));
		},

		resetLevel: function() {
			this.level -= 1;
			this.nextLevel();
		},

		nextLevel: function() {
			this.level += 1;
			this.pendingTreasure[this.level] = [];
			this.securedTreasure[this.level] = [];
			this.deaths[this.level] = 0;
			this.times[this.level] = 0;
		},

		addPendingTreasure: function(item) {
			this.pendingTreasure[this.level].push({
				x: item.pos.x,
				y: item.pos.y,
				value: item.value,
				special: item.special
			});
		},

		gotSpecialTreasure: function(level) {
			level = level || this.level;
			if (!this.securedTreasure || !this.securedTreasure[level]) {
				return;
			}

			var specialTreasure = this.securedTreasure[level].filter(function(t) {
				return t.special && t.special.level == level;
			}, this).pop();

			return specialTreasure && specialTreasure.special;
		},

		getSecuredTreasure: function(level) {
			return this.securedTreasure[level || this.level];
		},

		securePendingTreasure: function() {
			var pendingTreasure = this.pendingTreasure[this.level];
			var securedTreasure = this.securedTreasure[this.level];

			for(var i = 0, l = pendingTreasure.length; i < l; ++i) {
				securedTreasure.push(pendingTreasure[i]);
			}

			this.pendingTreasure[this.level] = [];
		},

		clearPendingTreasure: function(level) {
			this.pendingTreasure[level || this.level] = [];
		},

		addDeath: function() {
			this.deaths[this.level] += 1;
		},

		setTime: function(time) {
			this.times[this.level] = time;
		},

		getGold: function(level) {
			level = level || this.level;
			return this._getGoldValue(this.pendingTreasure[level]) + this._getGoldValue(this.getSecuredTreasure(level));
		},

		getDeaths: function(level) {
			return this._get('deaths', level);
		},

		getTime: function(level) {
			return this._get('times', level);
		},

		_getGoldValue: function(treasure) {
			if (!treasure) {
				return 0;
			}

			var value = 0;
			for(var i = 0, l = treasure.length; i < l; ++i) {
				value += treasure[i].value;
			}

			return value;
		},

		_get: function(key, level) {
			return this[key][level || this.level];
		}
	};

	Object.defineProperty(Session.prototype, 'gameWasPlayed', {
		get: function() {
			return this.level !== 0;
		}
	});

});
