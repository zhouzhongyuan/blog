---
title: "React Internals in Wicked Detail"
author: Matt
date: 2017-03-19
template: article.jade
---
I'm a long time React user, but recently I've found I need to understand how the internals of React work. This blog post is me doing just that. If you stick all the way around to the end, you'll come away with a great understanding of what's going on under the hood of React as well.

<span class="more"></span>

## disclaimer

This article is based on React 15.3, in particular using ReactDOM and the stack reconciler. The fancy new fiber reconciler is out of scope here. If you've come to this article well beyond React 15, you should at least still take away the general concepts even if details have changed.

## Elements and Components

At the heart of React are three different types of entities: native DOM elements, virtual elements and components.

### native DOM elements

These are exactly what they sound like, the actual DOM elements that the browser uses as the building blocks of a webpage. At some point, React will call `document.createElement()` to get one, and use the browser's DOM api to update them such as `element.insertBefore()`, `element.nodeValue` and much more. This is obvious of course, but keeping this simple fact in midn as you start digging in to React's abstractions can hell keep your eye on the prize.

### virtual React elements

A virtual React element (typically just called an "element"), is an in memory representation of what you'd like a given DOM node to be for a particular render. This explanation is overly simple as React elements can also represent a complex component, and they can also represent more primtive DOM nodes such as text nodes. 

### Components
  
Components provide the bridge between React elements and DOM elements. In most situations a component is working with both a React element and a DOM element, and during the course of a render it will ensure the DOM element gets updated to represent the current state of the React element.

### User Defined Composite Components

You are already familiar with one type of component: the composite component. Whenever you call `React.createClass()`, or have an es6 class extend `React.Component`, you are creating a Composite Component class. It turns out our view of the component lifecycle with methods like `componentWillMount`, `shouldComponentUpdate`, etc is just one piece of the puzzle. These are the lifecycle methods that we hook into, because they benefit us. But React components have other lifecycle methods such as `mountComponent` and `receiveComponent`. We never implement, call, or even know these other lifecycle methods exist. They are only used internally by React.

<div class="callout wisdom">
The truth is the components we creaate are incomplete. React will take our component class, and wrap it in a `ReactCompositeComponentWrapper`, which then gives the components we wrote the full lifecycle hooks and ability to participate in React.
</div>

## An important note, we never instantiate anything. Sort of.

When it comes to components, our job is to define component **classes**. But we never instantiate them. Instead React will instantiate an instance of our classes when it makes sense.

We also don't instantiate elements, except that's not entirely true. When we write JSX such as:

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

so in a sense, we are causing an element to be created because our code will call `React.createElement()`. But in another sense we aren't, because it's up to React to instantiate our component when it's ready to, and then it will call `render()` on the instance it created. Generally speaking, it's best to think of React has being fully declarative. We describe what we want, and let React figure out how to make it happen. Even if some details might disagree with that idea a little.



## A tiny, fake React called Feact

Now with a little bit of background, let's go ahead and implement our own little React clone. It's be a tiny, fake React, so let's be unimaginitive and call it Feact.

Let's pretend we want to create this tiny Feact app:

```javascript
Feact.render(<h1>hello world</h1>, document.getElementById('root'));
```

For starters, let's get rid of the JSX. After running our code through our JSX compiler, we'd have:

```javascript
Feact.render(
    Feact.createElement('h1', null, 'hello world'),
    document.getElementById('root')
);
```

Let's go one step further and expand the call to `createElement`. I've been pretty vague about elements so far. But in general, think of them as simple objects that represent what you want rendered. So let's pretend in Feact, `createElement` expands to:

```javascript
Feact.render({
        type: "h1",
        props: {
            children: "hello world"
        },
    },
    document.getElementById('root')
);
```

Ok, so elements are just simple objects reprensting what we want rendered, in this case, it's representing a DOM element.

### What should render() do?

Our call to `render()` passes in what we want rendered and where it should go. For our first attempt, let's define `render()` to look something like this:


```javascript
const Feact = {
    render(element, container) {
        const componentInstance = new FeactDOMComponent(element);
        componentInstance.mountComponent(container);

        return componentInstance;
    }
};
```

