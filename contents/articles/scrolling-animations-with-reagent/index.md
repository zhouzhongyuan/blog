---
title: Scrolling Animations With Reagent
author: Matt
date: 2015-02-26
template: article.jade
---
Here is a small demo of one of those gimmicky "scroll to animate" pages built with Reagent (which is based on React.js) and ClojureScript.

<span class="more"></span>

## Demo

You can see the demo [here](/reagent-scroll-demo) and its GitHub repo is [here](https://github.com/city41/reagent-scroll-demo).

Here's a quick rundown on how the system works.

## Grabbing Window Scroll Events with core.async

The animation engine itself is completely separate from window scroll events. You could just as easily feed the engine via time, a slider on the page, button presses, etc. But using the window's scroll position is a common approach, so that's what I did in the demo.

Listening for the window scroll with `core.async` is really simple:

```clojure
(defn- get-scroll []
  (-> (dom/getDocumentScroll) (.-y)))

(defn- events->chan [el event-type c]
  (events/listen el event-type #(put! c %))
  c)

(defn scroll-chan []
  (events->chan js/window EventType/SCROLL (chan 1 (map get-scroll))))
```

Every time the window produces a scroll event, we'll jam it into a channel. The event object itself has no real scroll position information, so we throw it away and instead just query the document for its current position. That's what's happening with `(chan 1 (map get-scroll))`

<div class="callout wisdom">
This is all a very simple application of core.async and transducers. If this is new territory, I recommend checking out [David Nolen's webinar](http://go.cognitect.com/core_async_webinar_recording) on the subject. He does a great job explaining all of this and will likely make you a fan of core.async in the process.
</div>

Now with the channel code in hand, the main file of the demo sets up a channel and pulls from it

```clojure
(defn listen! []
  (let [chan (scroll-chan)]
    (go-loop []
             (let [new-y (<! chan)]
               (reset! prev-scroll-y @cur-scroll-y)
               ;; not interested in negative values
               (reset! cur-scroll-y (max 0 new-y)))
               (recur))))
```

With one call to `(listen!)`, the app will receive the new scroll position of the window and store it in `cur-scroll-y`, and push the previous one over into `prev-scroll-y`. These two values together are fed into the animation engine and allow the magic to happen.

## Declarative Animations

The animation system has an `animation-container` component that takes two things: the actual Reagent component that should get animated, and an animation config that describes how the animations should occur.

```clojure
(defn page []
  [:div.page
   [animation-container
    @prev-scroll-y
    @cur-scroll-y
    [:div "I'm going to move across the screen"]
    {:style {:top 100
             :left 100
             :width 50
             :height 50}
     :animations {[0 1000] {:left [100 500]
                            :opacity [1 0]}}}]])
```

Here we have a page component which contains an animation-container which contains a simple little div. That little div will be what gets animated.

The key bit here is `:animations {[0 1000] {:left [100 500] :opacity [1 0]}}`. The `animations` map has vector keys that indicate the scroll range of the window. Then the values are the animations that should occur. In this case we're saying *"as the window scrolls from a y of 0 to 1000, move this element from 100px to 500px, and fade its opacity from 1 to 0 too."*

The ability to create maps in ClojureScript that have anything at all as their keys is really awesome.

You can add more animations to the map, to allow the element to do all kinds of things. I was really pleased with the simple syntax that ClojureScript allowed me.

## The Animation Engine

The goal of the engine is to take the animation definition and properly tween elements as the window scrolls. So if an animation wants to be active from scroll values 0 to 1000, and the user has scrolled from 0 to 20, the engine needs to figure out where on the page things should be considering the animation is only 2% done.

There isn't [that much code](https://github.com/city41/reagent-scroll-demo/blob/master/src/cljs/scroll_demo/scroll_engine.cljs) for the engine itself, but accounting for smooth scrolling made it a tad complicated.

By "smooth scrolling" I mean keeping the animations moving smoothly forward even if the user forces the window to scroll really far at once. You can see this in the [demo](/reagent-scroll-demo) by clicking in the brower's scrollbar. This causes the scroll to jump forward, and the boxes respond by still smoothly proceeding, instead of jumping instantly to the new spot.

This requires the engine to keep track of how an element's animations are progressing and adjust them as needed whenever new scroll values come in. An element could be moving from 100px to 110px and made it to 104px when the user scrolls some more. Now the element needs to move from say 104px to 120px.

This is what the call to [animate!](https://github.com/city41/reagent-scroll-demo/blob/31a2b5f997f3c907f971dab79b3e8f4bcb521329/src/cljs/scroll_demo/scroll_engine.cljs#L117) is doing. Whenever new scroll values come in, it's up to `animate!` to figure out where the element should go next. The new animation goals really get figured out in `update-tween-props`

```clojure
(defn update-tween-props
  "Given a tween object and the new state of the world, updates
  the tween so it can now progress towards the new goal. Takes into
  account how far the tween already progressed when deciding the tweens new goals."
  [tween pv cv duration ani]
  (let [current (:current tween pv)
        remaining (:remaining tween 0)
        new-duration (+ duration remaining)]
    (assoc tween
           :ani ani
           :slice [current cv]
           :duration new-duration
           :remaining new-duration
           :current current)))
```

Each animating component has a `tween` map that keeps track of its current animation state. This method is inspecting that map, and using the new scroll position (`pv` for previous value and `cv` for current value) as well as how long the new animation should take. From there the tween takes the remainder of its current animation, adds it onto the new needed animation, and then it's all set.

The other piece of the puzzle is [(start-loop!)](https://github.com/city41/reagent-scroll-demo/blob/31a2b5f997f3c907f971dab79b3e8f4bcb521329/src/cljs/scroll_demo/scroll_engine.cljs#L112). This part is a bit simpler. Whenever an animation-container is created, it calls `start-loop!` to kick off a `requestAnimationFrame` rendering loop. Inside the `requestAnimationFrame` callback, that same tween object is told to tween itself, and move the CSS properties the appropriate amount to accomplish the animation.

Both `start-loop!` and `animate!` make use of the same tween map (which is stored in an atom). So at the end of the day, `start-loop!` continually marches the animation towards its current goal, and `animate!` continually updates what the goal is based on new window scroll information.

## Conclusion

I'm reasonably happy with this setup so far, but I'll be tweaking and improving things as well. The code is demo quality at best and there's a few improvements needed right off the bat, for example `requestAnimationFrame` is always called no matter what, even if no animation is currently needed.

I'm building one of those gimmicky scrolling pages now, so thought I'd have a little fun with my own engine. I'll be improving things as the page progresses. I'll be sure to update my blog when I have anything interesting to share.
