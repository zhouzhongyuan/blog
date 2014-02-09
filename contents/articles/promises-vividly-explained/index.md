---
title: Promises ... Vividly Explained
author: Matt
date: 2014-02-10
template: article.jade
---
I've been using promises in my JavaScript code for a while now. They can be a little brain bending at first. I now use them effectively, but when it comes down to it, I don't fully understand how they work. This article is my resolution to that. If you stick around until the end, you should understand promises very well too. 

We will be incrementaly creating a Promise implementation that by the end will meet the Promise/A+ spec, and understand how promises meet the needs of asynchronous programming along the way. This article assumes you already have a working knowledge of promises. If you don't, [promisejs.org](http://promisejs.org) is a good site to checkout.

<span class="more"></span>

## Replacing Callbacks

Let's begin our promise implementation with the simplest use case. We want to go from this

```javascript
doSomething(function(value) {
  // do something with value
});
```

to this

```javascript
doSomething().then(function(value) {
  // do something with value
});
```

To do this, we just need to change `doSomething()` from this

```javascript
function doSomething(callback) {
  var value = 42;
  callback(value);
}
```

to this "Promise" based solution

```javascript
function doSomething() {
  return {
    then: function(callback) {
      var value = 42;
      callback(value);
    }
  };
}
```

This is just a little sugar for the callback pattern. It's pretty pointless sugar so far. But it's a start and already we've hit upon a core tenet of Promises:

> Promises capture the notion of an eventual value into an object

[[[[get koenig quote]]]]

This is the main reason Promises are so interesting. Once the concept of eventuality is captured like this, we can begin to do some very powerful things. We'll explore this a lot more later on.

### Defining the Promise type

This simple object literal isn't going to hold up. Let's define an actual `Promise` type that we'll be able to expand on

```javascript
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
```

and reimplement `doSomething()` to use it

```javascript
function doSomething() {
  return new Promise(function(resolve) {
    var value = 42;
    resolve(value);
  });
}

doSomething().then(function(value) {
  console.log("Got a value:", value);
});
```

There is a problem here. If you trace through the execution, you'll see that `resolve()` gets called before `then()` does, which means `callback` will be `null`. Let's hide this problem in a little hack involving `setTimeout`

```javascript
function Promise(fn) {
  var callback = null;
  this.then = function(cb) {
    callback = cb;
  };

  function resolve(value) {
    setTimeout(function() {
      callback(value);
    }, 10);
  }

  fn(resolve);
}
```

With the hack in place, this code now works.

### This Code is Brittle and Bad

Our naive, poor Promise implementation must use asynchronicity to work. It's easy to make it fail again, just call `then()` asynchronously and we are right back to the callback being `null` again. Why am I setting you up for failure so soon? Because the above implementation has the advantage of being pretty easy to wrap your head around. `then()` and `resolve()` won't go away. They are key concepts in Promises.

## Promises have State

Our brittle code above revealed something unexpectedly. Promises have state. We need to know what state they are in before proceeding, and make sure we move through the states correctly. Doing so gets rid of the brittleness. 

* A Promise can either be **pending** or **resolved** with a *value*. 
* Once a Promise resolves to a value, it will always remain at that value and never resolve again.
* A Promise can also be **rejected** with a *reason*, but we'll get to error handling later.

Let's address the state head on and come up with a much better implementation

```javascript
function Promise(fn) {
  var state = 'pending';
  var value;
  var deferred;

  function resolve(newValue) {
    value = newValue;
    state = 'resolved';

    if(deferred) {
      handle(deferred);
    }
  }

  function handle(onFulfilled) {
    if(state === 'pending') {
      deferred = onFulfilled;
      return;
    }

    onFulfilled(value);
  }

  this.then = function(onFulfilled) {
    handle(onFulfilled);
  };

  fn(resolve);
}
```

It's getting more complicated, but the caller can invoke `then()` whenever they want, and the callee can invoke `resolve()` whenever they want. It fully works with synchronous or asynchronous code.

This is because of the `state` flag. Both `then()` and `resolve()` hand off to the new method `handle()`, which will do one of two things depending on the situation:

* The caller has called `then()` before the callee calls `resolve()`, that means there is no value ready to hand back. In this case the state will be pending, and so we hold onto the caller's callback to use later. Later when `resolve()` gets called, we can then invoke the callback and send the value on its way.
* The callee calls `resolve()` before the caller calls `then()`: In this case we hold onto the resulting value. Once `then()` gets called, we are ready to hand back the value.

Notice `setTimeout` went away? That's temporary, it will be coming back. But one thing at a time.

We still have a ways to go before our Promises fully meet the spec, but they are already pretty powerful. One thing this system allows is for us to call `then()` as many times as we want, we will always get the same value back

```javascript
var promise = doSomething();

promise.then(function(value) {
  console.log('Got a value:', value);
});

promise.then(function(value) {
  console.log('Got the same value again:', value);
});
```

The `promise` object stands as a representation of the result. We can pass it around, store it, use it as many times as we need, etc. Finally, our Promise is starting to give us benefits over the original callback approach we replaced!

## Chaining Promises

Since Promises capture the notion of asynchronicity in an object, we can compose them, chain them, map them, all kinds of neat things. Stuff like this is very common with Promises:

```javascript
getSomeData()
.then(filterTheData)
.then(processTheData)
.then(displayTheData);
```

`getSomeData` is returning a Promise, as evidenced by the call to `then()`, but the result of that first then must also be a Promise, as we call `then()` again (and again!) That's exactly what happens, if we can convince `then()` to return a Promise, things start to get interesting.

Here is our Promise type with chaining added in

