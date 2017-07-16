---
title: "React Internals, Part One: basic rendering"
author: Matt
date: 2017-03-19
template: article.jade
---
I'm a long time React user, but recently I've found I need to understand how the internals of React work. This blog post series is me doing just that. In this four part series, we will recreate React from the ground up, learning how it works along the way. When finished, you will be able to browse React's source code and easily follow along.

<span class="more"></span>

## disclaimer

This series is based on React 15.3, in particular using ReactDOM and the stack reconciler. The fancy new fiber reconciler is out of scope here. The React clone we are going to build, Feact, will not even come close to implementing all of React. But Feact's source code will mirror React's as much as possible.
  
## Some Background: Elements and Components

At the heart of React are three different types of entities: native DOM elements, virtual elements and components.

### native DOM elements

These are exactly what they sound like, the actual DOM elements that the browser uses as the building blocks of a webpage. At some point, React will call `document.createElement()` to get one, and use the browser's DOM api to update them such as `element.insertBefore()`, `element.nodeValue`, etc.

### virtual React elements

A virtual React element (typically just called an "element" in the source code), is an in memory representation of what you'd like a given DOM node to be for a particular render. This explanation is overly simple as React elements can also represent a complex component, and they can also represent more primtive DOM nodes such as text nodes. 

### Components
  
Components provide the bridge between React elements and DOM elements. In most situations a component is working with both a React element and a DOM element, and during the course of a render it will ensure the DOM element gets updated to represent the current state of the React element.

### User Defined Composite Components

You are already familiar with one type of component: the composite component. Whenever you call `React.createClass()`, or have an es6 class extend `React.Component`, you are creating a Composite Component class. It turns out our view of the component lifecycle with methods like `componentWillMount`, `shouldComponentUpdate`, etc is just one piece of the puzzle. These are the lifecycle methods that we hook into, because they benefit us. But React components have other lifecycle methods such as `mountComponent` and `receiveComponent`. We never implement, call, or even know these other lifecycle methods exist. They are only used internally by React.

<div class="callout wisdom">
The truth is the components we create are incomplete. React will take our component class, and wrap it in a `ReactCompositeComponentWrapper`, which then gives the components we wrote the full lifecycle hooks and ability to participate in React.
</div>

## React is declarative

When it comes to components, our job is to define component **classes**. But we never instantiate them. Instead React will instantiate an instance of our classes when it makes sense.

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

For starters, let's get rid of the JSX. If we told JSX about `Feact.createElement`, we'd get this after compiling:

```javascript
Feact.render(
    Feact.createElement('h1', null, 'hello world'),
    document.getElementById('root')
);
```

JSX is a large topic on its own and a bit of a distraction. So from here on out, we will use `Feact.createElement` instead, so let's go ahead and implement it:

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
}
```

This implementation gives us a pretty good idea of what an element is. Elements are just simple objects representing somethign we want rendered.

### What should Feact.render() do?

Our call to `Feact.render()` passes in what we want rendered and where it should go. This is the starting point of any Feact app. For our first attempt, let's define `render()` to look something like this:


```javascript
const Feact = {
    createElement() { /* as before */ },

    render(element, container) {
        const componentInstance = new FeactDOMComponent(element);
        componentInstance.mountComponent(container);

        return componentInstance;
    }
};
```
When `render()` finishes, we have a finished webpage. So based on that, we know FeactDOMComponent is truly digging in and creating DOM for us. Based on that, let's go ahead and take a stab at implementing it:

```javascript
class FeactDOMComponent {
    constructor(element) {
        this._element = element;
    }

    mountComponent(container) {
        const domElement = document.createElement(this._element.type);
        const text = this._element.props.children;
        const textNode = document.createTextNode(text);
        domElement.appendChild(textNode);

        container.appendChild(domElement);
    }
}
```

<a class="fiddle" target="_blank" href="https://jsfiddle.net/city41/ohmzvb4o/5">fiddle</a>

In about 20 lines of really crappy code we've got an incredibly limited and pathetic little "React clone!" Feact isn't going to take over the world, but it's serving as a great learning sandbox.

## Feact step two: user defined components

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

const MyH1 = Feact.createClass({
    render() {
        return Feact.createElement('h1', null, this.props.message);
    }
};

Feact.render({
    Feact.createElement(MyH1, { message: 'hey there Feact' }),
    document.getElementById('root')
);
```
Remember, we're not dealing with JSX for this blog post series, because we've got plenty to deal with already. If we had JSX available, the above would look like

```javascript
Feact.render(
    <MyH1 message="hey there Feact" />,
    document.getElementById('root')
);
```

