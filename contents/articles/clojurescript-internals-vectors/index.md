---
title: ClojureScript Internals - Vectors
author: Matt
date: 2015-01-26
template: article.jade
---
Today we're taking a look at how vectors are implemented in ClojureScript. We'll explore some of the trade offs made between performance and immutability, and we'll get a feel for how a language like Clojure gets mapped into a language like JavaScript.

<span class="more"></span>

<style>
.bit-table {
  margin: 30px 0;
}

.bit-table .number td div {
  background-color: grey;
  color: white;
  padding: 8px;
  text-align: center;
}


.bit-table .bit-chunks td div {
  background-color: grey;
  color: white;
  padding: 8px;
  text-align: center;
}

.bit-table .indices td div {
  background-color: #C27F0F;
  color: white;
  padding: 8px;
  text-align: center;
}
</style>

## A Little Background
Before diving into the how, we need to talk about the why a little bit. If you're not new to Clojure, feel free to <a href="#inside-clojurescript-s-persistentvector">skip to the next section</a>.

### Persistent Data Structures
Clojure data structures are persistent and immutable.

```clojure
(def a [1 2 3])
(def b (conj a 4))
(println a) ; [1 2 3]
(println b) ; [1 2 3 4]
```
`a` *persists on* despite `b` being created based off of it. `a` can never change in the Clojure world. ClojureScript needs to maintain this promise of immutability and persistence too.

### Data Structure Characteristics
Clojure's different data structures have different tendencies. Vector's claim to fame is it is efficient when working with the *back* of the vector. Lists on the other hand optimize their efficiency at the front. `conj` is the classic example of when these differences can come to light

```clojure
(def a [1 2 3])  ; a vector
(def b '(4 5 6)) ; a list

;; vectors conj to the back
(println (conj a 42)) ; [1 2 3 42]

;; and lists conj to the front
(println (conj b 42)) ; (42 4 5 6)
```

When the ClojureScript team implemented vectors, they needed to maintain this characteristic. This will become apparent as we dig deeper.

## Inside ClojureScript's PersistentVector
Whenever you create a vector in ClojureScript either with the literal form `[1 2 3]` or perhaps by calling `(vector 4 5 6)`, ultimately this becomes an instance of `cljs.core.PersistentVector`. PersistentVector lives in the core ClojureScript namespace, which does mean it is accessible from standard ClojureScript code

```clojure
(def my-vector (PersistentVector.
                 nil
                 4
                 5
                 (.-EMPTY_NODE PersistentVector)
                 #js [5 4 3 2]
                 nil))

(println (first my-vector)) ; 5
(println (rest my-vector))  ; [4 3 2]
```

