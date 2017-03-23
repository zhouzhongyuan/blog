---
title: "React Internals: Part One (of Three)"
author: Matt
date: 2017-03-19
template: article.jade
---
I have suddenly found myself needing to understand how React works, internally. So this three part blog series is me doing just that. Part one is exploring how React renders the simplest DOM content possible, then the series builds from there.

<span class="more"></span>

## Hello React

In this part, we are going to learn what React does with this code:

```javascript
ReactDOM.render(<h1>Hello World</h1>, document.getElementById('root'));
```

The above is almost exactly equivalent to this:

```javascript
const h1 = document.createElement('h1');
const text = document.createTextNode('hello world');
h1.appendChild(text);
const root = document.getElementById('root');
root.insertBefore(h1, null);
```

So as we dig into React's code, our goal is to trace the path from the `<h1>Hello World</h1>` JSX all the way down to `document.createElement`.


## Some Background: An Element Versus a Component

When using React, we never really instantiate anything. Instead we describe what we want to happen, and React handles the details for us. Inside React, an element is an object that represents our intent. Whenever we write JSX into our code, it gets translated into `React.createElement(type, props, children)` calls.

So the JSX `<h1>Hello World</h1>` gets translated into `React.createElement('h1', null, 'hello world')`, and the result of `createElement` is a simple object representing our h1 DOM node:

```javascript
{
  $$typeof: Symbol(react.element),
  type: "h1",
  key: null,
  ref: null,
  props: {
    children: "hello world"
  },
  _owner: null,
  _store: {}
}
```

`$$typeof` is just a simple way for React to know some random JavaScript object is actually an Element. Don't worry about the other extra properties like `_owner`, `_store` and `ref`. They aren't yet important to us.

<div class="callout wisdom">
Since `createElement`'s output is so predictable, it's possible to have Babel eliminate the call and just replace it with the resulting object at compile time. This can give your app a slight performance boost.

<<< GET THE DETAILS ON THIS >>>
</div>

### Component Classes

A component class is a class who's ultimate goal is to produce a tree of elements. Whenever we call `React.createClass()` or create an ES6 class that extends `React.Component`, we are creating a component class.

Our earlier example with h1 produced an element whose type is a string. If we instead created a class called `MyComponent` then used it with `<MyComponent myProp={123} />`, then the resulting element would be:

```javascript
{
  $$typeof: Symbol(react.element),
  type: function(props, context, updater) { ... },
  key: null,
  ref: null,
  props: {
    myProp: 123
  },
  _owner: null,
  _store: {}
}
```

<div class="callout wisdom">
If an element's type is a string, that means it's representing a primitive DOM node. If its type is a function, that means it's representing a React Component class. React Component classes define a `render()` method, which returns an element. If the element returned has a component as its type, then that component's render() gets called, all the way down until all we are left with is a tree of elements that all represent primitive DOM nodes.
</div>

### Composite Components

Composite components are the most common type of Component inside of React. Whenever we call `React.createClass()`, the resulting class is for a composite component.

<<< understand composite components better >>>

### ReactEmptyComponent
Represents an empty or nonexistant element. For example

```javascript
class MySwitchComponent extends React.Component {
    render() {
        if (this.props.flag) {
            return <div>foo</div>;
        } else {
            return null;
        }
    }
}
```

Whenever `MySwitchComponent` returns null, React will represent it with a ReactEmptyComponent.

### ReactHostComponent / Internal Component
This is basically the "primitive component" for the current React environment. In ReactDOM, it is a ReactDOMComponent. Whenever an element's type is a string, that platform's ReactHostComponent will get created. The platform tells React what the class is `ReactHostComponentInjection#injectGenericComponentClass()`.

### isInternalComponentType(type)
checks to see if the given type is a Component type internal to React, as opposed to a composite component provided to React. Internal components have receiveComponent and updateComponent methods, where composite components do not.

### ReactCompositeComponentWrapper
This is an internal Component type that wraps a user provided composite component.

### ReactDOMComponent
This Component type wraps a primitive/native element. Its `mountComponent` method will call `document.createElement`

Its `receiveComponent` will update based on the element diff

### Internal Component types
generally speaking they have a `_currentElement` property that they hold onto. As the app progresses, the next element will be diffed against currentElement. This is pretty much the heart of React.

## Let's Ditch the JSX

With a better understanding of JSX, Components and Elements, we can simplifiy our example. Let's manually translate the JSX into a call to `React.createElement`, giving us:

```javascript
ReactDOM.render(
    React.createElement('h1', null, 'hello world'),
    document.getElementById('root')
);
```

And once `React.createElement()` returns, we will have:

```javascript
ReactDOM.render(
    {
        $$typeof: Symbol(react.element),
        type: "h1",
        key: null,
        ref: null,
        props: {
        children: "hello world"
        },
        _owner: null,
        _store: {}
    },
    document.getElementById('root')
);
```

## Wrapping the Element

`ReactDOM.render()` is going to do many things, but at a very high level, it's going to take our element, wrap it a couple times, then peel off the wrappers one by one. As it peels off the layers, it works its way towards ultimately calling `document.createElement()` and sticking the new DOM element into the DOM.

First React will wrap our element into a new element, this element's type will be of `TopLevelWrapper`. TopLevelWrapper is an internal composite component class. By wrapping our element in the TopLevelWrapper element, then React doesn't have to consider what type of element its working with, it knows the element will be of a composite component, which has a `render()` method.


