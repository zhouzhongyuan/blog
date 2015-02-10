---
title: Embedding SVG into a Reagent Component
author: Matt
date: 2015-02-09
template: article.jade
---
SVG is still a pretty strange beast in browsers. I'm intrigued by it, but still haven't found a truly killer way to bend it to my will. I've used D3 and other libraries in the past and enjoyed them, but I feel like SVG's potential still has yet to be really unlocked. Can Clojure macros and Reagent be helpful with SVG?

<span class="more"></span>

## React and Reagent's SVG support

React supports SVG pretty well, you can directly place SVG in your React components, and that is true of Reagent as well

```clojure
(defn some-svg-component []
  [:svg {:x 0 :y 0 :width 50 :height 50}
    [:rect {:x 10 :y 10 :width 10 :height 10}]])
```

but man, how often do you want to write out SVG by hand?

## Embedding SVG directly into a Reagent component

With macros and [clj-tagsoup](https://github.com/nathell/clj-tagsoup) in hand, it's super easy to embed an SVG file right into your Reagent code

```clojure
(ns embed.svg
  (:require [pl.danieljanus.tagsoup :as ts]))

(defmacro embed-svg [svg-file]
  (let [hiccup (ts/parse-string (slurp svg-file))]
    `~hiccup))
```

and then in the component

```clojure
(defn some-svg-component []
  (embed-svg "cool-svg-image.svg"))
```

This works perfectly well. The output from `clj-tagsoup` is perfectly compatible with Reagent (so great the Clojure community has largely agreed on [hiccup](https://github.com/weavejester/hiccup) syntax!)

## Taking It Further?

The above doesn't buy you much, you're better off including the svg in an `img` tag. So can we do more? I'm not sure yet ...

I have one SVG diagram that I want users to be able to click on different parts of. From there, the page focuses on that part of the diagram. I was able to do this with macros

```clojure
(defn- assoc-click-handler [m]
  (assoc m :class `(if (= ~'focused-id ~(:id m)) "focused" "")
           :on-click
           `(fn [] (history/go-to (str "/basics/rink/" ~(:id m))))))

(declare create-click-handlers)

(defn- add-click-handlers-for-ids [obj]
  (cond
    (vector? obj) (create-click-handlers obj)
    (and (map? obj) (contains? obj :id)) (assoc-click-handler obj)
    :else obj))

(defn create-click-handlers [tags]
  (apply vector (map add-click-handlers-for-ids tags)))

(defmacro embed-clickable [svg-file]
  (let [hiccup (-> (slurp svg-file)
                   (ts/parse-string)
                   (create-click-handlers))]
  `~hiccup))
```

Doing just about the same thing as before, but for any map inside of clj-tagsoup's output that has an `id` in it (in other words, the SVG element has an id), I also swoop in and throw a click handler on it. It's bad practice that `assoc-click-handler` makes assumption about its environment (`focused-id` and `(history/go-to)` live in the same file as where I call the macro), but I'm ok with that, at least for now.

Any elements in my SVG that have ids will be "focusable" by the user clicking on them. So I am free to build a very complicated SVG in a vector editor, and still get interactivity out of it pretty painlessly.

## More?

I'm still exploring macros+SVG. I'm not convinced there's all that much here, but if I stumble upon anything super cool I'll definitely put up a new post here.