```javascript
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

  function handle(handler) {
    if(state === 'pending') {
      deferred = handler;
      return;
    }

    if(handler.onFulfilled === null) {
      handler.resolve(value);
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
```

Hoo, it's getting a little squirrelly. Aren't you glad we're building this up slowly? The real key here is that `then()` is returning a new Promise. It's entirely possible this new Promise will go completely ignored, such as in the simple case

```javascript
  doSomething().then(showTheResult);
```

The callback approach does not have this problem. Yet another ding against Promises. You can start to appreciate why much of the NodeJS community has shunned them.

When the second Promise is used, what resolved value does it receive? *It receives the return value of the first promise.* This is happening at the bottom of `handle()`, The `handler` object carries around both an `onFulfilled` callback as well as a reference to `resolve`. This is the bridge from the first Promise to the second. We are concluding the first Promise at this line:

```javascript
var ret = handler.onFulfilled(value);
```

In the examples I've been using here, `handler.onFulfilled` is

```javascript
function(value) {
  console.log("Got a value:", value);
}
```

in other words, it's what was passed into the first call to `then()`. The return value of that first handler is used to resolve the second Promise. Thus chaining is accomplished.

Since `then()` always returns a new Promise, this chaining can go as deep as we like. With this implementation, the above example is now possible

```javascript
getSomeData()
.then(filterTheData)
.then(processTheData)
.then(displayTheData);
```

### Returing Promises inside the Chain
Our chaining implementation is a bit naive so far. It's blindly passing the resolved values down the line. What if one of the resolved values is a Promise? For example

```javascript
doSomething().then(result) {
  // doSomethingElse returns a Promise
  return doSomethingElse(result)
}.then(function(finalResult) {
  console.log("the final result is", finalResult);
});
```

As it stands now, the above won't work. `finalResult` won't actually be a fully resolved value, it'll instead be a Promise. We'd have to instead do this

```javascript
doSomething().then(result) {
  // doSomethingElse returns a Promise
  return doSomethingElse(result)
}.then(function(anotherPromise) {
  anotherPromise.then(function(finalResult) {
    console.log("the final result is", finalResult);
  });
});
```

Who wants that crud in their code? Let's have the Promise implementation seemlessly handle this for us. This is simple to do, inside of `resolve()`, just add a special case if the resolved value is a Promise

```javascript
function resolve(newValue) {
  if(newValue && typeof newValue.then === 'function') {
    newValue.then(resolve);
    return;
  }
  state = 'resolved';
  value = newValue;

  if(deferred) {
    handle(deferred);
  }
}
```

We'll keep going through `resolve()` as long as we get a Promise back. Once it's no longer a Promise, then proceed as before. It *is* possible for this to be an infinite loop. The Promise/A+ spec recommends implementations detect this and break, but it's not required.

Notice how loose the check is to see if `newValue` is a Promise? We are only looking for a `then()` method. This is intentional, it allows different Promise implementations to interopt with each other. It's actually quite common for Promise libraries to intermingle, as different third party libraries you use can each use different Promise implementations.

This also means if you return something that *isn't* a Promise, but happens to have a function named `then` on it, then bad things can happen. In general, it's best to avoid having function properties named "then" unless the object in question is a Promise.

With chaining in place, our implementation is pretty complete. But we've completely ignored error handling.

## Rejecting Promises

*We're about to switch gears a bit. Great time to take a break. I'll wait.*

When something goes wrong during the course of a Promise, it needs to be **rejected** with a *reason*. How does the caller know when this happens? They can find out by passing in a second callback to `then()`

```javascript
doSomething().then(function(value) {
  console.log('Success!', value);
}, function(error) {
  console.log('Uh oh', error);
});
```

As mentioned above, the Promise will transition from **pending** to either **resolved** or **rejected**, never both. In other words, only one of the above callbacks ever gets called.

Promises enable rejection by means of `reject()`, here is `doSomething()` with error handling support added

```javascript
function doSomething() {
  return new Promise(function(resolve, reject) {
    var result = getValue(); 
    if(result.error) {
      reject(result.error);
    } else {
      resolve(result.value);
    }
  });
}
```

Inside the Promise implementation, we need to account for rejection. As soon as a Promise is rejected, all downstream Promises from it also need to be rejected.

Let's see the full Promise implementation again, this time with rejection support

```javascript
function Promise(fn) {
  var state = 'pending';
  var value;
  var deferred = null;

  function resolve(newValue) {
    if(newValue && typeof newValue.then === 'function') {
      newValue.then(resolve, reject);
      return;
    }
    state = 'resolved';
    value = newValue;
  
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

    var handlerCallback;
    
    if(state === 'resolved') {
      handlerCallback = handler.onFulfilled;
    } else {
      handlerCallback = handler.onRejected;
    }

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

  this.then = function(onFulfilled, onRejected) {
    return new Promise(function(resolve) {
      handle({
        onFulfilled: onFulfilled,
	onRejected: onRejected,
        resolve: resolve,
	reject: reject
      });
    });
  };

  fn(resolve, reject);
}
```

Other than the addition of `reject()`, `handle()` also has to be aware of rejection. Within `handle()`, either the rejection path or resolve path will be taken depending on the value of `state`. This value of `state` gets pushed into the next Promise, because calling the next Promises' `resolve()` or `reject()` sets its `state` value accordingly.

When using Promises, it's very easy to omit the error callback. But if you do, you'll never get *any* indication something went wrong. At the very least, the final Promise in your chain should have an error callback.

### Unexpected Errors Should Also Lead to Rejection

So far our error handling only accounts for known errors. It's possible an unhandled exception will happen, completely ruining everything. It's essential that the Promise implementation catches those exceptions and rejects accordingly.