Woah. we passed the component class into `createElement`. An element can either represent a primitive DOM element, or it can represent a composite component. The distinction is easy, if `type` is a string, the element is a native primitive. If it is a function, the element represents a composite component.


### improving Feact.render()

If you trace back through the code so far, you will see that `Feact.render()` as it stands now can't handle composite components, so let's fix that:

```javascript
Feact = {
    render(element, container) {
        const componentInstance =
            new FeactCompositeComponentWrapper(element);

        componentInstance.mountComponent(container);

        return componentInstance;
    }
}

class FeactCompositeComponentWrapper {
    constructor(element) {
        this._element = element;
    }

    mountComponent(container) {
        const Component = this._element.type;
        const componentInstance = new Component(this._element.props);
        const element = componentInstance.render();

        const domComponentInstance = new FeactDOMComponent(element);
        domComponentInstance.mountComponent(container);
    }
}
```

By giving users the ability to define their own components, Feact can now create dynamic DOM nodes that can change depending on the value of the props. There's a lot going on in this upgrade to Feact, but if you trace through it, it's not too bad. You can see where we call `componentInstance.render()`, to get our hands on an element that we can then pass into FeactDOMComponent.

### An improvement for composite components
Currently our composite components must return elements that represent primitive DOM nodes, we can't return other composite component elements. Let's fix that. We want to be able to do this:

```javascript
const MyMessage = Feact.createClass({
    render() {
        if (this.props.asTitle) {
            return Feact.createElement(MyH1, {
                message: this.props.message
            });
        } else {
            return Feact.createElement('p', null, this.props.message);
        }
    }
}
```

This composite component's render() is either going to return a primitive element or a component element. Currently Feact can't handle this, if `asTitle` was true, FeactCompositeComponentWrapper would give FeactDOMComponent a non-native element, and FeactDOMComponent would blow up. Let's fix FeactCompositeComponentWrapper:

```javascript
class FeactCompositeComponentWrapper {
    constructor(element) {
        this._element = element;
    }

    mountComponent(container) {
        const Component = this._element.type;
        const componentInstance = new Component(this._element.props);
        let element = componentInstance.render();

        while (typeof element.type === 'function') {
            element = (new element.type(element.props)).render();
        }

        const domComponentInstance = new FeactDOMComponent(element);
        domComponentInstance.mountComponent(container);
    }
}
```


## Fixing Feact.render() again

As it stands now, `Feact.render()` can only accept composite component based elements. When we first started, it could accept primitive elements. We need it to be able to handle both. We could write a "factory" function that will create a component for us based on the element's type, but there's another approach that React took. Since `FeactCompositeComponentWrapper` components ultimately decompose down into `FeactDOMComponent`s, let's just take whatever element we were given and wrap it in such a way that we can just use a `FeactCompositeComponentWrapper`

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

`ToplevelWrapper` is basically a user defined composite component. For example, it could have been defined by calling `Feact.createClass()`, but it doesn't need to do very much,
so no need to go that far. Its `render` method just returns the user provided element. Since TopLevelWrapper will get wrapped in a `FeactCompositeComponentWrapper`, we don't care what type the user provided element was, `FeactCompositeComponentWrapper` will do the right thing regardless.

## One last addition: componentWillMount

Let's go ahead and implement one more lifecycle method, componentWillMount. As the name suggests, we should call it just before a composite component mounts

```javascript
class FeactCompositeComponentWrapper {
    constructor(element) {
        this._element = element;
    }

    mountComponent(container) {
        const Component = this._element.type;
        const componentInstance = new Component(this._element.props);

        if (componentInstance.componentWillMount) {
            componentInstance.componentWillMount();
        }

        let element = componentInstance.render();

        while (typeof element.type === 'function') {
            element = (new element.type(element.props)).render();
        }

        const domComponentInstance = new FeactDOMComponent(element);
        domComponentInstance.mountComponent(container);
    }
}
```

`mountComponent()` is only called once, when a component is first being mounted. So `componentWillMount()` is also only called once.

## Conclusion to part one

With that, Feact can render simple components. As far as basic rendering is concerned, we've hit the major considerations. In real React, rendering is much more complicated as there are many other things to consider. But if you were to create this React app: `React.render(<h1>hello</h1>, root)`, and step through it in the debugger, you should be able to follow along. Yes, React will take you on a wild goose chase as it deals with many other things, but overall the path it takes matches what Feact is doing.

Here's a final fiddle that wraps up all we've built so far:

<a class="fiddle" target="_blank" href="https://jsfiddle.net/city41/7x2zgevj/7">fiddle</a>