This hints at the fact that `cljs.core` is written in ClojureScript itself; and it is, you can see the implementation of PersistentVector [here](https://github.com/clojure/clojurescript/blob/22dd4fbeed72398cbc3336fccffe8196c56cd209/src/cljs/cljs/core.cljs#L4191).

### The vector's root and tail
Internally, vectors have a *root* and a *tail*. Up above where we directly instantiated a `PersistentVector`, the `EMPTY_NODE` was the root, and the `#js [5 4 3 2]` was the tail. Small vectors put all of their elements into their tail, leaving an empty root. The tail is simply a JavaScript array.

<div class="callout addendum">
Technically the root is not empty, it actually contains an array of 32 nulls. Each null slot is a spot where the root can allow grow
</div>

<img class="diagram" src="/articles/clojurescript-internals-vectors/img/vector-4-diagram.svg" />

<div class="callout btw">
(there is a [bug](http://stackoverflow.com/questions/21938875/text-in-svg-does-not-use-proper-font-when-drawn-to-an-img-element-in-chrome) in Chrome that makes these diagrams look a bit off)
</div>

What happens when the vector is larger than 32 elements? That is where the root comes into play. Generally, the root contains `floor(count / 32) * 32` elements  and the tail contains `count % 32` elements. So if the vector is 900 elements long, 896 elements go to the root, and the remaining 4 head to the tail.

<div class="callout addendum">
This is simplified and not entirely true. It's important that the tail never be empty. If a vector's length is a multiple of 32 (say 64), then the above would suggest all the elements go into the root. But in reality, 32 will be diverted to the tail
</div>

Here is what a vector created by `(apply vector (range 0 64))` looks like
<img class="diagram" src="/articles/clojurescript-internals-vectors/img/vector-64-diagram.svg" />

here's `(apply vector (range 0 900))`

<img class="diagram" src="/articles/clojurescript-internals-vectors/img/vector-900-diagram.svg" />

and here's `(apply vector (range 0 11000))`

<img class="diagram" src="/articles/clojurescript-internals-vectors/img/vector-11000-diagram.svg" />

The root's nodes are instances of `cljs.core.VectorNode`. A VectorNode basically just contains a JavaScript array which either contains more VectorNodes, or actual elements of the vector. `VectorNode` is not too important for our discussion, so we'll gloss over it from here on out. Notice elements are always found at the leaves of the tree.

## Conj'ing Vectors

Let's get a feel for how the root and tail work by exploring `conj`

Here is Vector's conj implementation. Don't worry about studying this block too much, we're going to break it into pieces

```clojure
(-conj [coll o]
    (if (< (- cnt (tail-off coll)) 32)
      (let [len (alength tail)
            new-tail (make-array (inc len))]
        (dotimes [i len]
          (aset new-tail i (aget tail i)))
        (aset new-tail len o)
        (PersistentVector. meta (inc cnt) shift root new-tail nil))
      (let [root-overflow? (> (bit-shift-right-zero-fill cnt 5) (bit-shift-left 1 shift))
            new-shift (if root-overflow? (+ shift 5) shift)
            new-root (if root-overflow?
                       (let [n-r (pv-fresh-node nil)]
                           (pv-aset n-r 0 root)
                           (pv-aset n-r 1 (new-path nil shift (VectorNode. nil tail)))
                           n-r)
                       (push-tail coll shift root (VectorNode. nil tail)))]
        (PersistentVector. meta (inc cnt) new-shift new-root (array o) nil))))
```

(This code was taken from [here](https://github.com/clojure/clojurescript/blob/22dd4fbeed72398cbc3336fccffe8196c56cd209/src/cljs/cljs/core.cljs#L4226))

<div class="callout addendum">
This is the vector specific `-conj` method, the actual `conj` method we just called is [here](https://github.com/clojure/clojurescript/blob/22dd4fbeed72398cbc3336fccffe8196c56cd209/src/cljs/cljs/core.cljs#L1115), it uses Clojure protocols to find and invoke vector's `-conj` when called with a vector
</div>

Vector's `-conj` essentially works out to this

```
if the tail has room in it (less than 32 elements)
    stick the new element in a new tail
    return a new vector created with the existing root and a new tail
else
    if there is room in the root
        create a new root that has the tail moved into it
        create a new tail containing the new element
        return a new vector with the new root and new tail
    else
        create a new root that is larger by one level
        move things around so there is now room in the new root
        proceed similar to the "room in root" case from here
```

### When the tail has room

Let's start with a simple case

```clojure
(def a (apply vector (range 0 34)))
(def b (conj a 99))
(println b) ; [0 1 2 3 4 5 ... 31 32 33 99]
```

`a` is 34 elements long, with 32 elements sitting in the root and 2 hanging out in the tail. There's plenty of room in the tail, so this is the first case inside `conj`

```clojure
;; the chunk of conj that handles the "tail has room" case
(let [len (alength tail)
      new-tail (make-array (inc len))]
  (dotimes [i len]
    (aset new-tail i (aget tail i)))
  (aset new-tail len o)
  (PersistentVector. meta (inc cnt) shift root new-tail nil))
```

`make-array` will create our new tail that is one larger than the original tail (`(inc len)`), then we iterate over the original tail and copy its contents into the new tail. At the end of the new tail, the new value `o` is placed and from there a new instance of `PersistentVector` is returned.

<img class="diagram" src="/articles/clojurescript-internals-vectors/img/vector-34-conj-diagram.svg" />

## No room in the tail, but room in the root
This time let's consider conj'ing onto a vector that has 64 elements

```clojure
(def a (apply vector (range 0 64)))
(def b (conj a 99))
```

This time the tail is full, so that makes the tail a candidate to become a new leaf in the root's tree. And from there we just create a brand new tail containing the new element. We can see this happening in the `conj` code

```clojure
;; the part of conj that deals with the "tail is full" case
(let [root-overflow? (> (bit-shift-right-zero-fill cnt 5)
                        (bit-shift-left 1 shift))
      new-shift (if root-overflow? (+ shift 5) shift)
      new-root (if root-overflow?
                  (let [n-r (pv-fresh-node nil)]
                    (pv-aset n-r 0 root)
                    (pv-aset n-r 1 (new-path nil shift (VectorNode. nil tail)))
                    n-r)
                  (push-tail coll shift root (VectorNode. nil tail)))]
  (PersistentVector. meta (inc cnt) new-shift new-root (array o) nil))
```

The above code has both root cases (whether the root is full or not) intertwined. If `root-overflow?` is false, then our root still has some room in it. In that case all that really happens is `new-root` gets set by the call to `push-tail`, which returns a new root with our existing tail added to it. Then ultimately we return a new vector housing the new root and we quickly whip up a new tail for it that contains the appended element with `(array o)`.

<img class="diagram" src="/articles/clojurescript-internals-vectors/img/vector-64-conj-diagram.svg" />

This diagram is pretty telling. `b` "borrows" everything from `a`, and `a` remains unaffected. A great example of how ClojureScript accomplishes persistence and immutability all while maintaining a good performance footprint.

## The final case, the root is full
This is the most complex case. If your conj'ed out, feel free to <a href="#advantages-to-the-root-tail-design">head onto the next section</a>.

### introducing shift
It's no coincidence that 32 is how large VectorNodes can be and the upper bound for the tail's size. Working with powers of 2 has some nice advantages. You probably noticed the `bit-shift...` methods up above in the conj code. Clever usage of bitwise operations enables the vector to efficiently determine things about itself like whether its root has overflown, or how many of its elements are in the tail.

Each vector has a `shift` property, which is a multiple of 5, `1 << 5` is 32. Basically the shift is telling us how many elements the root can hold. When shift is 5, the root has a depth of 1, 10 means a depth of 2, and so on. Way up there when we manually created our own PersistentVector, we passed in `5` as our shift. Shift also tells other things about the vector, as we'll see later on when we index into one (its name will make more sense then too).

When a vector has a shift of 5, its root can at most hold 32 * 32 elements (1024). That is, the root contains 32 VectorNodes, and each VectorNode holds 32 elements of the vector.

Now we can begin to understand how vectors determine if their root is full

```clojure
(let [root-overflow? (> (bit-shift-right-zero-fill cnt 5)
                        (bit-shift-left 1 shift))])
```

Take the case of a vector having 1056 elements

```clojure
(def a (apply vector (range 0 1056)))
(def b (conj a 9999))
```

<img class="diagram" src="/articles/clojurescript-internals-vectors/img/vector-1056-diagram.svg" />

This vector is packed to the gills, `root-overflow?` will be true. Before it can proceed, the root needs to grow by one level

```clojure
;; creation of the new root.
;; the root not overflowing case removed for better clarity
(let
  [new-shift (+ shift 5)
  [new-root (let [n-r (pv-fresh-node nil)]
              (pv-aset n-r 0 root)
              (pv-aset n-r 1 (new-path nil shift (VectorNode. nil tail)))
              n-r))
```

Here a new root node is created with `pv-fresh-node`, then the existing root is  pushed down to become a child, and then the tail becomes the second child with `new-path`


<img class="diagram" src="/articles/clojurescript-internals-vectors/img/vector-1056-conj-diagram.svg" />

This last diagram's a little noisy, but again everything gets shared between `a` and `b`.

## Advantages to the Root/Tail Design
This is a lot of hoopla just to add a new element onto a vector. Why all the fuss?

```clojure
(def a (apply vector (range 0 100000)))
; this conj happens quickly
(def b (conj a 1))
```

Big deal! In JavaScript `myGiantArray.push(1)` is also very fast! In fact, it's faster! But ClojureScript is maintaining immutability (and persistence), where `push` mutates in place. A naive approach to accomplishing immutability in JavaScript would be

```javascript
function arrayConj(array, x)
  var newArray = array.slice(0);
  newArray.push(x);
  return newArray;
}
```
That `slice()` is very costly in time and memory when the array is large. Obviously that's a terrible way to accomplish immutability, a real JavaScript immutable data structure would probably end up working very similar to ClojureScript's vector.

Fair enough, but can't the root just be an array? Not ideally, because as we saw in the above case where the vector had 64 elements, we were able to create a second root very efficiently. The first root is maintained, as the first vector still needs it. The second root was just a matter of moving some tree nodes around. If the root was a flat array, then this would have called for more cloning.

### Indexing into the vector
Since the root is a tree, some performance is lost when we need to look up an element. With an array, finding an element is a matter of simple arithmetic. But `(nth my-giant-vector 200)` will require the vector to dig inside the root and figure out where its 200th element lives before it can return it. This requires a little tree traversal, and is done with the [`unchecked-array-for` function](https://github.com/clojure/clojurescript/blob/22dd4fbeed72398cbc3336fccffe8196c56cd209/src/cljs/cljs/core.cljs#L4129)

```clojure
(defn- unchecked-array-for [pv i]
  (if (>= i (tail-off pv))
      (.-tail pv)
      (loop [node (.-root pv)
             level (.-shift pv)]
        (if (pos? level)
          (recur (pv-aget node (bit-and (bit-shift-right-zero-fill i level) 0x01f))
                 (- level 5))
          (.-arr node)))))
```

Ultimately a vector is a tree of arrays, so `unchecked-array-for` is finding the array that contains the queried index, and from there it's just a matter of indexing into a standard JavaScript array. The top of the `if` first figures out if the index is in the tail, if so the answer is easy. Otherwise `loop` is used to move down through the tree. Again, clever use of bitwise operations enables finding the path through the tree to be efficient.

`pv-aget` is a simple method that knows a VectorNode contains an array, it effectively does `node.arr[i]`, and determining what `i` is relies on some bit-wise logic. `(bit-and (bit-shift-right-zero-fill i level) 0x01f)` works out to be `(i >>> level) & 31`, which tells us which array at each level is the one we need to traverse down into.

That was pretty dense, no? To put that nonsense another way, the index contains its own path into the tree. Let's take a look at

```clojure
(def my-giant-vector (apply vector (range 0 1048586)))
;; grab the 142600th element
(def n (nth my-giant-vector 142600))
```

This looks like:

<img class="diagram" src="/articles/clojurescript-internals-vectors/img/vector-traversal.svg" />

By chopping `142600` into 5 bit chunks, we find the path into the vector

<table class="bit-table">
<tr class="number">
<td colspan="4">
<div>142600</div>
</td>
</tr>

<tr class="number">
<td colspan="4">
<div>00100010110100001000</div>
</td>
</tr>

<tr class="bit-chunks">
<td><div>00100</div></td><td><div>01011</div></td><td><div>01000</div></td><td><div>01000</div></td>
</tr>

<tr class="indices">
<td><div>4</div></td><td><div>11</div></td><td><div>8</div></td><td><div>8</div></td>
</tr>

</table>

And "chopping into 5 bit chunks" is what `unchecked-array-for` is doing. Pretty clever.

## Wrapping It Up

The immutability offered by ClojureScript data structures is great. But at the same time, vectors look and feel like arrays. That familiar feeling can be deceiving. It is useful to get a sense for how they are implemented, so you can make better choices when using them. I was inspired to make this post when one of my first ClojureScript apps ended up being really slow. I was using large vectors and lots of lazy sequences, causing a significant performance degradation. I decided to dig into the code to find out why. I hope to one day also write a bit on how lazy sequences work in ClojureScript too, so stay tuned!
