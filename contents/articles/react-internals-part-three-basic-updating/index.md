---
title: "React Internals, Part Three: basic updating"
author: Matt
date: 2017-07-16
template: article.jade
inProgress: "true"
---

In [part one](/articles/react-internals-part-one-basic-rendering), our small React clone, Feact, was implemented far enough to do basic rendering. But once the render happens, that was it. In this part, we'll add the ability to make changes to the app with subsequent renders. This part will begin to show how the virtual DOM diffing works.

<span class="more"></span>

## The series
<ul>
    <li>[part one: basic rendering](/articles/react-internals-part-one-basic-rendering)</li>
    <li>[part two: componentWillMount and componentDidMount](/articles/react-internals-part-two-componentWillMount-and-componentDidMount)</li>
    <li>**part three: basic updating** <- you are here</li>
    <li>part four: setState *coming soon!*</li>
    <li>part five: transactions *coming soon!*</li>
</ul>

## Simple updating

Calling `setState()` in a component is the primary way people cause their React apps to update. But React also supports updating through `React.render()`. Take this contrived example

```javascript
React.render(<h1>hello</h1>, root);

setTimeout(function() {
    React.render(<h1>hello again</h1>, root);
}, 2000);
```

We'll ignore `setState()` for now and instead implement updates through `Feact.render()`.

## Doing the update

The concept is pretty simple, `Feact.render()` just needs to check if it's rendered before, and if so, update the page instead of starting fresh.

```javascript
const Feact = {
    ...
    render(element, container) {
        const prevComponent =
            getTopLevelComponentInContainer(container);

        if (prevComponent) {
            return updateRootComponent(
                prevComponent,
                element, 
                container
            );
        } else {
            return renderNewRootComponent(element, container);
        }
    }
    ...
}

function renderNewRootComponent(element, container) {
    const componentInstance = instantiateFeactComponent(element);
    componentInstance.mountComponent(container);

    return componentInstance;
}

function getTopLevelComponentInContainer(container) {
    // need to figure this out
}

function updateRootComponent(prevComponent, nextElement) {
    // need to figure this out too
}
```

This is looking pretty promising. If we rendered before, then take the state of the previous render, grab the new desired state, and pass that off to a function that will figure out what DOM updates need to happen to update the app. Otherwise if there's no signs of a previous render, then render into the DOM exactly how we did in part one.

We just need to figure out the two missing pieces.

## Remembering what we did

For each render, We need to store the components we created, so we can refer to them in a subsequent render. Where to store them? Why not on the DOM nodes they create?

```javascript
function renderNewRootComponent(element, container) {
    const componentInstance = instantiateFeactComponent(element);
    componentInstance.mountComponent(container);

    container.__feactComponentInstance = componentInstance;

    return componentInstance;
}
```

Well, that was easy. Similarly retrieving the stashed component is easy too:

```javascript
function getTopLevelComponentInContainer(container) {
    return container.__feactComponentInstance;
}
```

## Updating to the new state

Remember, this is the simple example we are working through

```javascript
React.render(<h1>hello</h1>, root);

setTimeout(function() {
    React.render(<h1>hello again</h1>, root);
}, 2000);
```

2 seconds has elapsed, so we are now calling `render()` again, but this time with an element that looks like

```javascript
{
    type: 'h1',
    props: {
        children: 'hello again'
    }
}
```

Since Feact determined this is an update, we ended up in `updateRootComponent`, which is just going to delegate to the component

```javascript
function updateRootComponent(prevComponent, nextElement) {
    prevComponent.receiveComponent(nextElement)
}
```

There is an important thing happening here, a new component is not getting created. `prevComponent` is the component that got created during the first render, and now it's going to take a new element and update itself with it.

```javascript
FeactDOMComponent = {
    ...
    receiveComponent(nextElement) {
        var prevElement = this._currentElement;
        this.updateComponent(prevElement, nextElement);
    },

    updateComponent(prevElement, nextElement) {
        const lastProps = prevElement.props;
        const nextProps = nextElement.props;

        this._updateDOMProperties(lastProps, nextProps);
        this._updateDOMChildren(lastProps, nextProps);
    },

    _updateDOMProperties(lastProps, nextProps) {
        // nothing to do! I'll explain why below
    },

    _updateDOMChildren(lastProps, nextProps) {
        // finally, the component can update the DOM here
    }
};
```

`receiveComponent` just sets up updateComponent, which ultimately calls `_updateDOMProperties` and `_updateDOMChildren` which are the meaty functions which will finally cause the actual DOM to get updated. `_updateDOMProperties` is mostly concerned with updating CSS styles. We're not going to implement it in this blog post series, but just pointing it out as that is the method React uses to deal with style changes.

`_updateDOMChildren` in React can handle complex trees of children, but in `Feact` the children is just the contents of the DOM element, in this case the children will go from `"hello"` to `"hello again"`

```javascript
FeactDOMComponent = {
    ...
    _updateDOMChildren(lastProps, nextProps) {
        const lastContent = lastProps.children;
        const nextContent = nextProps.children;

        if (!nextContent) {
            this.updateTextContent('');
        } else if (lastContent !== nextContent) {
            this.updateTextContent('' + nextContent);
        }
    },

    updateTextContent(content) {
        const node = this._hostNode;
        node.textContent = content;

        const firstChild = node.firstChild;
  
        if (firstChild && firstChild === node.lastChild
                && firstChild.nodeType === 3) {
            firstChild.nodeValue = text;
            return;
        }

        node.textContent = text;
    }
};
```

`Feact`'s version of `_updateDOMChildren` is hopelessly stupid, it can only handle text content. Obviously there's many more ways to update a DOM node, but this is all we need for our learning purposes. 

## Updating composite components

The work we did above was fine and all, but we can only update `FeactDOMComponent`s. In other words, this won't work

```javascript
Feact.render(
    Feact.createElement(MyCoolComponent, { myProp: 'hello' }),
    document.getElementById('root')
);

setTimeout(function() {
    Feact.render(
        Feact.createElement(MyCoolComponent,. { myProp: 'hello again' }),
        document.getElementById('root')
    );
}, 2000);
```

Updating composite components is much more interesting and where a lot of the power in React lies. The good news is, a composite component will ultimately boil down to a `FeactDOMComponent`, so all the work we did above won't go to waste.
