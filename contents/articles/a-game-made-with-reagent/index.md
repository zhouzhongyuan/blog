---
title: A Game Made With Reagent
author: Matt
date: 2015-02-03
template: article.jade
---
Mostly for the heck of it, I built Breakout using ClojureScript and Reagent. I was pretty pleased with the results.
<span class="more"></span>

I based it off of the [Breakouts project](http://www.jsbreakouts.org) that I started a while back.

<div class="center diagram">
  <img src="img/reagent-breakout.png" alt="screenshot of breakout" />
</div>

You can play it [here](http://city41.github.io/reagent-breakout).

## The Reagent Components

The components such as the ball and bricks are dead simple, there's pretty much nothing to them. Here is the ball

```clojure
(ns breakout.cmp.ball)

(defn cmp [pos size]
  [:div.ball {:style {:background-image "url(img/tiles.png)"
                      :position "absolute"
                      :width (:width size)
                      :height (:height size)
                      :top (:y pos)
                      :left (:x pos)}}])
```

All of the animation is accomplished with [CSS](https://github.com/city41/reagent-breakout/blob/master/resources/public/css/site.css), which helped make everything that much more simple. Small lesson learned, even on a tiny project like this I should have used a CSS generation tool. CSS, why are you so tedious?

### Using React's CSSTransitionGroup for the bricks

Whenever a brick is hit, it fades out using a CSS animation. React's [CSSTransitionGroup](http://facebook.github.io/react/docs/animation.html) is perfect for this, and easy to get going in Reagent. Just add it as one of your components, and underneath it place all the components that need animation

```clojure
(def ctg (aget js/React "addons" "CSSTransitionGroup"))

;; ...

[ctg {:transitionName "spawn"}
  (for [brick @bricks]
    ^{:key brick} [brick/cmp brick])]
```

I was really happy how seamlessly CSSTransitionGroup dropped right in.

## The Game Logic

By far the beefiest file is [level.cljs](https://github.com/city41/reagent-breakout/blob/master/src/cljs/breakout/engine/level.cljs). Weighing in at 184 lines of code, it manages everything related to playing the game.

The hit detection could still use some work, but 184 lines to whip up a Breakout game from scratch isn't bad at all. I have no game engine helping me out, and needed to pretty much roll everything myself. The entire game from head to toe is 403 lines of code.

`level.cljs` calls `requestAnimationFrame` in order to accomplish its game loop, and from there it just updates a lot of atoms that represent the current state of the game. From there the Reagent components just render that state, with almost no logic at all of their own. This worked out well, but I think `level` could probably still be cleaner and simpler.

### multimethods and watching atoms

When playing the game there are two phases

1. the countdown phase: where the player waits for numbers to count down before beginning, giving them a chance to get ready
1. the play phase: standard breakout gameplay

I was able to separate out these phases using multimethods, which made the code cleaner.

```clojure
(defn- update! [ts]
  (when @running
    (let [delta (- ts (or @last-ts ts))]
      (reset! last-ts ts)
      (update-phase! delta @phase))
    (. js/window (requestAnimationFrame update!))))
```

Here `update-phase!` will end up calling the appropriate function for the current phase, for example here is what the countdown phase does

```clojure
(defmethod update-phase! :countdown [delta _]
  (swap! countdown-duration - delta)
  (when (<= @countdown-duration 0)
    (reset! phase :gameplay)))
```

By adding a watch to the `phase` atom, it was really easy to set up a tiny little state machine in the game

```clojure
(add-watch phase :scene-phase
           (fn [key r old-phase new-phase]
             (when new-phase
               (init-phase! new-phase))))
```

Whenever switching phases, this watch handler kicks in and asks the new phase to do any initialization it needs (such as placing the ball back to its starting location). Again multimethods helped to separate the initialization of the phases into separate methods.

## Performance

Granted this is a very simple game, but my computer has no problem running it at 60fps. And despite creating a *ton* of objects, the memory never gets out of control nor do I see any garbage collection hiccups. It seems like modern JavaScript engines can handle ClojureScripts immutable approach pretty well.

## Figwheel

I'm digging [Figwheel](https://github.com/bhauman/lein-figwheel). It creates a connection between your dev environment and the browser, and pushes changes as they happen. This is great for tweaking CSS and Reagent components in real time. I found with a game Figwheel can get a little confused and thus a hard refresh is occasionally needed, `requestAnimationFrame` and the loads of game state seem to foil it. Or maybe I just need to explore the tool some more.

## Conclusion

Not the most practical project I've ever taken on, but it was fun. I'm impressed with how far DOM manipulation performance has come, especially with React's virtual DOM.