I went ahead and pretended a component type called FeactDOMComponent exists. Let's bridge that gap now and define FeactDOMComponent:

```javascript
class FeactDOMComponent {
    constructor(element) {
        this._element = element;
    }

    mountComponent(container) {
        const domElement = document.createElement(this._element.type);
        const textNode = document.createTextNode(this._element.props.children);
        domElement.appendChild(textNode);

        container.appendChild(domElement);
    }
}
```

<a class="fiddle" target="_blank" href="https://jsfiddle.net/city41/ohmzvb4o/4">fiddle</a>

In about 20 lines of really crappy code we've got an incredibly limited and pathetic little "React clone!" Feact isn't going to take over the world, but if we keep going we should be able to build it up pretty close to actual React.

## Feact step two: user defined components

We want to be able to render more than just a single, hardcoded, DOM element. So let's add support for defining component classes, this will increase the flexibility of Feact nicely:

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
        // need to figure this out
    }
};

const MyH1 = Feact.createClass({
    render() {
        return (
            <h1>{this.props.message}</h1>
        );
    }
};

// with JSX, this would be:
// Feact.render(<MyH1 message="hey there Feact" />, document.getElementById('root'));

Feact.render({
        type: MyComponent,
        props: {
            message: 'hey there Feact'
        }
    },
    document.getElementById('root')
);
```

This threw several wrenches into Feact as it currently stands:

* what does render() do now?
* what happens to FeactDOMComponent?
* Why is the element's type the class?

### improving render()

Ok, so render can't just create a FeactDOMComponent anymore, we need a new level of abstraction:

```javascript
render(element, container) {
    const componentInstance = new FeactCompositeComponentWrapper(element);
    componentInstance.mountComponent(container);

    return componentInstance
};

class FeactCompositeComponentWrapper {
    constructor(element) {
        this._element = element;
    }

    mountComponent(container) {
        const compositeComponentInstance = new this._element.type(this._element.props);
        const renderedElement = compositeComponentInstance.render();

        const domComponentInstance = new FeactDOMComponent(renderedElement);
        domComponentInstance.mountComponent(container);
    }
}
```

By giving users the ability to define their own components, Feact can now create dynamic DOM nodes that can change depending on the value of the props. There's a lot going on in this upgrade to Feact, but if you trace through it, it's not too bad. You can see where we call `render()`, to get our hands on an element that we can then pass into FeactDOMComponent. With this upgrade we now mostly understand React elements:

<div class="callout wisdom">A React element, for the most part, either represents a native DOM node, or a composite component that will give us native DOM nodes after we call `render()`. If the composite component's render() gave us more composite components, we would just keep calling render() until we "hit the bottom" with native DOM elements.
</div>

### Adding even more flexibility with user defined components
Currently our composite components must return elements that represent primitive DOM nodes, we can't return other composite component elements. Let's fix that. We want to be able to do this:

```javascript
const MyMessage = Feact.createClass({
    render() {
        if (this.props.asTitle) {
            return <MyH1 message={this.props.message} />;
        } else {
            return <p>{this.props.message}</p>;
        }
    }
}
```

This composite component's render() is either going to return an element backed by another composite component, or an element that is just a simple DOM node. Currently Feact can't handle this, if `asTitle` was true, FeactCompositeComponentWrapper would give FeactDOMComponent an element that is not representing a simple DOM node, and FeactDOMComponent would blow up. Let's fix FeactCompositeComponentWrapper:

```javascript
class FeactCompositeComponentWrapper {
    constructor(element) {
        this._element = element;
    }

    mountComponent(container) {
        const compositeComponentInstance = new this._element.type(this._element.props);
        let renderedElement = compositeComponentInstance.render();

        while (typeof renderedElement.type === 'function') {
            renderedElement = (new renderedElement.type(renderedElement.props)).render();
        }

        const domComponentInstance = new FeactDOMComponent(renderedElement);
        domComponentInstance.mountComponent(container);
    }
}
```


<a class="fiddle" target="_blank" href="https://jsfiddle.net/city41/7x2zgevj/1">fiddle</a>

