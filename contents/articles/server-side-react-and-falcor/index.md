---
title: Server Side React and Falcor
author: Matt
date: 2016-01-03
template: article.jade
---
Everything I have found about Falcor has been strongly focused on the client side. I am building a webapp that involves server side React rendering, and I wanted to use Falcor. Here's how I wired up a server side Falcor "client" to accomplish this.

<span class="more"></span>

[Falcor](https://netflix.github.io/falcor/) is a new open source library from Netflix that offers a new approach to retrieving data for an application. It is similar in concept to [Facebook's Relay](https://facebook.github.io/relay/).

I feel like if you are building a React-based app today, you really should take advantage of server side rendering. The days of 100% JavaScript driven UIs should be behind us. But there isn't much out there on combining server side React with Falcor. The Falcor docs strictly focus on initiating your data retrieval on the client.

## DataSources, Routers and Models

In Falcor, the `Model` is the component that initiates data requests. It can get its data either from its internal `cache` property, or by hooking up to a `DataSource`. Falcor seemingly only ships with one DataSource, the `HttpDataSource`, which hooks up a client side Model to a back end server via good ol' http requests.

Conversely, the Falcor Router lives on the server, and responds to requests from client side Models.

![colorTable](img/falcor-end-to-end.png)

<em>(diagram stolen from [the Falcor website](https://netflix.github.io/falcor/documentation/model.html))</em>

I want a Model on the server though, so HttpDataSource is useless here. But the Router comes to the rescue, as it also implements the DataSource interface.

```javascript
import { Model } from 'falcor';
import DemoRouter from './Router';

const demoRouter = new DemoRouter();
const model = new Model({ source: demoRouter });
```

So the same router that will serve my client can double to serve my server too. Cool. Technically you can get away with just using the router directly, as both `model.get(...)` and `router.get(...)` do roughly the same thing. But if you go through a Model, you gain caching, de-duping, the ability to use path syntax strings among other advantages.

## Some Wrenches: Redux and React Router

I'm also using these two libraries, and they complicate hooking up my Falcor model to my server side React components a bit. Here is my Express handler that is using react-router (simplified a bit)

```javascript
app.use((req, res, next) => {
  const location = history.createLocation(req.path);
  match({
    routes,
    location
  }, (err, redirectLocation, renderProps) => {
    if (err) {
      console.error(err);
      return next(err);
    }

    res.send(renderToString(
      // notice that store doesn't actually exist, yet ...
      <Provider store={store}>
        <RoutingContext {...renderProps}/>
      </Provider>
    );
  });
});
```

Using react-router's `match`, the path is matched up to a route. From there, renderProps contains everything needed to render that route on the server. `Provider` is a react-redux component and glues data in the store to the components inside of it. Server side React rendering is synchronous, so I need to get my data from Falcor before calling `renderToString`. In other words, the `store` getting passed to Provider needs to both exist and be populated.

## Gluing Falcor and react-router
Ok, so the client has requested some random page of my app. The router has mapped that random page to some random component. All of my components have different data needs. So how do I know what to ask Falcor? I decided the components should tell me. For example, here is the component for the main page of the app

```javascript
import { connect } from 'react-redux';
import Hello from '../components/Hello';

function mapStateToProps(state) {
  return {
    hellofalcor: state.hello.hellofalcor,
    helloagain: state.hello.helloagain
  };
}

const HelloPage = connect(mapStateToProps)(Hello);

HelloPage.serverFalcorPaths = [
  { namespace: 'hello', paths: [['hellofalcor'], ['helloagain']] }
];

export default HelloPage;
```

If you've not used Redux this probably look nuts. `Hello` is a vanilla React component, and redux's `connect()` creates a new component which marries `Hello` to data in the store.

The new thing here is `serverFalcorPaths`, which is my hook to hint to Falcor what data it should grab when doing the server side render. Notice how `mapStateToProps` has its data down in a `hello` subobject? That's also a common redux thing. My goal is to create an initial set of state data that I can feed into Redux, then into the components, then finally out via `renderToString`.

So back to the Express handler, let's grab `serverFalcorPaths` and get our data

```javascript
app.use((req, res, next) => {
  const location = history.createLocation(req.path);
  match({
    routes,
    location
  }, (err, redirectLocation, renderProps) => {
    if (err) {
      console.error(err);
      return next(err);
    }
    getFalcorDataForComponents(renderProps.components)
      .then(initialStoreData => {
        const store = createStore(reducers, initialStoreData);
        res.send(renderToString(
          // the store prop here is the gotcha
          <Provider store={store}>
            <RoutingContext {...renderProps}/>
          </Provider>
        );
      });
  });
});
```

`renderProps` from `match()` contains everything needed to pull off the render, including the React components themselves. So if I find `renderProps.components[i].serverFalcorPaths`, then I know that component needs a little Falcor love before continuing. That's what `getFalcorDataForComponents` is up to.

```javascript
export default function getFalcorDataForComponents(components = []) {
  const falcorRouter = new FalcorRouter();
  const model = new Model({ source: falcorRouter });

  // grab all the falcor paths the components
  // are requesting into one large bag
  const falcorPaths = components.reduce((paths, cmp) => {
    if (cmp && cmp.serverFalcorPaths) {
      const cmpPaths = _.pluck(cmp.serverFalcorPaths, 'paths');
      return paths.concat(...cmpPaths);
    } else {
      return paths;
    }
  }, []);

  // blindly get all the needed data, we ignore
  // the result because we are really
  // just populating the model's cache
  return model.get(...falcorPaths).then(() => {
    // and now that we have it (in the cache), sort it out
    // into the namespaces the components specified
    // this enables the store to be populated the same
    // as if the reducers and redux's combineReducers()
    // had assembled the data

    const componentPromises = components.map(getComponentData.bind(this, model));

    return Promise.all(_.flatten(componentPromises)).then(results => {
      // assign could lead to clobbered data depending on
      // how your data is set up, better to use a deep merge.
      // But this suffices for blog post/demo purposes
      return Object.assign.apply(Object, [{}, ...results]);
    });
  });
}
```

This takes two steps. First grab *all* of the Falcor paths that all of the components are requesting. We'll jam that big blob of paths into the Model. Falcor does its thing and all of those paths get satisfied with data. The Model also sticks this data into its cache, so if we request the data again, it will just go to its cache and be very cheaply retrieved.

So step two takes advantage of the cache and requests everything again, this time stitching the final result into the shape that redux wants.

So step one got us

```
{
  hellofalcor: 'hello from falcor',
  helloagain: 'hello again from falcor'
}
```

And step two massages it into

```
{
  hello: {
    hellofalcor: 'hello from falcor',
    helloagain: 'hello again from falcor'
  }
}
```
which satisfies redux's `combineReducers()`'s needs, and ultimately satisfies the components's needs.

This is a super contrived example. But in a real app, each component will likely need a lot of paths, and want their results placed into different subobjects.

Remember that we are going through a Falcor Model, which will de-dupe paths. So components are all free to just specify whatever they want, and Falcor will sort it all out.

## Demo app

I captured all of this into a "small" demo app here: https://github.com/city41/server-side-react-and-falcor -- check the README on how to get it running.
