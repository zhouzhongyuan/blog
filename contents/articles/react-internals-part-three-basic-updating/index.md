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

We'll ignore `setState()` for now (that's coming in part four) and instead implement updates through `Feact.render()`.

## Doing the update

The concept is pretty simple, `Feact.render()` just needs to check if it has rendered before, and if so, update the page instead of starting fresh.

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
	const wrapperElement =
		Feact.createElement(TopLevelWrapper, element);

	const componentInstance =
		new FeactCompositeComponentWrapper(wrapperElement);

	return FeactReconciler.mountComponent(
		componentInstance,
		container
	);
}

function getTopLevelComponentInContainer(container) {
    // need to figure this out
}

function updateRootComponent(prevComponent, nextElement) {
    // need to figure this out too
}
```

This is looking pretty promising. If we rendered before, then take the state of the previous render, grab the new desired state, and pass that off to a function that will figure out what DOM updates need to happen to update the app. Otherwise if there's no signs of a previous render, then render into the DOM exactly how we did in part one and two.

We just need to figure out the two missing pieces.

## Remembering what we did

For each render, We need to store the components we created, so we can refer to them in a subsequent render. Where to store them? Why not on the DOM nodes they create?

```javascript
function renderNewRootComponent(element, container) {
	const wrapperElement =
		Feact.createElement(TopLevelWrapper, element);

	const componentInstance =
		new FeactCompositeComponentWrapper(wrapperElement);


	const markUp = FeactReconciler.mountComponent(
		componentInstance,
		container
	);

	// new line here, store the component instance on the container
    // we want its _renderedComponent because componentInstance is just
    // the TopLevelWrapper, which we don't need for updates
    container.__feactComponentInstance =
        componentInstance._renderedComponent;

    return markUp;
}
```

Well, that was easy. Similarly retrieving the stashed component is easy too:

```javascript
function getTopLevelComponentInContainer(container) {
    return container.__feactComponentInstance;
}
```

## Updating to the new state

This is the simple example we are working through

```javascript
Feact.render(
    Feact.createElement('h1', null, 'hello'),
    root
);

setTimeout(function() {
    Feact.render(
        Feact.createElement('h1', null, 'hello again'),
        root
    );
}, 2000);
```

2 seconds has elapsed, so we are now calling `Feact.render()` again, but this time with an element that looks like

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

Notice a new component is not getting created. `prevComponent` is the component that got created during the first render, and now it's going to take a new element and update itself with it. Components get created once at mount, and live on until unmount (which, does make sense...)

```javascript
class FeactDOMComponent {
    ...
    receiveComponent(nextElement) {
        const prevElement = this._currentElement;
        this.updateComponent(prevElement, nextElement);
    }

    updateComponent(prevElement, nextElement) {
        const lastProps = prevElement.props;
        const nextProps = nextElement.props;

        this._updateDOMProperties(lastProps, nextProps);
        this._updateDOMChildren(lastProps, nextProps);

        this._currentElement = nextElement;
    }

    _updateDOMProperties(lastProps, nextProps) {
        // nothing to do! I'll explain why below
    }

    _updateDOMChildren(lastProps, nextProps) {
        // finally, the component can update the DOM here
		// we'll implement this next
    }
};
```

`receiveComponent` just sets up updateComponent, which ultimately calls `_updateDOMProperties` and `_updateDOMChildren` which are the meaty functions which will finally cause the actual DOM to get updated. `_updateDOMProperties` is mostly concerned with updating CSS styles. We're not going to implement it in this blog post series, but just pointing it out as that is the method React uses to deal with style changes.

`_updateDOMChildren` in React can handle complex trees of children, but in `Feact` the children is just the contents of the DOM element, in this case the children will go from `"hello"` to `"hello again"`

```javascript
class FeactDOMComponent {
    ...
    _updateDOMChildren(lastProps, nextProps) {
        const lastContent = lastProps.children;
        const nextContent = nextProps.children;

        if (!nextContent) {
            this.updateTextContent('');
        } else if (lastContent !== nextContent) {
            this.updateTextContent('' + nextContent);
        }
    }

    updateTextContent(text) {
        const node = this._hostNode;

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
        Feact.createElement(MyCoolComponent, { myProp: 'hello again' }),
        document.getElementById('root')
    );
}, 2000);
```

Updating composite components is much more interesting and where a lot of the power in React lies. The good news is, a composite component will ultimately boil down to a `FeactDOMComponent`, so all the work we did above won't go to waste.

Even more good news, `updateRootComponent` has no idea what kind of component it received. It just blindly calls `receiveComponent` on it. So all we need to do is add `receiveComponent` to `FeactCompositeComponentWrapper` and we're good!

```javascript
class FeactCompositeComponentWrapper {
	...
	receiveComponent(nextElement) {
		const prevElement = this._currentElement;
		this.updateComponent(prevElement, nextElement);
	}

