function Promise(fn) {
  var callback = null;
  this.then = function(cb) {
    callback = cb;
  };

  function resolve(value) {
    callback(value);
  }

  fn(resolve);
}

function doSomething() {
  return new Promise(function(resolve) {
    setTimeout(function() {
      var result = 42;
      resolve(result);
    }, 10);
  });
}

doSomething().then(function(result) {
  console.log("Got a result", result);
});

