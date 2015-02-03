---
title: ClojureScript: require vs import
author: Matt
date: 2015-01-27
template: article.jade
---
One of the first hurdles I encountered as I got into ClojureScript was the distinction between require and import. It's a little muddy at first. Here are some tips on keeping the two separate in your head.<span class="more"></span>

## require is about namespaces

`require` *always* brings other namespaces into your file. Always. The key to namespaces in ClojureScript is `/`, the forward slash is the divider between a namespace and a [symbols](link to symbol/var in docs) in that namespace.

my-namespace/my-symbol
<<< turn this into a diagram >>>

## import is about JavaScript



## Closure namespaces bring in the mud


```clojure
(ns demo
  (:require [goog.net.XhrIo]))
