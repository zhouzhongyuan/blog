---
title: "React Internals, Part One: basic rendering"
author: Matt
date: 2017-07-14
template: article.jade
---
In this five part series, we will "recreate" React from the ground up, learning how it works along the way. Once we've finished, you should have a good grasp of how React works, and when and why it calls the various lifecycle methods of a component.


<span class="more"></span>


## The series
<ul>
    <li>**part one: basic rendering** <- you are here</li>
    <li>[part two: componentWillMount and componentDidMount](/articles/react-internals-part-two-componentWillMount-and-componentDidMount/)</li>
    <li>[part three: basic updating](/articles/react-internals-part-three-basic-updating)</li>
    <li>part four: setState *coming soon!*</li>
    <li>part five: transactions *coming soon!*</li>
</ul>

## disclaimer

This series is based on React 15.3, in particular using ReactDOM and the stack reconciler. The fancy new fiber reconciler is out of scope here. The React clone we are going to build will not even come close to implementing all of React. But Feact's source code will mirror React's as much as possible.
  
## Some Background: Elements and Components

At the heart of React are three different types of entities: native DOM elements, virtual elements and components.

### native DOM elements

These are exactly what they sound like, the actual DOM elements that the browser uses as the building blocks of a webpage. At some point, React will call `document.createElement()` to get one, and use the browser's DOM api to update them such as `element.insertBefore()`, `element.nodeValue`, etc.

### virtual React elements

A virtual React element (just called an "element" in the source code), is an in memory representation of what you'd like a given DOM element (or entire tree of elements) to be for a particular render. An element can either directly represent a DOM element such as `h1`, `div`, etc. Or it can represent a user defined composite component, which is explained below.

### Components
  
"Component" is a pretty generic term in React. They are entities within React that do various types of work. Different types of components do different things. For example, `ReactDOMComponent` from ReactDOM is responsible for bridging between React elements and their corresponding native DOM elements.

### User Defined Composite Components

You are already familiar with one type of component: the composite component. Whenever you call `React.createClass()`, or have an es6 class extend `React.Component`, you are creating a Composite Component class. It turns out our view of the component lifecycle with methods like `componentWillMount`, `shouldComponentUpdate` is just one piece of the puzzle. These are the lifecycle methods that we hook into because they benefit us. But React components have other lifecycle methods such as `mountComponent` and `receiveComponent`. We never implement, call, or even know these other lifecycle methods exist. They are only used internally by React.

<div class="callout wisdom">
The truth is the components we create are incomplete. React will take our component class, and wrap it in a `ReactCompositeComponentWrapper`, which then gives the components we wrote the full lifecycle hooks and ability to participate in React.
</div>

## React is declarative

When it comes to components, our job is to define component **classes**. But we never instantiate them. Instead React will instantiate an instance of our classes when it needs to.

We also don't consciously instantiate elements. But we do implicitly when we write JSX, such as:

```javascript
class MyComponent extends React.Component {
    render() {
        return <div>hello</div>;
    }
}
```

That bit of JSX gets translated into this by the compiler:

```javascript
class MyComponent extends React.Component {
    render() {
        return React.createElement('div', null, 'hello');
    }
}
```

so in a sense, we are causing an element to be created because our code will call `React.createElement()`. But in another sense we aren't, because it's up to React to instantiate our component and then call `render()` for us. It's simplest to consider React declarive. We describe what we want, and React figures out how to make it happen.



## A tiny, fake React called Feact

Now with a little bit of background under our belt, let's get started building our React clone. Since this clone is tiny and fake, we'll give it the imaginative name "Feact".

Let's pretend we want to create this tiny Feact app:

```javascript
Feact.render(<h1>hello world</h1>, document.getElementById('root'));
```

For starters, let's ditch the JSX. Assuming Feact was fully implemented, after running the JSX through the compiler we'd end up with

```javascript
Feact.render(
    Feact.createElement('h1', null, 'hello world'),
    document.getElementById('root')
);
```

JSX is a large topic on its own and a bit of a distraction. So from here on out, we will use `Feact.createElement` instead of JSX, so let's go ahead and implement it

```javascript
const Feact = {
    createElement(type, props, children) {
        const element = {
            type,
            props: props || {}
        };

        if (children) {
            element.props.children = children;
        }

        return element;
    }
};
```

Elements are just simple objects representing something we want rendered.

### What should Feact.render() do?

Our call to `Feact.render()` passes in what we want rendered and where it should go. This is the starting point of any Feact app. For our first attempt, let's define `render()` to look something like this


```javascript
const Feact = {
    createElement() { /* as before */ },

    render(element, container) {
        const componentInstance = new FeactDOMComponent(element);
        return componentInstance.mountComponent(container);
    }
};
```
When `render()` finishes, we have a finished webpage. So based on that, we know FeactDOMComponent is truly digging in and creating DOM for us. Let's go ahead and take a stab at implementing it:

```javascript
class FeactDOMComponent {
    constructor(element) {
        this._currentElement = element;
    }

    mountComponent(container) {
        const domElement =
            document.createElement(this._currentElement.type);
        const text = this._currentElement.props.children;
        const textNode = document.createTextNode(text);
        domElement.appendChild(textNode);

        container.appendChild(domElement);

        this._hostNode = domElement;
        return domElement;
    }
}
```

<div class="callout wisdom">
`mountComponent` stores the DOM element it creates in `this._hostNode`. We don't need that in part one, but we will in part three.
</div>

<a class="fiddle" target="_blank" href="https://jsfiddle.net/city41/ohmzvb4o/9">fiddle</a>

