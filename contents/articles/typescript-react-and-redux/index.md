---
title: TypeScript, React and Redux
author: Matt
date: 2016-06-26
template: article.jade
---

Try as I might, I could not get TypeScript and Redux to play nice together. I finally pulled it off with a tiny hack, and thought I'd dump what I did. If anyone has a better approach, please <a href="mailto:matt.e.greer@gmail.com">I'm all ears</a>

<span class="more"></span>

## Setting Up Your Actions

Somewhere in a Redux GitHub issue I found someone who took the approach of using [redux-actions](https://github.com/acdlite/redux-actions) and I liked it and adopted it.

For starters, define an `Action<T>` interface that your actions will conform to

```typescript
interface Action<T>{
  type: string;
  payload: T;
  error?: boolean;
  meta?: any;
}

export default Action;
```

So far I'm not using `error` or `meta`, but that's what redux-actions calls for so going with it. With this we get statically typed Actions

```typescript
import Action from "./action";
export const MY_ACTION = "MY_ACTION";
export type MY_ACTION = { foo: number, message: string }

export function doMyAction(message: string): Action<MY_ACTION> {
    return {
        type: MY_ACTION,
        payload: {
            foo: 123,
            message
        }
    }
}
```

Exporting both a string and a type named `MY_ACTION` felt a little weird. But since TypeScript can distinguish them by their type, it works. It reduces the cognitive load a bit when defining actions.

## And The Reducer
And now with the action set up, the reducer can consume it

```typescript
import Action from "../actions/action";
import { MY_ACTION } from "../actions/myAction";
import { handleActions } from "redux-actions";

const reducer = handleActions({
  [MY_ACTION]: function(state, action: Action<MY_ACTION>) {
    const massagedFoo = doSomething(action.payload.foo);

    return Object.assign({}, state, {
      massagedFoo,
      message: action.payload.message
    });
  }
}, {});

export default reducer;
```

Since TypeScript doesn't yet support [spread on objects](https://github.com/Microsoft/TypeScript/issues/2103), need to resort to `Object.assign`, which is not a big deal. I also left `state` as `any`, but defining its type is doable if you feel like it.

Also a minor point, but I like how redux-actions lets me avoid a switch statement.

## Time To connect it all

### Step One, the component

Your root component that will receive props from redux is a bit verbose to set up, lots of typing to make everyone happy

```
import * as React from "react";
import { connect } from "react-redux";

import { bindActionCreators } from "redux";
import * as MyActions from "../actions/myAction";

interface StateProps {
  massagedFoo: number,
  message: string
}

interface DispatchProps {
  doMyAction(message: string)
}

type Props = StateProps & DispatchProps;

function mapStateToProps(state) {
  return {
    massagedFoo: state.myAction.massagedFoo,
    message: state.myAction.message
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(MyActions, dispatch)
}

@connect<StateProps, DispatchProps, any>(mapStateToProps, mapDispatchToProps)
export default class Home extends React.Component<Props, any> {
  render() {
    const {
      massagedFoo,
      message,
      doMyAction
    } = this.props;

    return (
      <div>
        <div>foo: {massagedFoo} message: {message}</div>
        <button onClick={doMyAction.bind(this, "my cool message")} />
      </div>
    );
  }
}
```

I like hooking up `connect` via decorator, reduces the boilerplate nicely. I also like that my props are all statically typed and how easy it was to combine the state and dispatcher props into one with `Props = StateProps & DispatchProps`. All in all I'm impressed with how the TypeScript team managed to overlay a typing system that doesn't get in the way and still lets JavaScript shine through.

### Step Two, component meets store

Here is where I found Redux (technically react-redux) and TypeScript disagreed with each other. Hooking up your component to your store just can't be accomplished in such a way that the TypeScript compiler will be happy with. Here's the "out of the box" approach

```typescript
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Provider } from "react-redux";
import Home from "./components/Home";
import configureStore from "./store/configureStore";
import { Store } from "redux";

const store: Store = configureStore();

class App extends React.Component<any, any> {
  render() {
    return (
      <Provider store={store}>
        <Home />
      </Provider>
    );
  }
}

ReactDOM.render(<App/>, document.querySelector("#myApp"));
```

The problem is TypeScript thinks `Home` requires `massagedFoo`, `message` and `doMyAction` as props

```
ERROR in ./src/index.tsx
(16,9): error TS2324: Property 'massagedFoo' is missing in type 'IntrinsicAttributes & IntrinsicClassAttributes<Home> & StateProps & DispatchProps & { children?: ...'.

...
```

I banged my head on this for a while and I'm willing to bet a kosher Redux/TypeScript solution exists somewhere, but I sure couldn't find it.

## Cheating A Little Bit

Redux itself is getting along just fine with TypeScript. The problem is only in react-redux's `Provider`. react-redux is a tiny library, it's just a little bit of glue to get a Redux store into a React component and have the React component update properly whenever the store changes. Even better, react-redux is almost entirely inside `connect`, if you look at [Provider's source](https://github.com/reactjs/react-redux/blob/master/src/components/Provider.js), it's almost doing nothing at all!

All Provider is doing is placing the Redux store on the context, so that the component that `connect()` generated can find it. So I just wrote my own Provider that does the same thing, in a way that skirts around TypeScript

```typescript
import * as React from "react";

export default class Provider extends React.Component<any, any> {
  static childContextTypes = {
    store: React.PropTypes.object.isRequired
  }

  getChildContext() {
    return { store: this.props.store };
  }

  render() {
    return React.createElement(this.props.target);
  }
}
```

This is enough to make everyone happy. But it's a little irksome that the Provider is completely relying on `any`. By using generics, you can fix that

```typescript
import * as React from "react";
import { Store } from "redux";

export default function createProvider<P>() {
  interface ProviderProps<P> {
    store: Store,
    target: React.ComponentClass<P>
  }

  return class Provider extends React.Component<ProviderProps<P>, any> {
    static childContextTypes = {
      store: React.PropTypes.object.isRequired
    }

    getChildContext() {
      return { store: this.props.store };
    }

    render() {
      return React.createElement(this.props.target);
    }
  };
}
```

then over in index.tsx

```typescript
import * as React from "react";
import * as ReactDOM from "react-dom";
import Sample from "./components/Sample";
import createProvider from "./createProvider";
import Home, { HomeProps } from "./components/Home";
import configureStore from "./store/configureStore";

const store = configureStore();
const Provider = createProvider<HomeProps>();

class App extends React.Component<any, any> {
  render() {
    return (
      <Provider store={store} target={Home} />
    );
  }
}

ReactDOM.render(<App/>, document.querySelector("#myApp"));
```
