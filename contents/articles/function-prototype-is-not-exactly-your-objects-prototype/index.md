---
title: MyFunction.prototype is Not Exactly Your Object's Prototype
author: Matt
date: 2014-03-16
template: article.jade
---
A common misconception in JavaScript is that `MyFunction.prototype` is the prototype for the objects created with that function. That's sort of true, but not exactly. There's more going on here.

<span class="more"></span>

Let's start off with some very typical JavaScript code...

```javascript
function MyNewType(name) {
  this.name = name;
}

MyNewType.prototype.sayHi = function() {
  console.log('hi, my name is ' + this.name);
};

var obj = new MyNewType('Sally');
obj.sayHi();  // hi, my name is Sally
```

Nothing exciting at all. But where and what is the prototype of `obj`? 

##Object Prototypes

Before we answer that question, let's do a little recap on prototypes. All objects in JavaScript have a reference to a prototype object. 
