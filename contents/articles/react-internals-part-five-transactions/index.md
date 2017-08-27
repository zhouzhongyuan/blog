---
title: "React Internals, Part Five: transactions"
author: Matt
date: 2017-08-12
template: article.jade
---
In this part, we'll talk about React's transactions.
<span class="more"></span>

## The series
<ul>
    <li>[part one: basic rendering](/articles/react-internals-part-one-basic-rendering)</li>
    <li>[part two: componentWillMount and componentDidMount](/articles/react-internals-part-two-componentWillMount-and-componentDidMount/)</li>
    <li>[part three: basic updating](/articles/react-internals-part-three-basic-updating)</li>
    <li>[part four: setState](/articles/react-internals-part-four-setState)</li>
    <li>**part five: transactions** <- you are here</li>
</ul>

## transactions everywhere

At this point, the little React clone we built, Feact, is complete. You can see the final version of it [here](https://jsfiddle.net/city41/fbw81p5e/5).

But if you decide to dive into React's source, you'll quickly notice all these "transactions" everywhere. They obscure the intent of the code, and make it harder to get a sense of what is going on. Rest assured, Feact is following React pretty closely (well, React 15.3 at least), but it purposely doesn't have transactions to make the actual "meat" of the code more apparent.

## what is a transaction?

The good news is transactions are simple. They are just a pattern React team has adopted to make the framework more robust and easier to maintain.

Whenever React decides it needs to do something, that "something" usually needs to do a little bit of prep work before, do its main logic, then some clean up work afterwards. This diagram showing how transactions work is taken straight from the React source code

<pre style="min-width: 800px">
 *                       wrappers (injected at creation time)
 *                                      +        +
 *                                      |        |
 *                    +-----------------|--------|--------------+
 *                    |                 v        |              |
 *                    |      +---------------+   |              |
 *                    |   +--|    wrapper1   |---|----+         |
 *                    |   |  +---------------+   v    |         |
 *                    |   |          +-------------+  |         |
 *                    |   |     +----|   wrapper2  |--------+   |
 *                    |   |     |    +-------------+  |     |   |
 *                    |   |     |                     |     |   |
 *                    |   v     v                     v     v   | wrapper
 *                    | +---+ +---+   +---------+   +---+ +---+ | invariants
 * perform(anyMethod) | |   | |   |   |         |   |   | |   | | maintained
 * +----------------->|-|---|-|---|-->|anyMethod|---|---|-|---|-|-------->
 *                    | |   | |   |   |         |   |   | |   | |
 *                    | |   | |   |   |         |   |   | |   | |
 *                    | |   | |   |   |         |   |   | |   | |
 *                    | +---+ +---+   +---------+   +---+ +---+ |
 *                    |  initialize                    close    |
 *                    +-----------------------------------------+
</pre>

If Feact was to add transactions, its (very) simple take would be something like this:

```javascript
class Transaction {
    constructor(wrapper) {
        this._wrapper = wrapper;
    }

    perform(method) {
        const wrapperValue = this._wrapper.initialize();

        method();

        this._wrapper.close(wrapperValue);
    }
}
```

## A use case for transactions

Why all the fuss? Mostly transactions enable React to do what it needs to do while keeping the browser happy.

For example, consider this dumb little React app, it swaps a button and a text input every 5 seconds

```javascript
const MyComp = React.createClass({
    getInitialState() {
        return {
            textFirst: true
        };
    },

    componentDidMount() {
        setInterval(() => {
            this.setState({
                textFirst: !this.state.textFirst
            });
        }, 5000);
    },

    render() {
        let children;

        if (this.state.textFirst) {
            children = [
                <input key="text" type="text" />,
                <button key="button" />
            ];
        } else {
            children = [
                <button key="button" />,
                <input key="text" type="text" />
            ];
        }

        return (
            <div>{children}</div>
        );
    }
});

ReactDOM.render(<MyComp />, document.body);
```
The trouble with this app is the input element. Whenever you move an input element in the DOM (for example, `parentElement.insertBefore(myInputElement, someOtherChild)`), the browser clears out its selection. So if the user has highlighted some text in the input, then something about how your app renders causes React to move the input in the DOM, that selection gets cleared, frustrating your user. To solve this problem, React component updates are done in a transaction. During the initialize phase of the transaction, React grabs the current selection state of the browser and stores it. Then in the close phase, it takes that previous value and makes sure it gets restored. The transactions that happen during a React render handle many other things such as disabling events, maintaining the window's scroll position, and more. Another benefit of the transaction pattern is it becomes easy to store the selection, do a whole bunch of work, then restore the selection at the very end.

### Feact transactions

If Feact managed selection using transactions, it'd look something like

```javascript
const SELECTION_RESTORATION = {
    initialize() {
        const focusedElem = document.activeElement;

        return {
            focusedElem,
            selection: {
                start: focusedElem.selectionStart,
                end: focusedElem.selectionEnd
            }
        };
    },

    close(priorSelectionInformation) { 
        const focusedElem = priorSelectionInformation.focusedElem; 
        focusedElem.selectionStart = 
            priorSelectionInformation.selection.start;

        focusedElem.selectionEnd =
            priorSelectionInformation.selection.end;
    }
};

const updateTransaction = new Transaction(SELECTION_RESTORATION);

FeactReconciler = {
    ...
    receiveComponent(internalinstance, nextElement) {
        updateTransaction.perform(function() {
            internalInstance.receiveComponent(nextElement);
        });
    }
    ...
}
```

<div class="callout pitfall">
Again trying to keep the code as straightforward as possible. This silly little transaction doesn't even check if the element is capable of having a selection, amongst many other problems.
</div>

Over in React, transactions are more complicated. For starters, they allow more than one wrapper. They also deal with exceptions being thrown, and also ensure transactions don't call back into themselves.

## Series Conclusion

And with that, this series has covered the basics of how React works. Whenever you're debugging your React applications, the large portion of the call stack that is React code should feel a little less alien now. That's a primary reason I decided to write this series out.

If you spotted any errors or have any feedback, feel free to <a href="mailto:matt.e.greer@gmail.com">email me</a>.

