---
title: CoffeeScript's Time is Waning For Me
author: Matt
date: 2014-01-12
template: article.jade
---

CoffeeScript was a welcome addition when it first arrived. Nowadays though, I am
finding its benefits are decreasing, and its drawbacks are increasing. I plan to
no longer use CoffeeScript in my future projects, here is why.

<span class="more"></span>

I've tweeted about this here and there, and today someone asked me why. 
So I thought I'd blog it out.

##EcmaScript 6 Has the Key CoffeeScript Features I Like

arrow functions, destructuring assignment and shorthand object literals are my
favorite features of CoffeeScript. They are all in EcmaScript 6. This is the
biggest reason why CoffeeScript is becoming less relevant to me. For sure, ES6
has a ways to go and not even Node has these features yet. But by the time my
current project is done, Node's Harmony support will likely meet my needs.

##EcmaScript 6 Has None of the CoffeeScript Features I Hate
### significant whitespace
I *hate* significant whitespace, and always have. I downright think it's wrong.
I grudgingly accepted it when adopting CoffeeScript. I really look forward to no
longer dealing with it.

As my project grows in size, significant whitespace becomes more and more of a
problem. It's just plain not readable or visually parsable. Your files become a
wall of dense text. Damn you Python, damn you to hell!

### implicit return
Using CoffeeScript has also made me dislike implicit return. Saving one keyword
is not worth this:

```ruby
module((provide) ->
  provide.value('foo', bar)
  return # <-- bleh
)
```

without `return` (or `null` or `undefined`, all ugly), the return value is
`provide.value()`s return value (a function), which is not what `module()`
wants here (leading to an error). I often have to do this to avoid loops
becoming unneeded expressions too. The real problem here though is not the
ugliness, but the occassional surprises. I don't even use implicit return, so a
double whammy for me.

##EcmaScript 5 is Ubiquitous for Me

I have to support IE8 at work, but not at home. ES5's features (especially the
array functions) negate even more of CoffeeScript's features for me.
CoffeeScript compiling all of its loop constructs into a standard for loop is a
nice little bonus though.

##Open Source Code is Better Written in JavaScript

If you're contributing to the JS community, you're better off writing in
JavaScript. More people will contribute and/or adopt your code. 

##Tooling Support 

Tooling support for CoffeeScript is pretty darn good. But it's not
perfect. It *is* perfect with JavaScript, it has to be. This is a minor point, but
eliminating even a little bit of friction is a good thing. Tools all tend
to support CoffeeScript just a little bit differently: where they dump the
compiled JS, how to specify wrap, etc. 

Not having to `grunt watch` your JS is another minor win.

##CoffeeScript Isn't Irrelevant Yet

Even for me, and it won't be for a while yet. But I do suspect I'm on my last CS
project. If you need to support old IEs, want to use PhantomJS, etc, then CS is
still very welcome. 

