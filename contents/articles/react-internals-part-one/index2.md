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

```
class MyComponent extends React.Component {
    render() {
        return <div>hello</div>;
    }
}
```

That bit of JSX gets translated into this by the compiler:

```
class MyComponent extends React.Component {
    render() {
        return React.createElement('div', null, 'hello');
    }
}
```

so in a sense, we are causing an element to be created because our code will call `React.createElement()`. But in another sense we aren't, because it's up to React to instantiate our component when it's ready to, and then it will call `render()` on the instance it created. Generally speaking, it's best to think of React has being fully declarative. We describe what we want, and let React figure out how to make it happen. Even if some details might disagree with that idea a little.



## A tiny, fake React

Now that we have a vague, but incomplete, idea of elements and components, let's go ahead and walk through how React will render something. Except, for this first pass, I'm going to keep it really simple. What we have here is not real React at all, it's the overall concept distilled down to its most basic elements. As we dig more, we'll build on this and work our way to the entirey of React.

So let's pretend we want to create this tiny React app:

```
ReactDOM.render(<h1>hello world</h1>, document.getElementById('root'));
```

For starters, let's get rid of the JSX. After running our code through Babel, we'd have:

```
ReactDOM.render(
    React.createElement('h1', null, 'hello world'),
    document.getElementById('root')
);
```


