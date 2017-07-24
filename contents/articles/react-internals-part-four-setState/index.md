---
title: "React Internals, Part Four: setState"
author: Matt
date: 2017-07-23
template: article.jade
---
In part four of this series we finally add `setState` to our little React clone. `setState` is a beast, so grab your favorite beverage and get comfortable!

## The series
<ul>
    <li>[part one: basic rendering](/articles/react-internals-part-one-basic-rendering)</li>
    <li>[part two: componentWillMount and componentDidMount](/articles/react-internals-part-two-componentWillMount-and-componentDidMount/)</li>
    <li>[part three: basic updating](/articles/react-internals-part-three-basic-updating)</li>
    <li>**part four: setState** <- you are here</li>
    <li>part five: transactions *coming soon!*</li>
</ul>

## Adding state to Feact

State and props are very similar in that they are both data and both influence how and when a component renders. The core difference is props come from an outside source, where state is entirely internal to the component. So far Feact only supports props, so before we can implement `setState` we need to add the notion of state itself to the framework.

### getInitialState

When mounting a fresh component, we need to set up its initial state, that's where this lifecycle method comes in. It's just called when a component is getting instantiated, so we need to hook into this method in the constructor function that `Feact.createClass` creates

```javascript
const Feact = {
    createClass(spec) {
        function Constructor(props) {
            this.props = props;

            // new lines added for state
            const initialState = this.getInitialState ?
                this.getInitialState() :
                null;
            this.state = initialState;
        }

        Constructor.prototype =
            Object.assign(Constructor.prototype, spec);

        return Constructor;
    }
}
```

Just like props, we set the state on the instance.

<div class="callout pitfall">
Notice if the component does not have `getInitialState` defined, the initial state will be `null`?
React won't default initial state to an empty object, so if you want to use state, chances are you
need to implement this method and return an object, otherwise your first render will blow up if it
tries to do `this.state.foo`
</div>

Now with `getInitialState` defined, Feact components can start using `this.state` whenever they'd like.

## Adding a simple setState()

