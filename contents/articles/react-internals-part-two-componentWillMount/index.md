

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

### But we need to improve createClass

If you scroll back up and look at `createClass`, it is specifically grabbing the `render` method, and it would leave `componentWillMount` behind. All methods the user defines in their component need to be maintained, so let's fix that

```javascript
const Feact = {
    createClass(config) {
        function ComponentClass(props) {
            this.props = props;
        }

        ComponentClass.prototype =
            Object.assign(ComponentClass.prototype, config);

        return ComponentClass;
    }
    ...
}
```

Now `componentWillMount` won't get left behind, along with any other methods the user provided. As we proceed with Feact, we will add in `componentWillReceiveProps`, `shouldComponentUpdate`, and all the other methods we know and love.

