function Promise(fn) {
  var state = 'pending';
  var value;
  var deferred = null;

  function resolve(newValue) {
    value = newValue;
    state = 'resolved';

    if(deferred) {
      handle(deferred);
    }
  }

  function reject(reason) {
    state = 'rejected';
    value = reason;

    if(deferred) {
      handle(deferred);
    }
  }

  function handle(handler) {
    if(state === 'pending') {
      deferred = handler;
      return;
    }

    var handlerCallback = state === 'resolved' ? handler.onFulfilled : handler.onRejected;

    if(handlerCallback === null) {
      if(state === 'resolved') {
        handler.resolve(value);
      } else {
        handler.reject(value);
      }

      return;
    }

    var ret = handler.onFulfilled(value);
    handler.resolve(ret);
  }

  this.then = function(onFulfilled) {
    return new Promise(function(resolve) {
      handle({
        onFulfilled: onFulfilled,
        resolve: resolve
      });
    });
  };

  fn(resolve);
}

function doSomething() {
  return new Promise(function(resolve) {
    process.nextTick(function() {
      var result = 42;
      resolve(result);
    });
  });
}

var p = doSomething();
  
// setTimeout(function() {
//   p.then(function(result) {
//     console.log("Got a result:", result);
//   });
// }, 200);


p.then(function(result) {
  console.log('got a result again:', result);
  return 55;
}).then(function(nextResult) {
  console.log('next result: ' + nextResult);
  return 88;
}).then(function(thirdResult) {
  console.log('third: ', thirdResult);
});


