---
title: Traceur, Gulp, Browserify and ES6
author: Matt
date: 2014-09-20
template: article.jade
---
Here's a brain dump of my experience getting these recent-ish techs up and running together on a small project ...

<span class="more"></span>

## Project Structure and Goal

My project (named baby-engine), is structured like this, you can see it [here](https://github.com/city41/baby-engine)

```
src/
    <ES6 JavaScript source>

lib/
    <the ES6 js in src/ gets built and dumped into here as ES5 JS>

index.js  <-- npm module entry point written in vanilla ES5
              and require()s stuff from lib/

sandbox/
    <a small webpage that consumes the module and uses it>
```

I have two goals:

1. A standard npm module with the entry point at `index.js`, which then `require()`s stuff from `lib/`

2. A browserify'ed webpage that pulls in baby-engine and then uses it. This is a small test sandbox for dev purposes.

## Step One: ES6 Modules

My ES6 code is ES6 through and through, including modules. For example, I have a type called `RectEntity` that subclasses `BaseEntity`

```javascript
import BaseEntity from './base-entity';

class RectEntity extends BaseEntity {
    ...
}

export default RectEntity;
```

In the ES6 world, this all works just fine and as you'd expect. Traceur, however, does not quite turn this into a CommonJS module in the way I wanted.

Traceur will define the export from above as

```javascript
Object.defineProperties(exports, {
  default: {get: function() {
      return $__default;
    }},
  __esModule: {value: true}
});

...

var $__default = RectEntity;
```

What I really wanted was effectively `module.exports = RectEntity`, but I'm pretty convinced Traceur just won't do that. In ES6, `export <name> <value>` is how it works, and Traceur will use that name verbatim. Even if you do this in ES6

```
export class RectEntity ... {

}
```

which is perfectly legal, but still Traceur will give you an exports with a `RectEntity` property defined on it. I don't want a property, I just want `RectEntity` itself to be the export.

In ES6 land, `export default <value>` basically means "this is the default thing we are exporting from this module, if someone just imports this module, give them this". So you'd think `default` would translate into effectively `module.exports = RectEntity`, but it doesn't, it puts a `default` property on there. You can even see this in Traceur's code when you import another module:

```javascript
var BaseEntity = ($__base_45_entity__ = require("./base-entity"), $__base_45_entity__ && $__base_45_entity__.__esModule && $__base_45_entity__ || {default: $__base_45_entity__}).default;
```

That long line of generated code basically boils down to -- in CommonJS speak -- `var BaseEntity = require('./base-entity').default`

This meant my `index.js` ended up looking like this

```javascript
module.exports = {
  Engine: require('./lib/engine').default,
  RectEntity: require('./lib/rect-entity').default
};
```

Which is weird, but I can live with it.

## Step Two: The Traceur Runtime

Traceur requires a small runtime, it provides shims and some other utilities to help pull off ES6 features in ES5 land. There are several ways to get this runtime into your module, I'll list them in order of best to worst. If there is an even better way to pull this off [please let me know!](mailto:matt.e.greer@gmail.com)

### Approach one: pull it in yourself

This seems the cleanest to me. Install traceur as a dependency (`npm install --save traceur`), then in `index.js`, require the runtime

```javascript
require('traceur/bin/traceur-runtime');

module.exports = {
  Engine: require('./lib/engine').default,
  RectEntity: require('./lib/rect-entity').default
};
```

It will define the runtime on `global` and from there the rest of your transpiled code will be happy. Pretty simple.

### Approach two: pull it in with gulp-traceur

I am transpiling from ES6->ES5 using [gulp-traceur](https://github.com/sindresorhus/gulp-traceur)

```javascript
gulp.task('build:lib', function() {
  return gulp.src('src/**/*.js')
    .pipe(traceur({modules:'commonjs'}))
    .pipe(gulp.dest('./lib'));
});
```

the above will transpile the code but not include the runtime. gulp-traceur makes it available at `traceur.RUNTIME_PATH`, so you can just do

```javascript
gulp.task('build:lib', function() {
  return gulp.src([traceur.RUNTIME_PATH, 'src/**/*.js'])
    .pipe(traceur({modules:'commonjs'}))
    .pipe(gulp.dest('./lib'));
});
```

except *this does not work!* At least, it does not work for me because I am using ES6 modules. I want Traceur to output CommonJS modules for me, and the above causes a chicken and egg scenario. The Traceur runtime itself will be made into a CommonJS module. Which is fine, except any CommonJS module built by Traceur first needs the Traceur runtime. You will get an error that `Reflect is not defined`. This is because `Reflect` gets defined inside the runtime.

There are two solutions to this:

**Don't use ES6 modules in your ES6 code:** Stick with the classic `module.exports` and `require()` as always, then turn off commonjs modules when invoking gulp-traceur.

**Create a second gulp task to pull the runtime in:** this is hacky and ugly, but basically if you do

```
gulp('traceur:runtime', function() {
  return gulp.src(traceur.RUNTIME_PATH)
    .pipe(gulp.dest('./lib'));
});

gulp.task('build:lib', ['traceur:runtime'], function() {
  return gulp.src('src/**/*.js')
    .pipe(traceur({modules:'commonjs'}))
    .pipe(gulp.dest('./lib'));
});
```

for either of the above solutions you still need to require the runtime in `index.js`.

### Approach Three: punt on it and let Browserify bring the runtime

Browserify and ES6 get along great thanks to [es6ify](https://github.com/thlorenz/es6ify). es6ify can bring the runtime in too, and for some scenarios this is the way to go. For me it's not, as it leaves my core NPM module dead in the water unless whoever consumes it knows they need to provide the runtime. Which is pretty lame.

With gulp, browserify and es6ify, it looks like this:

```javascript
gulp.task('browserify:sandbox', ['build:lib'], function() {
  return browserify()
    .add(es6ify.runtime)
    .transform(es6ify)
    .require(require.resolve('./sandbox/sandbox.js'), { entry: true })
    .bundle()
    .pipe(source('sandbox-bundle.js'))
    .pipe(gulp.dest('./sandbox/'));
});
```

Notice the strange call to Browserify's require? This is because you must include the runtime first. Otherwise your code will come first and it will be without its runtime and crap out.

An alternative way is this, which I actually prefer:

```javascript
gulp.task('browserify:sandbox', ['build:lib'], function() {
  return browserify(es6ify.runtime)
    .transform(es6ify)
    .add('./sandbox/sandbox.js')
    .bundle()
    .pipe(source('sandbox-bundle.js'))
    .pipe(gulp.dest('./sandbox/'));
});
```

I think this makes it more clear what's going.

## Phew!

Traceur, Gulp and all of these tools are still pretty new. Documentation is sparse, and blog posts (of which I just added to...) are all over the place. Hopefully this helps someone. If you know better ways to do any of this, I'd love to hear it. If you [email](mailto:matt.e.greer@gmail.com) with any tips, I'll be sure to update this post with them.
