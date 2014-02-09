---
title: JavaScript Promises ... In Wicked Detail
author: Matt
date: 2014-02-10
template: article.jade
---
<style>
  .callout {
    padding: 10px;
    margin: 20px 0;
    max-width: 600px;
  }
  .wisdom {
    background-color: #CFF7B8;
    color: #655C6F;
  }
  .pitfall {
    background-color: #DEA2A4;
  }
</style>

I've been using promises in my JavaScript code for a while now. They can be a little brain bending at first. I now use them pretty effectively, but when it comes down to it, I don't fully understand how they work. This article is my resolution to that. If you stick around until the end, you should understand promises very well too. 

We will be incrementaly creating a Promise implementation that by the end will mostly meet the [Promise/A+ spec](http://promises-aplus.github.io/promises-spec/), and understand how promises meet the needs of asynchronous programming along the way. This article assumes you already have some familiarity with Promises. If you don't, [promisejs.org](http://promisejs.org) is a good site to checkout.

<span class="more"></span>

## The Simplest Use Case

Let's begin our promise implementation as simple as can be. We want to go from this

```javascript
doSomething(function(value) {
  console.log('Got a value:' value);
});
```

to this

```javascript
doSomething().then(function(value) {
  console.log('Got a value:' value);
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

This is just a little sugar for the callback pattern. It's pretty pointless sugar so far. But it's a start and yet we've already hit upon a core tenet of Promises

<div class="callout wisdom">
Promises capture the notion of an eventual value into an object
</div>

This is the main reason Promises are so interesting. Once the concept of eventuality is captured like this, we can begin to do some very powerful things. We'll explore this a lot more later on.

### Defining the Promise type

This simple object literal isn't going to hold up. Let's define an actual `Promise` type that we'll be able to expand upon

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

There is a problem here. If you trace through the execution, you'll see that `resolve()` gets called before `then()`, which means `callback` will be `null`. Let's hide this problem in a little hack involving `setTimeout`

```javascript
function Promise(fn) {
  var callback = null;
  this.then = function(cb) {
    callback = cb;
  };

  function resolve(value) {
    // force callback to be called in the next
    // iteration of the event loop, giving
    // callback a chance to be set by then()
    setTimeout(function() {
      callback(value);
    }, 1);
  }

  fn(resolve);
}
```

With the hack in place, this code now works. Sort of.

### This Code is Brittle and Bad

Our naive, poor Promise implementation must use asynchronicity to work. It's easy to make it fail again, just call `then()` asynchronously and we are right back to the callback being `null` again. Why am I setting you up for failure so soon? Because the above implementation has the advantage of being pretty easy to wrap your head around. `then()` and `resolve()` won't go away. They are key concepts in Promises.

## Promises have State

Our brittle code above revealed something unexpectedly. Promises have state. We need to know what state they are in before proceeding, and make sure we move through the states correctly. Doing so gets rid of the brittleness. 

<div class=" callout wisdom">
<ul>
<li>A Promise can be **pending** waiting for a value, or **resolved** with a value. 
<li>Once a Promise resolves to a value, it will always remain at that value and never resolve again.
</ul>
</div>

A Promise can also be **rejected** with a *reason*, but we'll get to error handling later.

Let's explicitly track the state inside of our implementation, which will allow us to do away with our hack

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

  function handle(onResolved) {
    if(state === 'pending') {
      deferred = onResolved;
      return;
    }

    onResolved(value);
  }

  this.then = function(onResolved) {
    handle(onResolved);
  };

  fn(resolve);
}
```

It's getting more complicated, but the caller can invoke `then()` whenever they want, and the callee can invoke `resolve()` whenever they want. It fully works with synchronous or asynchronous code.

This is because of the `state` flag. Both `then()` and `resolve()` hand off to the new method `handle()`, which will do one of two things depending on the situation:

* The caller has called `then()` before the callee calls `resolve()`, that means there is no value ready to hand back. In this case the state will be pending, and so we hold onto the caller's callback to use later. Later when `resolve()` gets called, we can then invoke the callback and send the value on its way.
* The callee calls `resolve()` before the caller calls `then()`: In this case we hold onto the resulting value. Once `then()` gets called, we are ready to hand back the value.

Notice `setTimeout` went away? That's temporary, it will be coming back. But one thing at a time.

We still have quite a few more things in the spec to implement, but our Promises are already pretty powerful. One thing this system allows is for us to call `then()` as many times as we want, we will always get the same value back

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

Since Promises capture the notion of asynchronicity in an object, we can, chain them, map them, have them run in parallel or sequential, all kinds of useful things. Code like this is very common with Promises:

```javascript
getSomeData()
.then(filterTheData)
.then(processTheData)
.then(displayTheData);
```

`getSomeData` is returning a Promise, as evidenced by the call to `then()`, but the result of that first then must also be a Promise, as we call `then()` again (and again!) That's exactly what happens, if we can convince `then()` to return a Promise, things start to get interesting.

<div class="callout wisdom">
`then()` always returns a Promise
</div>

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

    if(handler.onResolved === null) {
      handler.resolve(value);
      return;
    }

    var ret = handler.onResolved(value);
    handler.resolve(ret);
  }

  this.then = function(onResolved) {
    return new Promise(function(resolve) {
      handle({
        onResolved: onResolved,
        resolve: resolve
      });
    });
  };

  fn(resolve);
}
```

Hoo, it's getting a little squirrelly. Aren't you glad we're building this up slowly? The real key here is that `then()` is returning a new Promise. 

<div class="callout pitfall">
Since `then()` always returns a new Promise object, there will always be at least one Promise object that gets created, resolved and then ignored. Which can be seen as waistful. The callback approach does not have this problem. Another ding against Promises. You can start to appreciate why some in the JavaScript community have shunned them.
</div>

When the second Promise is used, what resolved value does it receive? *It receives the return value of the first promise.* This is happening at the bottom of `handle()`, The `handler` object carries around both an `onResolved` callback as well as a reference to `resolve`. This is the bridge from the first Promise to the second. We are concluding the first Promise at this line:

```javascript
var ret = handler.onResolved(value);
```

In the examples I've been using here, `handler.onResolved` is

```javascript
function(value) {
  console.log("Got a value:", value);
}
```

in other words, it's what was passed into the first call to `then()`. The return value of that first handler is used to resolve the second Promise. Thus chaining is accomplished

```javascript
doSomething().then(function(result) {
  console.log('first result', result);
  return 88;
}).then(function(secondResult) {
  console.log('second result', secondResult);
});