In about 40 lines of pretty crappy code we've got an incredibly limited and pathetic little "React clone"! Feact isn't going to take over the world, but it's serving as a nice learning sandbox.

## Adding user defined components

We want to be able to render more than just a single, hardcoded, DOM element. So let's add support for defining component classes:

<div class="callout wisdom">
    `Feact.createElement()` is good to go, so I won't keep repeating it in code snippets.
</div>

```javascript
const Feact = {
    createClass(config) {
        function ComponentClass(props) {
            this.props = props;
        }

        ComponentClass.prototype.render = config.render;

        return ComponentClass;
    }, 

    render(element, container) {
        // our previous implementation can't
        // handle user defined components,
        // so we need to rethink this method
    }
};

const MyTitle = Feact.createClass({
    render() {
        return Feact.createElement('h1', null, this.props.message);
    }
};

Feact.render({
    Feact.createElement(MyTitle, { message: 'hey there Feact' }),
    document.getElementById('root')
);
```
Remember, we're not dealing with JSX for this blog post series, because we've got plenty to deal with already. If we had JSX available, the above would look like

```javascript
Feact.render(
    <MyTitle message="hey there Feact" />,
    document.getElementById('root')
);
```

We passed the component class into `createElement`. An element can either represent a primitive DOM element, or it can represent a composite component. The distinction is easy, if `type` is a string, the element is a native primitive. If it is a function, the element represents a composite component.


### Improving Feact.render()

If you trace back through the code so far, you will see that `Feact.render()` as it stands now can't handle composite components, so let's fix that:

```javascript
Feact = {
    render(element, container) {
        const componentInstance =
            new FeactCompositeComponentWrapper(element);

        return componentInstance.mountComponent(container);
    }
}

class FeactCompositeComponentWrapper {
    constructor(element) {
        this._currentElement = element;
    }

    mountComponent(container) {
        const Component = this._currentElement.type;
        const componentInstance = new Component(this._currentElement.props);
        const element = componentInstance.render();

        const domComponentInstance = new FeactDOMComponent(element);
        return domComponentInstance.mountComponent(container);
    }
}
```

By giving users the ability to define their own components, Feact can now create dynamic DOM nodes that can change depending on the value of the props. There's a lot going on in this upgrade to Feact, but if you trace through it, it's not too bad. You can see where we call `componentInstance.render()`, to get our hands on an element that we can then pass into FeactDOMComponent.

<div class="callout pitfall">
Notice how `FeactCompositeComponentWrapper` is directly creating a `FeactDOMComponent`? That's a tight coupling which isn't so great. We'll fix this later. If React was this tightly coupled, it'd only ever be able to build web apps. Keeping `ReactCompositeComponentWrapper` in the dark about other component types surely made building React Native easier.
</div>

### An improvement for composite components
Currently our composite components must return elements that represent primitive DOM nodes, we can't return other composite component elements. Let's fix that. We want to be able to do this

```javascript
const MyMessage = Feact.createClass({
    render() {
        if (this.props.asTitle) {
            return Feact.createElement(MyTitle, {
                message: this.props.message
            });
        } else {
            return Feact.createElement('p', null, this.props.message);
        }
    }
}
```

This composite component's render() is either going to return a primitive element or a composite component element. Currently Feact can't handle this, if `asTitle` was true, `FeactCompositeComponentWrapper` would give `FeactDOMComponent` a non-native element, and `FeactDOMComponent` would blow up. Let's fix `FeactCompositeComponentWrapper`


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
        domComponentInstance.mountComponent(container);
    }
}
```

<div class="callout pitfall">
Heads up, this "fix" is a short cut that's just good enough to meet our current needs. Notice how it repeatedly calls `render` until it gets down to a primitive element? That's not good enough, because those subcomponents need to participate in the entire lifecycle. For example, if we had support for `componentWillMount`, those subcomponents would never get their's called. We'll fix this later.
</div>


## Fixing Feact.render() again

The first version of `Feact.render()` could only handle primitive elements. Now it can only handle composite elements. It needs to be able to handle both. We could write a "factory" function that will create a component for us based on the element's type, but there's another approach that React took. Since `FeactCompositeComponentWrapper` components ultimately result in a `FeactDOMComponent`, let's just take whatever element we were given and wrap it in such a way that we can just use a `FeactCompositeComponentWrapper`

```javascript
const TopLevelWrapper = function(props) {
    this.props = props;
};

TopLevelWrapper.prototype.render = function() {
    return this.props;
};

const Feact = {
    render(element, container) {
        const wrapperElement =
            this.createElement(TopLevelWrapper, element);

        const componentInstance =
            new FeactCompositeComponentWrapper(wrapperElement);

        // as before
    }
};
```

`ToplevelWrapper` is basically a simple composite component. For example, it could have been defined by calling `Feact.createClass()`. Its `render` method just returns the user provided element. Since TopLevelWrapper will get wrapped in a `FeactCompositeComponentWrapper`, we don't care what type the user provided element was, `FeactCompositeComponentWrapper` will do the right thing regardless.


## Conclusion to part one

With that, Feact can render simple components. As far as basic rendering is concerned, we've hit most of the major considerations. In real React, rendering is much more complicated as there are many other things to consider such as events, focus, scroll position of the window, performance, and much more.

Here's a final fiddle that wraps up all we've built so far:

<a class="fiddle" target="_blank" href="https://jsfiddle.net/city41/7x2zgevj/16">fiddle</a>

[on to part two!](/articles/react-internals-part-two-componentWillMount-and-componentDidMount)

