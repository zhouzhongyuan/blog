---
title: Promises ... Vividly Explained
author: Matt
date: 2014-02-10
template: article.jade
---
I've been using promises in my JavaScript code for a while now. They can be a little brain bending at first. I now use them effectively, but when it comes down to it, I don't fully understanding how they work. This article is my resolution to that. If you stick around until the end, you'll understand promises very well too. 

We will be incrementaly creating a promise implementation that meets the Promise/A+ spec, and understand how promises meet the needs of asynchronous programming along the way. This article assumes you already have a working knowledge of promises. If you don't, [promisejs.org](http://promisejs.org) is a good site to checkout.

<span class="more"></span>

## Replacing Callbacks

Let's begin our promise implementation with the simplest use case. We want to go from this:

```javascript
doSomething(function(result) {
  // do something with result
});
```

to this:

```javascript
doSomething().then(function(result) {
  // do something with result
});
```

Which means the implementation of `doSomething` will go from this:

```javascript
function doSomething(callback) {
  var result = // ... get result somehow
  callback(result);
}
```

to this "promise" based solution:

```javascript
function doSomething() {
  return {
    then: function(callback) {
      var result = // ... get result somehow
      callback(result);
    }
  };
}
```

This is just a little sugar for the callback pattern. It's pretty pointless sugar so far, this implementation is far from being a real Promise! But it's a start and already we've hit upon a core tenet of Promises:

> Promises capture the notion of an eventual result into an object

[[[[get koenig quote]]]]

This is the main reason Promises are so interesting. Once the concept of eventuality is captured like this, one can begin to do some very powerful things.

### Defining the Promise type

This simple object literal isn't going to hold up. Let's define an actual `Promise` type:

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

and reimplement `doSomething()` to use it:

```javascript
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
```

Woah, what's setTimout doing in there? If you trace through this implementation, you'll notice that `resolve()` would normally get called before `then()`. We wouldn't have a callback to invoke to hand the result back. setTimout prevents this and ensures the call order is what we want. The callback implementation we are replacing did *not* have this limitation. Nor do true promises, but we will see later that order of execution and the state of the callstack are important considerations in Promises.


