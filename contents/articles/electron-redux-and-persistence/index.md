---
title: Electron, Redux and Persistence
author: Matt
date: 2016-01-31
template: article.jade
---
Redux is a nice pattern for React apps. But when wanting to persist my redux state across sessions for an Electron app, I hit some hurdles.
<span class="more"></span>

For work I created a small Electron based app using React and Redux. I dig Electron, it's a great platform for rapidly building something; internal tools are perfect candidates.

## Dealing with errors in the app

If an error occurs, I want to inform the user. So my app has a `receiveError` redux action

```javascript
// the action
function receiveError(error) {
  return {
    type: RECEIVE_ERROR,
    error
  };
}

// and over in the reducer
const initialState = {
  hasError: false
};

function error(state = initialState, action) {
  switch (action.type) {
    case RECEIVE_ERROR:
      return {
        ...state,
        hasError: true,
        message: action.error.message || action.error,
        stack: action.error.stack
      };
    default:
      return state;
  }
}
```

I think storing the error in the app state is the correct thing to do. Errors can come from anywhere, and the component that will report what happened to the user should be independent. App state is a good mediator here.

## Storing app state across app sessions

I want the app to be as the user left it the next time they launch it. This is easy to do in Electron, `localStorage` to the rescue.

```javascript
remote.getCurrentWindow().on('close', () => {
  const state = store.getState();
  localStorage.myAppState = JSON.stringify(state);
});
```

and here comes the problem, I want state like errors stored in app state for good reasons, but they shouldn't be persisted.

Roughly speaking there's three types of state

* **true app state**: data and the real state of the app. Stored in redux's app state permanently
* **local component state**: think "is this details panel open or closed?", little details about a component can be stored on that component's own state, completely separate from redux
* **transient app state:** like the error above. Not true, permanent app state, but also not something components should be storing. Kind of a *no man's land* in redux.

The second type is sometimes debatable. Storing details like that in app state is also a fine approach.

## Cleaning app state before persisting

My initial stab at this was to just take the entire app state via `store.getState()`, then start strategically `delete`ing properties I don't want persisted. This is ugly, doesn't scale, error prone, all kinds of bad stuff.

A better approach is to have a `PERSISTING` action. Send this action through all of your reducers, and let them decide what should stay and what should go

```javascript
  const initialState = {
    hasError: false
  };

  function error(state = initialState, action) {
    switch (action.type) {
      case RECEIVE_ERROR:
        return {
          ...state,
          hasError: true,
          message: action.error.message || action.error,
          stack: action.error.stack
        };
      case PERSISTING:
        return {...initialState};
      default:
        return state;
    }
  }
```

I like this little pattern. Who better to decide how to clean the state than the reducer? For most reducers you just reset back to the beginning using `initialState`, and so there's confidence that the state going into localStorage is well formed.

And with that, my persistence code is now

```javascript
export function save(state) {
  const stateForPersistence = rootReducer(state, { type: PERSISTING });

  const serialized = JSON.stringify(stateForPersistence);
  localStorage[localStorageKey] = serialized;
}

export function restore() {
  return localStorage[localStorageKey] &&
  JSON.parse(localStorage[localStorageKey]);
}
```

Where `rootReducer` is built using redux's `combineReducers`.