// the output is
//
// first result 42
// second result 88


doSomething().then(function(result) {
  console.log('first result', result);
  // not explicitly returning anything
}).then(function(secondResult) {
  console.log('second result', secondResult);
});

// now the output is
//
// first result 42
// second result undefined
```

Since `then()` always returns a new Promise, this chaining can go as deep as we like


```javascript
doSomething().then(function(result) {
  console.log('first result', result);
  return 88;
}).then(function(secondResult) {
  console.log('second result', secondResult);
  return 99;
}).then(function(thirdResult) {
  console.log('third result', thirdResult);
  return 200;
}).then(function(fourthResult) {
  // on and on...
});
```

What if in the above example, we wanted all the results in the end? With chaining, we would need to manually build up the result ourself

```javascript
doSomething().then(function(result) {
  var results = [result];
  results.push(88);
  return results;
}).then(function(results) {
  results.push(99);
  return results;
}).then(function(results) {
  console.log(results.join(', ');
});

// the output is
//
// [42, 88, 99]
```

<div class="callout wisdom">
  Promises always resolve to one value. If you need to pass more than one value along, you need to create a multi-value in some fashion (an array, an object, concatting strings, etc)
</div>

A potentially better way is to use a Promise library's `all()` method, which I'll leave to you to go and discover.

### Returing Promises inside the Chain
Our chaining implementation is a bit naive. It's blindly passing the resolved values down the line. What if one of the resolved values is a Promise? For example

```javascript
doSomething().then(result) {
  // doSomethingElse returns a Promise
  return doSomethingElse(result)
}.then(function(finalResult) {
  console.log("the final result is", finalResult);
});
```

As it stands now, the above won't do what we want. `finalResult` won't actually be a fully resolved value, it'd instead be a Promise. To get the intended result, we'd need to do

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

We'll keep calling `resolve()` recursively as long as we get a Promise back. Once it's no longer a Promise, then proceed as before.

<div class="callout pitfall">
It *is* possible for this to be an infinite loop. The Promise/A+ spec recommends implementations detect infinite loops, but it's not required.
</div>

Notice how loose the check is to see if `newValue` is a Promise? We are only looking for a `then()` method. This duck typing is intentional, it allows different Promise implementations to interopt with each other. It's actually quite common for Promise libraries to intermingle, as different third party libraries you use can each use different Promise implementations.

<div class="callout wisdom">
Different Promise implementations can interopt with each other, as long as they all are following the spec properly.
</div>

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

Promises enable rejection by means of `reject()`, the evil twin of `resolve()`. Here is `doSomething()` with error handling support added

```javascript
function doSomething() {
  return new Promise(function(resolve, reject) {
    var result = somehowGetTheValue(); 
    if(result.error) {
      reject(result.error);
    } else {
      resolve(result.value);
    }
  });
}
```

Inside the Promise implementation, we need to account for rejection. As soon as a Promise is rejected, all downstream Promises from it also need to be rejected.

Let's see the full Promise implementation again, this time with rejection support added

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
      handlerCallback = handler.onResolved;
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

    var ret = handlerCallback(value);
    handler.resolve(ret);
  }

  this.then = function(onResolved, onRejected) {
    return new Promise(function(resolve) {
      handle({
        onResolved: onResolved,
        onRejected: onRejected,
        resolve: resolve,
        reject: reject
      });
    });
  };

  fn(resolve, reject);
}
```

Other than the addition of `reject()` itself, `handle()` also has to be aware of rejection. Within `handle()`, either the rejection path or resolve path will be taken depending on the value of `state`. This value of `state` gets pushed into the next Promise, because calling the next Promises' `resolve()` or `reject()` sets its `state` value accordingly.

<div class="callout pitfall">
When using Promises, it's very easy to omit the error callback. But if you do, you'll never get *any* indication something went wrong. At the very least, the final Promise in your chain should have an error callback.
</div>

### Unexpected Errors Should Also Lead to Rejection

So far our error handling only accounts for known errors. It's possible an unhandled exception will happen, completely ruining everything. It's essential that the Promise implementation catches those exceptions and rejects accordingly.

This means that `resolve()` should get wrapped in a try/catch block

```javascript
function resolve(newValue) {
  try {
    // ... as before
  } catch(e) {
    reject(e);
  }
}
```

It's also important to make sure the callbacks given to us by the caller don't throw unhandled exceptions. These callbacks are called in `handle()`, so we end up with

```javascript
function handle(deferred) {
  // ... as before

  var ret;
  try {
    ret = handlerCallback(value);
  } catch(e) {
    handler.reject(e);
  }

  handler.resolve(ret);
}
```

### Promises can Swallow Errors!
<div class="callout pitfall">
It's possible for Promises to completely swallow errors! This trips people up a lot
</div>

Consider this example

```javascript
function getSomeJson() {
  return new Promise(function(resolve, reject) {
    var badJson = "<div>uh oh, this is not JSON at all!</div>";
    resolve(badJson);
  });
}

getSomeJson().then(function(json) {
  var obj = JSON.parse(json);
  console.log(obj);
}, function(error) {
  console.log('uh oh', error);
});
```

What is going to happen here? Our callback inside `then()` is expecting some valid JSON. So it naively tries to parse it. This will throw an exception. But we have an error callback, so we're good, right?

Nope. *That error callback will not be invoked!* If you run this example, you will get no output at all. No errors, no nothing. Pure *chilling* silence.

Why is this? Since the unhandled exception took place in our callback to `then()`, it is being caight inside of `handle()`. This causes `handle()` to reject the Promise that `then()` returned, not the Promise we are already responding to, as that Promise has already properly resolved.

If you want to capture the above error, you need an error callback further downstream

```javascript
getSomeJson().then(function(json) {
  var obj = JSON.parse(json);
  console.log(obj);
}).then(null, function(error) {
  console.log("an error occured: ", error);
});
```

Notice we don't have a success callback, it's perfectly fine to omit it. In this case we will properly log the error.

<div class="callout pitfall">
In my experience, this is the biggest pitfall of Promises. If you read only one section of this article, this is the one!
</div>


## Promise Resolution Needs to be Async
Early in the article we cheated a bit by using `setTimeout`. Once we fixed that hack, we've not used setTimeout since. But the truth is the Promise/A+ spec requires that Promise resolution happen asynchronously. Meeting this requirement is simple, we simply need to wrap most of `handle()`'s implementation inside of a `setTimeout` call

```javascript
function handle(handler) {
  if(state === 'pending') {
    deferred = handler;
    return;
  }
  setTimeout(function() {
    // as before
  }, 1);
}
```

This is all that is needed. In truth, real Promise libraries don't tend to use `setTimeout`. If the library is NodeJS oriented it will possibly use `process.nextTick`, for browsers it might use the new `setImmediate` or a setImmediate shim (so far only IE supports setImmediate), or perhaps an asynchronous library such as Kriskowal's [asap](https://github.com/kriskowal/asap). Kriskowal also wrote [Q](https://github.com/kriskowal/q), a popular Promise library.

[[[[TODO why does it need to be async?]]]]

## then/promise

There are many, full featured, Promise libraries out there. The [then](https://github.com/then) organization's [promise](https://github.com/then/promise) library takes a simpler approach. If you take a look at [their implementation](https://github.com/then/promise/blob/master/core.js), you should see it looks quite familiar. then/promise was the basis of the code for this article. Thanks to Nathan Zadoks and Forbes Lindsay for their great library and work on JavaScript Promises. Forbes Lindsay is also the guy behind the [promisejs.org](http://promisejs.org) site mentioned at the start.

There are some differences in the real implementation and what is here in this article. That is because there are more details in the Promise/A+ spec that I have not addressed. I recommend [reading the spec](http://promises-aplus.github.io/promises-spec/), it is short and straightforward. 

## Conclusion

If you made it this far, then thanks for reading! We've covered the core of Promises, what is described in the spec. Most implementations offer much more functionality, such as `all()`, `denodeify()` and much more. I recommend browsing the [API docs for Bluebird](https://github.com/petkaantonov/bluebird/blob/master/API.md) to see what all is possible with Promises. 

Once I came to understand how Promises worked and their caveats, I came to really like them. They have lead to very clean and elegant code in my projects. There's so much more to talk about too, this article is just the beginning!


