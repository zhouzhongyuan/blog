---
title: "React Internals, Part Two: componentWillMount and componentDidMount"
author: Matt
date: 2017-07-15
template: article.jade
---

In [part one](/articles/react-internals-part-one-basic-rendering) we established basic rendering in Feact. That touched upon the most important lifecycle method, `render`, and now we're going to add in `componentWillMount` and `componentDidMount` support to Feact.

<span class="more"></span>

## The series
<ul>
    <li>[part one: basic rendering](/articles/react-internals-part-one-basic-rendering)</li>
    <li>**part two: componentWillMount and componentDidMount** <- you are here</li>
    <li>[part three: basic updating](/articles/react-internals-part-three-basic-updating)</li>
    <li>[part four: setState](/articles/react-internals-part-four-setState)</li>
    <li>part five: transactions *coming soon!*</li>
</ul>


## First, fix createClass

`createClass` back in part one only supported `render`

```javascript
const Feact = {
    createClass(spec) {
        function Constructor(props) {
            this.props = props;
        }

        // we pluck render off and ignore the rest of spec
        Constructor.prototype.render = spec.render;

        return Constructor;
    }
    ...
}
```

This is a simple fix, let's add the entire spec to the component's prototype. That allows methods like `componentWillMount`, but it also allows any arbitrary methods the user defined to be used.

```javascript
const Feact = {
    createClass(spec) {
        function Constructor(props) {
            this.props = props;
        }

        Constructor.prototype =
            Object.assign(Constructor.prototype, spec);

        return Constructor;
    }
    ...
}
```

## Addressing mountComponent's shortcut

Back in part one, I noted that `FeactCompositeComponentWrapper#mountComponent` had taken a shortcut. This shortcut will prevent lifecycle methods such as `componentWillMount` from getting called.

Here's `mountComponent` as it stood in part one

```javascript
class FeactCompositeComponentWrapper {
    constructor(element) {
        this._currentElement = element;
    }

    mountComponent(container) {
        const Component = this._currentElement.type;
        const componentInstance =
            new Component(this._currentElement.props);

        let element = componentInstance.render();

        while (typeof element.type === 'function') {
            element = (new element.type(element.props)).render();
        }

        const domComponentInstance = new FeactDOMComponent(element);
        return domComponentInstance.mountComponent(container);
    }
}
```

`mountComponent` is working its way down to a native element. As long as `render()` returns a composite component element, it calls `render` again until it finally gets a native element. The problem is these sub composite components are not privy to the entire lifecycle. In other words, their `render` method is being called, but that's it. What we really need to do is properly mount all components.

To fix this, let's have something else do the mounting for us

```javascript
class FeactCompositeComponentWrapper {
    ...
    mountComponent(container) {
        const Component = this._currentElement.type;
        const componentInstance =
            new Component(this._currentElement.props);
        this._instance = componentInstance;

        const markup = this.performInitialMount(container);

        return markup;
    }

    performInitialMount(container) {
        const renderedElement = this._instance.render();

        const child = instantiateFeactComponent(renderedElement);
        this._renderedComponent = child;

        return FeactReconciler.mountComponent(child, container);
    }
}

const FeactReconciler = {
    mountComponent(internalInstance, container) {
        return internalInstance.mountComponent(container);
    }
};

function instantiateFeactComponent(element) {
    if (typeof element.type === 'string') {
        return new FeactDOMComponent(element);
    } else if (typeof element.type === 'function') {
        return new FeactCompositeComponentWrapper(element);
    }
}
```

This is a fair amount of new code, but the basic idea is to move mounting out into another layer. That's the job of `FeactReconciler`, which will also gain more jobs as we move forward. Over in React, there is `ReactReconciler` which is serving the same role.

<div class="callout wisdom">
Remember the tight coupling that was called out in part one? It's gone now, `FeactCompositeComponentWrapper` is usable in more places now, which is a good thing.
</div>

## Tweaking `Feact.render()`

`Feact.render()` is calling `componentInstance.mountComponent(container)` in part one. Let's change that and instead have `FeactReconciler` deal with all mounting

```javascript
const Feact = {
    ...
    render(element, container) {
        const wrapperElement =
            this.createElement(TopLevelWrapper, element);

        const componentInstance =
            new FeactCompositeComponentWrapper(wrapperElement);

        return FeactReconciler.mountComponent(
            componentInstance,
            container
        );
    }
}
```

And with that, all composite component elements will get properly mounted. This sets them up properly for participating in the entire Feact lifecycle.

## Finally adding componentWillMount and componentDidMount

Now with all the setup out of the way, actually adding support for these two is simple. Just before mounting, call `componentWillMount` if it exists. Likewise, just after mounting, call `componentDidMount` if it exists

```javascript
class FeactCompositeComponentWrapper {
    ...
    mountComponent(container) {
        const Component = this._currentElement.type;
        const componentInstance =
            new Component(this._currentElement.props);
        this._instance = componentInstance;

        if (componentInstance.componentWillMount) {
            componentInstance.componentWillMount();
        }

        const markUp = this.performInitialMount(container);

        if (componentInstance.componentDidMount) {
            componentInstance.componentDidMount();
        }

        return markUp;
    },
    ...
}
```

## Concluding part two

That wraps up part two. Here is a fiddle encompassing all we've done

<a class="fiddle" target="_blank" href="https://jsfiddle.net/city41/L5u2z592/3/">fiddle</a>

In [part three](/articles/react-internals-part-three-basic-updating), we'll add support for updates.

