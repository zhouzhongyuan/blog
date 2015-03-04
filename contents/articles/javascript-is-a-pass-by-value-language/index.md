---
title: JavaScript is a Pass by Value Language
author: Matt
date: 2015-03-03
template: article.jade
---

A common misconception about JavaScript is that it supports both *pass by value* and *pass by reference* when calling functions. In actuality, JavaScript always passes by value.

<span class="more"></more>

## Pass by wha?

What are you talking about?

Let's look at this example

```javascript
function clamp(value, valueMax, valueMin) {
  return Math.min(valueMax, Math.max(value, valueMin));
}

clamp(200, 1, 50);
```

What happens when we pass `valueMin` from clamp into max? Do they both have the same `valueMin`? In other words, do they both get access to the same chunk of memory? That depends. In JavaScript clamp and max are each given their own copy of `valueMin`. No matter what, clamp's `valueMin` will never interfere with max's `valueMin` as they are two completely different chunks of memory. This is know as "pass by value".

## Pass by reference

It's possible for functions to share parameters amongst each other. This is the opposite of pass by value and is known as "pass by reference". When passing by reference, the functions involve are all privy to the same chunk of memory, and so can see each other's changes. Many languages don't offer this feature. JavaScript does not, but C# does.

```csharp
// this is C#

public class MyProgram {
  static void mutate(ref int a) {
    a = 5;
  }

  static void Main(string[] args) {
    int myA = 12;
    mutate(ref myA);

    // prints 5  
    Console.WriteLine(myA);
  }
}
```

Notice the `ref` keywords? These are the indicators that will let the compiler know to do pass by reference whenever `mutate` is called.

## Objects and references in JavaScript

This is where it gets a little confusing.

In JavaScript -- like most object oriented languages -- objects are created on the heap (and in actuality primitives are too due to closures. [This StackOverflow answer](http://stackoverflow.com/a/3691209/194940) explains it nicely). You don't have direct access to the heap, instead whenever working with an object you are doing so through a reference. A reference is like a pointer in C, it stores the address of the object on the heap. But unlike pointers, that's really all they do, you can't really do fancy things with references like you can pointers. They are simply a calling card that lets you get at your object.

So what does this mean with objects and function calls?

```javascript
function mutateObject(obj) {
  obj.foo = "changed!";
}

var myObj = {
  foo: "original value"
};

mutateObject(myObj);

// prints "changed!"
console.log(myObj.foo);
```

isn't that pass by reference? It actually is still pass by value. The tricky bit here is the value that got passed is a reference. Unfortunately the naming conventions are confusing. A reference in JavaScript is a chunk of memory that stores an address. `obj` inside mutateObject and `myObj` outside of mutate object are both references that "point" at the object. But just like up above with `valueMax`, they are two distinct chunks of memory, both of which contain the same address.

It is true that with objects in JavaScript you get some of the features that true pass by reference gives you. But you don't get all of them.

## Passing object references by reference

Yo dawg...

Let's head back to C# for a second.

```csharp
public class MyObject {
  public MyObject(string a) {
    A = a;
  }

  public string A { get; set; }
}

public class MyProgram {
  static void Mutate(ref MyObject obj) {
    obj = new MyObject("assigning a new object");
  }

  static void Main(string[] args) {
    MyObject myObj = new MyObject("original object");
    MyObject anotherRefToMyObj = myObj;
    Mutate(ref myObj);

    // prints false
    Console.WriteLine(Object.Equals(myObj, anotherRefToMyObj));

    // prints "assigning a new object"
    Console.WriteLine(myObj.A);
  }
}
```

A pretty contrived example, but the key difference here compared to JavaScript is we are able to completely reassign `myObj` to a new object. That's because `myObj` in Main and `obj` in Mutate are both the same reference. When doing `obj = new MyObject(...)` inside Mutate, the effect is placing the address of the new object into the reference that both Main and Mutate share.

Look at `anotherRefToMyObj`, that's not a new object, it's a new reference. We assigned that reference the same address as `myObj`, so before the call to Mutate, both `myObj` and `anotherRefToMyObj` both point at the same object. Then after Mutate(), `myObj` now points to a different object.

This is not possible in JavaScript.

## A lil pedantic

True, this is pretty nitpicky stuff. But that last example of passing objects by ref in C# can come in handy at times.