Whenever a component wants to update, it needs to tell Feact "hey, I'd like to render again!", and `this.setState()` is the primary way to accomplish that. `setState` updates `this.state`, and triggers a render, which will send the component through the lifecycle methods `shouldComponentUpdate` -> `componentWillUpdate` -> `render` -> `componentDidUpdate` (which Feact doesn't have, but of course React does). 

### Defining setState on the component

Again we need to tweak `Feact.createClass` to get setState in place. To do this, we'll give all classes created this way a prototype, and this prototype will have `setState` defined

```javascript
function FeactComponent() {
}

FeactComponent.prototype.setState = function() {
    // to be implemented later
};

function mixSpecIntoComponent(Constructor, spec) {
    const proto = Constructor.prototype;

    for (const key in spec) {
        proto[key] = spec[key];
    }
}

const Feact = {
    createClass(spec) {
        function Constructor(props) {
            this.props = props;

            // new lines added for state
            const initialState = this.getInitialState ?
                this.getInitialState() :
                null;
            this.state = initialState;
        }

        Constructor.prototype = new FeactComponent();

        mixSpecIntoComponent(Constructor, spec);
        return Constructor;
    }
}
```

Prototypical inheritance in action. `mixSpecIntoComponent` in React is more complicated (and robust), dealing with things like mixins and making sure users don't accidentally clobber a React method.

### Threading setState over to updateComponent

Back in [part three](/articles/react-internals-part-three-basic-updating) we updated a component by calling `FeactCompositeComponentWrapper#receiveComponent`, which in turn called `updateComponent`. It makes sense to not repeat ourselves, so we should thread state updates through `updateComponent` too. We need to get all the way from `FeactComponent.prototype.setState` to `FeactCompositeComponentWrapper#updateComponent`. Currently Feact has no means of accomplishing this.

In React, there is the notion of "public instances" and "internal instances". Public instances are the objects that get created from the classes defined with `createClass`, and internal instances are the objects that React internally creates. In this scenario the internal instance is the `FeactCompositeComponentWrapper` that the framework created. The internal instance knows about the public instance, since it wraps it. But the relationship doesn't go in the opposite direction, yet now it needs to. Here `setState` is the public instance attempting to communicate with the internal instance, so with that in mind, let's take a stab at implementing `setState`

```javascript
function FeactComponent() {
}

FeactComponent.prototype.setState = function(partialState) {
    const internalInstance = getMyInternalInstancePlease(this);

    internalInstance._pendingPartialState = partialState;

    FeactReconciler.performUpdateIfNecessary(internalInstance);
}
```

React solves the "get my internal instance" problem with an instance map, which really just stores the internal instance on the public instance

```javascript
const FeactInstanceMap = {
    set(key, value) {
        key.__feactInternalInstance = value;
    },

    get(key) {
        return key.__feactInternalInstance;
    }
};
```

We'll set up this relationship while mounting

```javascript
class FeactCompositeComponentWrapper {
    ...
    mountComponent(container) {
		const Component = this._currentElement.type;
        const componentInstance =
            new Component(this._currentElement.props);
        this._instance = componentInstance;

        FeactInstanceMap.set(componentInstance, this);
        ...
    }
}
```

We have one other unimplemented method, `FeactReconciler.performUpdateIfNecessary`, but just like other reconciler methods, it will just delegate to the instance

```javascript
const FeactReconciler = {
    ...
    performUpdateIfNecessary(internalInstance) {
        internalInstance.performUpdateIfNecessary();
    }
    ...
}

class FeactCompositeComponentWrapper {
    ...
    performUpdateIfNecessary() {
        this.updateComponent(this._currentElement, this._currentElement);
    }
    ...
}
```

Finally, we are calling `updateComponent`! Notice we seem to be cheating a little bit. We are saying to update the component, but with the same element being used as both previous and next. Whenever `updateComponent` is called with the same element, then React knows only state is getting updated, otherwise props are updating. React will decide whether to call `componentWillReceiveProps` based on `prevElement !== nextElement`, so let's go ahead and throw that into Feact too

```javascript
class FeactCompositeComponentWrapper {
    ...
    updateComponent(prevElement, nextElement) {
        const nextProps = nextElement.props;
        const inst = this._instance;

        const willReceive = prevElement !== nextElement;

        if (willReceive && inst.componentWillReceiveProps) {
            inst.componentWillReceiveProps(nextProps);
        }
        ...
    }
}
```

That isn't the entirety of `updateComponent`, (check the fiddle at the end of the article for all the code), just enough to show that calling `setState()` does not cause `componentWillReceiveProps` to get called before the render happens. Which does make sense, `setState` has no means of influencing props, just state.

<div class="callout wisdom">
If you want a heads up on every render, whether caused by prop changes or state changes, then implement `componentWillUpdate` in your component. We won't add it to Feact since this blog series is already too long, but it's called right before a render, no matter what caused the render. The only exception is the first render, where you can hook into `componentWillMount` instead.
</div>


### Updating with the new state

If you trace through the code we've written so far, you'll see we're now hanging out in `updateComponent`, *and* the internal instance has the pending partial state waiting to be used at `internalInstance._pendingPartialState`. Now all we need to do is have the component render again -- this time with state --, then from there actually getting the update all the way into the DOM is the same procedure as done back in part three

```javascript
class FeactCompositeComponentWrapper {
    ...
    updateComponent(prevElement, nextElement) {
        const nextProps = nextElement.props;
        const inst = this._instance;

        const willReceive = prevElement !== nextElement;

        if (willReceive && inst.componentWillReceiveProps) {
            inst.componentWillReceiveProps(nextProps);
        }

        let shouldUpdate = true;
        const nextState =
            Object.assign({}, inst.state, this._pendingPartialState);
        this._pendingPartialState = null;

        if (inst.shouldComponentUpdate) {
            shouldUpdate =
                inst.shouldComponentUpdate(nextProps, nextState);
        }

        if (shouldUpdate) {
            this._performComponentUpdate(
                nextElement, nextProps, nextState
            );
        } else {
            inst.props = nextProps;
            inst.state = nextState;
        }
    }

    _performComponentUpdate(nextElement, nextProps, nextState) {
        this._currentElement = nextElement;
        const inst = this._instance;

        inst.props = nextProps;
        inst.state = nextState;

        this._updateRenderedComponent();
    }

    _updateRenderedComponent() {
        const prevComponentInstance = this._renderedComponent;
        const inst = this._instance;
        const nextRenderedElement = inst.render();

        FeactReconciler.receiveComponent(
            prevComponentInstance,
            nextRenderedElement
        );
    }
    ...
}
```

This updating of the component is almost identical to part three, with the exception of the added state of course. Since state just sits on the public instance at `this.state`, `_performComponentUpdate` only had a one line change and `_updateRenderedComponent` had no change at all. The real key change was in the middle of `updateComponent` where we merge the previous state with the new partial state, and this partial state originated way back in `this.setState()`.

### All done! ... right?

Phew, we now have `setState`! Here is a fiddle of what we have so far

<a class="fiddle" href="https://jsfiddle.net/city41/jth636nz/2/" target="_blank">fiddle</a>

But Feact's setState is a bit simple, not performant and could even be a little surprising. The main problem is every distinct call to `setState` causes the component to render. This forces the user to either figure out how to fit all their changes into one call, or accept that each call will render. It'd be better if the programmer could call `setState` when it's convenient, and let the framework batch the calls when it can, resulting in fewer renders.

## Batching setState calls

If you take a look at Feact's render lifecycle, you can see we call `componentWillReceiveProps` just before we're about to render. What if inside `componentWillReceiveProps` the user was to call `setState`? Currently in Feact, that'd cause it to go ahead and start a second render, while in the middle of the first render! That doesn't sound good. Not to mention, responding to incoming props by updating your state is a common need. It makes sense to expect your state update and the new props to all flow into the same render, otherwise you'd get an intermediate render with only the state change, then the final render with both state and props change, which would probably be unexpected.

<div class="callout wisdom">
<div>Here is a fiddle that demonstrates this</div>

<a class="fiddle" href="https://jsfiddle.net/city41/62edejvz/2/" target="_blank">fiddle</a>

<div>Depending on your browser, you might not be able to see the second render. But if you open the debugger and place a `debugger;` statement in `FeactDOMComponent#_updateTextContent`, you should be able to see how Feact naively does three renders when it should have been just two.</div>
</div>

### batching step one, a place to store the batched state changes

We need a place to store more than one state update, so we will change `_pendingPartialState` into an array

```
function FeactComponent() {
}

FeactComponent.prototype.setState = function(partialState) {
    const internalInstance = FeactInstanceMap.get(this);

    internalInstance._pendingPartialState =
        internalInstance._pendingPartialState || [];

    internalInstance._pendingPartialState.push(partialState);
    ...
}
```

Over in `updateComponent`, let's pull the state processing out into its own method

```javascript
class FeactCompositeComponentWrapper {
    ...
    updateComponent(prevElement, nextElement) {
        ...
        const nextState = this._processPendingState();
        ...
    }

    _processPendingState() {
        const inst = this._instance;
        if (!this._pendingPartialState) {
            return inst.state;
        }
        
        let nextState = inst.state;
        
        for (let i = 0; i < this._pendingPartialState.length; ++i) {
            nextState =
                Object.assign(nextState, this._pendingPartialState[i]);
        }
        
        this._pendingPartialState = null;
        return nextState;
    }
}
```

### batching step two, batching up the state changes into one render

<div class="callout pitfall">
The batching mechanism we're about to add to Feact is very simple and not at all what React does. The point is to just show the general idea of how batching works (and later, show why it can make `setState` tricky).
</div>

For Feact, we will batch updates while rendering, otherwise, we won't batch them. So during `updateComponent`, we just set a flag that tells the world we are rendering, then unset it at the end. If `setState` sees we are rendering, it will set the pending state, but not cause a new render, as it knows the current render that is going on will pick up this state change

```javascript
class FeactCompositeComponentWrapper {
    ...
    updateComponent(prevElement, nextElement) {
        this._rendering = true;

        // entire rest of the method

        this._rendering = false;
    }
}

function FeactComponent() {
}

FeactComponent.prototype.setState = function(partialState) {
    const internalInstance = FeactInstanceMap.get(this);

    internalInstance._pendingPartialState =
        internalInstance._pendingPartialState || [];

    internalInstance.push(partialState);

    if (!internalInstance._rendering) {
        FeactReconciler.performUpdateIfNecessary(internalInstance);
    }
}
```

## wrapping it up

Here is a fiddle that contains the final version of Feact

<a class="fiddle" href="https://jsfiddle.net/city41/fbw81p5e/5/" target="_blank">fiddle</a>

It contains the simple batching, so it will only render twice (whereas the previous fiddle above rendered three times).

### setState pitfalls

Now that we understand how setState works and the overall concept on how batching works, we can see there are some pitfalls in `setState`. The problem is it takes several steps to update a component's state, as each pending partial state needs to get applied one by one. That means using `this.state` when setting state is dangerous

```
componentWillReceiveProps(nextProps) {
    this.setState({ counter: this.state.counter + 1 });
    this.setState({ counter: this.state.counter + 1 });
}
```

This contrived example shows what I mean. You might expect counter to get 2 added to it, but since states are being batched up, the second call to `setState` has the same values for `this.state` as the first call, so counter will only get incremented once.

React solves this problem by allowing a callback to be passed into `setState`

```
componentWillReceiveProps(nextProps) {
    this.setState((currentState) => ({
        counter: currentState.counter + 1
    });
    this.setState((currentState) => ({
        counter: currentState.counter + 1
    });
}
```

By using the callback flavor of `setState`, you get access to the intermediate values state works through. If Feact were to implement this, it'd look like

```
_processPendingState() {
    const inst = this._instance;
    if (!this._pendingPartialState) {
        return inst.state;
    }

    let nextState = inst.state;

    for (let i = 0; i < this._pendingPartialState.length; ++i) {
        const partialState = this._pendingPartialState[i];

        if (typeof partialState === 'function') {
            nextState = partialState(nextState);
        } else {
            nextState = Object.assign(nextState, patialState);
        }
    }

    this._pendingPartialState = null;
    return nextState;
}
```

You can see how the callback gets access to the intermediate values of `nextState` as we work our way through all the pending changes.

## Up Next

If you've read this far then holy cow, thanks! Feel free to <a href="mailto:matt.e.greer@gmail.com">email me</a> if you have any feedback.

Part five is just around the corner. It will go over React's transactions and wrap the whole shebang up. Stay tuned.

Here is the final fiddle for Feact one more time:

<a class="fiddle" href="https://jsfiddle.net/city41/fbw81p5e/5/" target="_blank">fiddle</a>
