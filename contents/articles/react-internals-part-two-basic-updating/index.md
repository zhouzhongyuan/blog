---
title: "React Internals, Part Two: basic updating"
author: Matt
date: 2017-03-20
template: article.jade
---

In [part one](/articles/react-internals-part-one-basic-rendering), our small React clone, Feact, was implemented far enough to do very basic rendering. But once the render happens, that's it! Who wants a static, lifeless web app? In this part, we'll add the ability to make changes to the app with subsequent renders. This part will begin to show how the virtual DOM diffing works.

<span class="more"></span>

## Very basic updating

Calling `setState()` in a component is the primary way people cause their React apps to update. But the truth is, React supports updating through `Reat.render()`. For example, this is supported by React:

```javascript
React.render(<h1>hello</h1>, root);

setTimeout(function() {
    React.render(<h1>hello again</h1>, root);
}, 2000);
```

So that is the type of updating we will add to Feact.

## Doing the update

```javascript
const Feact = {
    ...
    render(nextElement, container) {
        const prevComponent =
            getTopLevelComponentInContainer(container);

        if (prevComponent) {
            return updateRootComponent(
                prevComponent,
                nextElement, 
                container
            );
        } else {
            return renderNewRootComponent(nextElement, container);
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

function updateRootComponent(prevComponent, nextElement, container) {
    // need to figure this out too
}
```

This is looking pretty promising. If we rendered before, then take the state of the previous render, grab the new desired state, and pass that off to a function that will figure out what DOM updates need to happen to update the app. Otherwise if there's no signs of a previous render, then this must be the first one so just render into the DOM.

We just need to figure out the two missing pieces.

## Remembering what we did

We need to store the components we make, so we can refer to them in subsequent renders. Where to store them? Why not on the DOM nodes they create?

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

We've got the old component and new element in hand. We need to use them to figure out the DOM updates to perform.

```javascript
function updateRootComponent(prevComponent, nextElement, container) {
    this basically boils down to
    -- get prevElement from prevComponent
    -- call render() on the nextElement's component class
    -- we now have two "equivalent" elements, and in our case they are primitive elements
    -- run this cycle again against the two elements and FeactDOMComponent (need to figure this out)
        -- ultimately we end up in FeactDOMComponent#receiveComponent(nextElement)
        -- from there call FeactDOMComponent#updateComponent(prevElement, nextElement)
        -- ultimately end up in FeactDOMComponent#_updateDOMProperties which updates the DOM node
        -- also FeactDOMComponent#_updateDOMChildren
            -- this calls updateTextContent(nextContent)
            -- finally call node.nodeValue = nextContent (text)

}
```

