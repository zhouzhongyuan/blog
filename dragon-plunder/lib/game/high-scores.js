ig.module('game.high-scores').
requires('game.session').
defines(function() {
	var localStorageKey = "dragon.plunder.high.scores.key";
	var MaxScores = 5;

	HighScores = function() {
		this._scores = this._hydrateScores();
	};

	HighScores.prototype = {
		isHighScore: function(total) {
			var lowestScore = this._scores[this._scores.length - 1];

			return lowestScore.total < total;
		},

		getScores: function() {
			return this._scores;
		},

		saveScore: function(name, gold, time, deaths) {
			this._scores.push({
				name: name || 'DP',
				gold: gold,
				time: time,
				deaths: deaths,
				total: Session.calcScore(gold, time, deaths)
			});

			this._sortScores();
			this._pruneScores();
			this._save();
		},

		_sortScores: function() {
			this._scores.sort(function(a, b) {
				return b.total - a.total;
			});
		},

		_pruneScores: function() {
			while(this._scores.length > MaxScores) {
				this._scores.pop();
			}
		},

		_save: function() {
			window.localStorage[localStorageKey] = JSON.stringify(this._scores);
		},

		_hydrateScores: function() {
			var raw = window.localStorage[localStorageKey];

			if(!raw) {
				return this._generateDefaultScores();
			}
			return JSON.parse(raw);
		},

		_generateDefaultScores: function() {
			var scores = [
				{ name: 'Matt', gold: 4000, time: 240, deaths: 0 },
				{ name: 'Ryan', gold: 3800, time: 240, deaths: 0 },
				{ name: 'Sarah', gold: 3700, time: 270, deaths: 1 },
				{ name: 'Lucy', gold: 3600, time: 280, deaths: 2 },
				{ name: 'Charlie', gold: 1500, time: 400, deaths: 8 }
			];

			scores.forEach(function(score) {
				score.total = Session.calcScore(score.gold, score.time, score.deaths);
			}, this);

			return scores;
		}
	};

});
