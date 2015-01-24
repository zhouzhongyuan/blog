---
title: Reagent Rocks!
author: Matt
date: 2015-01-24
template: article.jade
---
Lately all of my front end work has been in [Reagent](http://holmsand.github.io/reagent/), a [ClojureScript](https://github.com/clojure/clojurescript) interface to Facebook's [React](http://facebook.github.io/react/). I'm really enjoying working with Reagent, this post attempts to shed some light on why.

<span class="more"></span>

## ClojureScript Crash Course

If you're at all familiar with Clojure, go ahead and <a href="#on-to-reagent">skip to the next section</a>. This is a *very* quick introduction to the language, it will help make the Reagent bits coming later more clear.


### Functions

Functions are created with `defn`:

```clojure
(defn add [a b]
  (+ a b))
```

is roughly equivalent to:

```javascript
var add = function(a, b) {
  return a + b;
};
```

ClojureScript functions always return the last expression that was evaluated.


### Maps
Maps are similar to JavaScript objects, they are collections of key/value pairs:

```clojure
{"name" "Calvin" "position" "goalie"}
```

is roughly equivalent to:
```javascript
{
  name: "Calvin",
  position: "goalie"
}
```

### Keywords

Notice how the map above used strings for keys? That's a little awkward. More commonly keywords are used. Think of them as simple constants:

```clojure
{:name "Calvin" :position "goalie"}
```

### Vectors

Vectors are similar to JavaScript arrays:

```clojure
;; simple vector
[1 2 3]

;; you can put anything in a vector
["a string" [:even :another :vector]]
```

<div class="callout pitfall">
This crash course glossed over many many things. Clojure fans are clenching their teeth right about now. If you want more information, I recommend starting with David Nolen's [ClojureScript tutorial](https://github.com/swannodette/lt-cljs-tutorial)
</div>

## On to Reagent

Phew! Now let's start building some Reagent components. Here's a very simple one:

```clojure
(defn hello []
  [:div "hello world"])
```

By itself it doesn't do much, but we can render it to the page like so

```clojure
(reagent/render hello (.getElementById js/document "my-container"))
```

Take another look at the `hello` component. It's simply a function that returns a vector containing a keyword and a string. Nothing more than bread and butter Clojure. If you're familiar with React, you might be wondering where `createClass`, `componentDidMount`, `render` and all of that other hoopla went. *There's no boilerplate at all!*

<div class="callout wisdom">
React fans might be crying fowl about now. The above would be `React.createElement('div', null, 'hello world')` in React. Also pretty simple. But in Reagent, there is no distinction between elements and components, they're all just vanilla ClojureScript functions.
</div>


Of course you'll be doing more than rendering "hello world" into your webpages, and Reagent doesn't manage to keep this abstraction up indefinitely. But it does a great job overall. If you need to, dropping down to the "metal" of React is possible, as is integrating Reagent with native React components. Reagent covers all the bases.

### Getting More Involved

Components can take parameters

```clojure
(defn hello [name]
  [:div "hello " name])

(reagent/render [hello "Bob"] (.-body js/document))
```

Notice `hello` was passed to `render` inside a vector? Since hello is just a function, shouldn't it be `(hello "Bob")`? Technically you can get away with that in simple scenarios, but by handing Reagent a vector, Reagent can then only invoke your component when it needs to, allowing for more efficient rendering.

Components can also contain other components:

```clojure
(defn page [body]
  [:div.page
    [:div.header "This is the header"]
    body
    [:div.footer "This is the footer"]])

(reagent/render [page [hello "Bob"]] (.-body js/document))
```

And yeah, adding classes to elements is as simple as appending them to the keyword, ie `:div.header`

## ClojureScript Crash Course Part Two

Almost everything in ClojureScript is immutable. You can't alter a vector after it's been created, for example. To accomplish mutability, ClojureScript has atoms:

```clojure
(def my-atom (atom 4))
```

An atom is a reference to an object. You can get at the object by dereferencing the atom:

```clojure
(.log js/console (deref my-atom))

;; or, use the @ sugar
(.log js/console @my-atom)
```

It's very similar to dereferencing a pointer in C.

You can update the atom with `reset!` or `swap!`:

```clojure
;; reset! causes the atom to point at a different object
(reset! my-atom 6)

;; this now prints 6
(.log js/console @my-atom)

;; swap is a little trickier
;; you give it a function and any needed arguments to update the atom
(swap! my-atom + 5)

;; the above is effectively this:
;; (reset! my-atom (+ @my-atom 5))

;; this will print 11
(.log js/console @my-atom)
```

<div class="callout pitfall">
And again, this is super glossed over
</div>

## Atoms and Reagent

Not surprisingly, atoms are how Reagent deals with state too. Let's create a component that expands and collapses whenever the user clicks it:

```clojure
(def expanded (atom true))

(defn on-header-click []
  (swap! expanded not))

(defn expandable-view []
  [:div.expandable
    [:div.header {:on-click on-header-click}
      "Click me to expand and collapse the body"]
    (if @expanded
      [:div.body "I am the body"])])
```

Here the header div gets a map, allowing us to add a click handler. Every time the header gets clicked, the atom alternates between `true` and `false` (that's what `swap!` and `not` are up to, `not` flips booleans). Whether the body is present depends on the state of the `expanded` atom.

Except this isn't *entirely* true. In order to pull off the above, we need to swap out the native atom with an atom that Reagent provides:

```clojure
;; use a Reagent atom instead
(def expanded (reagent/atom true))

;; as before ...
```

Reagent atoms (aka ratoms) are a little magical. Reagent keeps track of all the components that are using ratoms. Whenever a ratom changes, all of the affected components are rerendered. Since React is underneath, the rendering is super efficient and fast (virtual DOM and all that good stuff). Other than the magic, ratoms behave just like real atoms.

## All This Adds Up To ...

I took you through this whirlwind tour of ClojureScript and Reagent to finally be able to make the point that Reagent and ClojureScript are really a stellar combo.

Notice in the last component the call to `if`? It's trivial to build up your components using just about anything in your ClojureScript toolbox as you see fit. Atoms are a simple, straightforward way to deal with state, and at the end of the day your code just describes your components and how they should behave. It's easy to reason about and a pleasure to work with.

### Ratom Flavors

Ratoms tend to come in two flavors, and roughly correspond to props and state in React. Prop-like ratoms contain data, typically pulled down from your server with an AJAX call. And state-like ratoms just keep track of things like "expanded or collapsed". I tend to couple state-like ratoms directly into my components:

```clojure
(defn expandable-view []
  (let [expanded (reagent/atom true)]
    (fn []
      [:div.expandable
        [:div.header {:on-click #(swap! expanded not)}
         "Click me to expand and collapse"]
        (if @expanded
          [:div.body "I am the body"])])))
```

In the above the `expanded` atom got pulled inside of the component. This is a bit more advanced than the other examples, but the general concept should be clear.

And I tend to decouple my prop-like data ratoms from my components. I instead manage them elsewhere and simply pass them to the component as a parameter. This makes reusing and testing components very easy:

```clojure
(defn comment-view [comment]
  [:div.comment
    [:span.author (:author comment)]
    [:span.body   (:body comment)]])

;; here comments is a ratom that probably got populated
;; with an AJAX call. But comment-list doesn't care,
;; it just takes the comments and runs with them
(defn comment-list [comments]
  [:div.comment-list
    (for [comment @comments]
      [comment-view comment])])
```

Again, Reagent simplifies things and lets you construct your components in whatever way works best for you. The hard distinction between props and state is completely gone, instead just use ratoms however you prefer.

That about wraps it up for now. If you're on the fence about ClojureScript,  I'm hoping I piqued your interest a little bit.