	updateComponent(prevElement, nextElement) {
		const nextProps = nextElement.props;
		
		this._performComponentUpdate(nextElement, nextProps);
	}

	_performComponentUpdate(nextElement, nextProps) {
		this._currentElement = nextElement;
		const inst = this._instance;

		inst.props = nextProps;

		this._updateRenderedComponent();
	}

	_updateRenderedComponent() {
		const prevComponentInstance = this._renderedComponent;
		const inst = this._instance;
		const nextRenderedElement = inst.render();

		prevComponentInstance.receiveComponent(nextRenderedElement);
	}
}
```

It's a little silly to spread such little logic across four methods, but it will make more sense as we progress. These four methods are also what is found in React's `ReactCompositeComponentWrapper`.

Ultimately the update boils down to calling `render` with the current set of props. Take the resulting element and passing it on to the `_renderedComponent`, and telling it to update. `_renderedComponent` could be another `FeactCompositeComponentWrapper`, or possibly a `FeactDOMComponent`. It was created during the first render.

## Let's use FeactReconciler again

Mounting components always goes through `FeactReconciler`, so updating them should to. This isn't that important for Feact, but it keeps us consistent with React.

```javascript
const FeactReconciler = {
	...
	receiveComponent(internalInstance, nextElement) {
		internalInstance.receiveComponent(nextElement);
	}
};


function updateRootComponent(prevComponent, nextElement) {
	FeactReconciler.receiveComponent(prevComponent, nextElement);
}

class FeactCompositeComponentWrapper {
	...
	_updateRenderedComponent() {
		const prevComponentInstance = this._renderedComponent;
		const inst = this._instance;
		const nextRenderedElement = inst.render();

		FeactReconciler.receiveComponent(
            prevComponentInstance, nextRenderedElement);
	}
```

## shouldComponentUpdate and componentWillReceiveProps

We can now easily add these two lifecycle methods into Feact.

```javascript
class FeactCompositeComponentWrapper {
	...
	updateComponent(prevElement, nextElement) {
		const nextProps = nextElement.props;
        const inst = this._instance;

        if (inst.componentWillReceiveProps) {
            inst.componentWillReceiveProps(nextProps);
        }

        let shouldUpdate = true;

        if (inst.shouldComponentUpdate) {
            shouldUpdate =
                inst.shouldComponentUpdate(nextProps);
        }
               
        if (shouldUpdate) {
            this._performComponentUpdate(nextElement, nextProps);
        } else {
            // if skipping the update,
            // still need to set the latest props
            inst.props = nextProps;
        }
	}
    ...
}
```

## A Major Hole

There's a big problem with Feact's updating that we won't be addressing. It's making the assumption that when the update happens, it can keep using the same type of component.

In other words, Feact can handle this just fine

```javascript
Feact.render(
    Feact.createElement(MyCoolComponent, { myProp: 'hi' }),
    root
);

// some time passes

Feact.render(
    Feact.createElement(MyCoolComponent, { myProp: 'hi again' }),
    root
);
```

but it can't handle this

```javascript
Feact.render(
    Feact.createElement(MyCoolComponent, { myProp: 'hi' }),
    root
);

// some time passes

Feact.render(
    Feact.createElement(SomeOtherComponent, { someOtherProp: 'hmmm' }),
    root
);
```

In this case, the update swapped in a completely different component class. Feact will just naively grab the previous component, which would be a `MyCoolComponent`, and tell it to update with the new props `{ someOtherProp: 'hmmm'}`. What it should have done is notice the component type changed, and instead of updating, unmounted `MyCoolComponent` and mounted `SomeOtherComponent`.

In order to do this, Feact would need:

* some ability to unmount a component
* notice the type change and head over to `FeactReconciler.mountComponent` instead of `FeactComponent.receiveComponent`

<div class="callout wisdom">
In React, if you render again with the same component type, it will get updated. You don't actually need to specify a `key` for your element to update in most cases. Keys are only necessary when a component is dealing with a collection of children. In this case, React will warn you if you forget your keys. It's best to heed the warning, because without the key React is not updating, but completely unmounting and mounting again!
</div>

## Did you spot the virtual DOM?

When React first came out, a lot of the hype was around the "virtual DOM". But the virtual DOM isn't really a concrete thing. It is more a concept that all of React (and Feact) accomplish together. There isn't anything inside React called `VirtualDOM` or anything like that. Instead `prevElement` and `nextElement` together capture the diff from render to render, and `FeactDOMComponent` applies the diff into the actual DOM.

## Conclusion

And with that, Feact is able to update components, albeit only through `Feact.render()`. That's not too practical, but we'll improve things next time when we explore `setState()`.

To wrap things up, here is a fiddle encompassing all that we've done so far

<a class="fiddle" target="_blank" href="https://jsfiddle.net/city41/9t9xavqL/3/">fiddle</a>

Stay tuned for part four, coming soon!

