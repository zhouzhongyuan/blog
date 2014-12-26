---
title: Creating a Pegdown Plugin
author: Matt
date: 2014-12-26
template: article.jade
---

I recently found myself needing to create a [Pegdown](http://pegdown.org) plugin. The documentation was a bit all over the place on this, so I figured I'd dump my end-to-end experience into a blog post for Google to consume.

<span class="more"></span>

##What is Pegdown?

[Pegdown](http://pegdown.org) is a Markdown parser and HTML generator for the JVM. Converting Markdown to HTML is as simple as `new PegDownProcessor().markdownToHtml(markdown);`, which is awesome. If you want to extend Markdown with your own syntax, Pegdown's got you covered with its plugin system. However creating a Pegdown plugin is not quite as simple.

##The Two Phases of Pegdown

Pegdown works in two phases. First it converts Markdown into an abstract syntax tree, then it takes that AST and serializes it into HTML. Your plugin probably needs to be involved in both phases, but you are free to only work with one phase if it suits you.

##The Parsing Plugin

First, create a plugin that participates in the parsing/AST phase. In my case, I wanted to parse this extension to Markdown

```markdown
%%% someMethod(someParam=someValue)
body goes here
%%%
```

You need to create a class that implements [InlinePluginParser](https://github.com/sirthias/pegdown/blob/master/src/main/java/org/pegdown/plugins/InlinePluginParser.java) and/or [BlockPluginParser](https://github.com/sirthias/pegdown/blob/master/src/main/java/org/pegdown/plugins/BlockPluginParser.java). An inline plugin parses something that happens during the course of a sentence, such as `using backticks for code`, and a block level plugin parses an entire top level chunk of Markdown, like the example above.

Here is my parsing plugin in its entirety. Afterwards I'll dive into some of its specifics:

```java
import java.util.Map;

import org.parboiled.BaseParser;
import org.parboiled.Rule;
import org.parboiled.support.StringBuilderVar;
import org.pegdown.Parser;
import org.pegdown.plugins.BlockPluginParser;

public class ComponentParser extends Parser implements BlockPluginParser {
  private final String TAG = "%%%";

  public ComponentParser() {
    super(ALL, 1000l, DefaultParseRunnerProvider);
  }

  @Override
  public Rule[] blockPluginRules() {
    return new Rule[] { component() };
  }

  public Rule component() {

    // stack ends up like this:
    //
    // body
    // params map
    // component name

    return NodeSequence(
             open(),
             body(),
             close(),
             push(new ComponentNode(
                        (String)pop(2),
                        (Map<String, String>)pop(1),
                        (String)pop())));
  }

  /*
   * parses out the component name and its parameters
   *
   * example:
   * %%% myComponent(foo=bar)
   */
  public Rule open() {
    StringBuilderVar componentName = new StringBuilderVar();

    return Sequence(
             TAG,
             whitespace(),
             OneOrMore(
               TestNot('('),
               BaseParser.ANY,
               componentName.append(matchedChar())
             ),
             push(componentName.getString()),
             whitespace(),
             '(',
               whitespace(),
               params(),
               whitespace(),
             ')',
             whitespace(),
             Newline());
  }

  /*
   * parses out parameters from in between the parentheses
   * they look like: foo=bar,baz=boo
   * and optionally have whitespace around any tokens
   * foo = bar , baz=boo
   */
  public Rule params() {
    ParamVar params = new ParamVar();
    StringBuilderVar paramName = new StringBuilderVar();
    StringBuilderVar paramValue = new StringBuilderVar();

    return Sequence(
             ZeroOrMore(
               whitespace(),
               OneOrMore(
                 TestNot('='),
                 TestNot(' '),
                 BaseParser.ANY,
                 paramName.append(matchedChar())),
               whitespace(),
               '=',
               whitespace(),
               OneOrMore(
                 TestNot(')'),
                 TestNot(','),
                 TestNot(' '),
                 BaseParser.ANY,
                 paramValue.append(matchedChar())),
               whitespace(),
               Optional(','),
               whitespace(),
               params.put(paramName.getString(), paramValue.getString()),
               paramName.clear(),
               paramValue.clear()),
             push(params.get()));
  }

  /*
   * extracts the body of the component into a raw string
   */
  public Rule body() {
    StringBuilderVar rawBody = new StringBuilderVar();

    return Sequence(
             OneOrMore(
               TestNot(TAG),
               BaseParser.ANY,
               rawBody.append(matchedChar())),
             push(rawBody.getString().trim()));
  }

  /*
   * end of the component, ie "%%%"
   */
  public String close() {
    return TAG;
  }

  public Rule whitespace() {
    return ZeroOrMore(
             AnyOf(" \t\f"));
  }
}
```

### Implementing BlockPluginParser

This interface only has one method, `Rule[] blockPluginRules()`, which returns all of the top level rules you want the parser to follow. In my case I am just returning the `component` Rule, which has subrules that altogether tell Pegdown how to parse an entire component block.

### The Value Stack

Notice in my plugin calls to `push()` and `pop()`, that is where I am interacting with Pegdown's value stack. This is a typical stack where Rules can stash temporary values. As the parser works its way through parsing my component, I push stuff onto the stack as I figure them out.

<div class="callout wisdom">
Pegdown has one expectation here: *your plugin should finish its job with one Node pushed onto the stack*. In other words, after your plugin completely finishes, the stack should be one deeper, and that top value you left behind needs to be a Node, which is your plugin's contribution to the overall AST that is getting built.
</div>

Leaving behind two nodes or zero nodes won't cut it. The last thing my plugin does in `component()` is push on a `ComponentNode`, which is covered below.

### Parboiled's Rule Rewriting Magic

Pegdown is built on top of [Parboiled](http://parboiled.org). So your plugin is really working with Parboiled mostly. Notice how the rules directly call methods like `push()`? That seems odd, wouldn't they just get called right away and have no effect? You want them to get invoked while the actual parsing is happening.

That's where Parboiled comes in, it will rewrite your Rule methods so that everything you're declaring actually happens at parse time. It's an interesting approach, and has the advantage of making writing Rules simpler.

### Rules, Matching and Actions

Your Rule methods are attempting to match the Markdown text and see if the text conforms to what they expect. If the text does, then Rules can also take actions, which are responses to when a successful match happens.

Take a look at the `open()` Rule, which parses the opening line of my components. It's working with

```markdown
%%% someMethod(someParam=someValue)
```

here it is, in a slightly simplified form

```java
  public Rule open() {
    StringBuilderVar componentName = new StringBuilderVar();

    return Sequence(
             "%%%",
             OneOrMore(
               TestNot('('),
               BaseParser.ANY,
               componentName.append(matchedChar())
             ),
             push(componentName.getString()),
             '(',
               params(),
             ')',
             Newline());
  }
```

Here a `Sequence()` is being returned. It wants to match the entire opening line.

<div class="callout wisdom">
  `Sequence()` comes from [`org.parboiled.BaseParser`](https://github.com/sirthias/parboiled/blob/master/parboiled-java/src/main/java/org/parboiled/BaseParser.java). Notice my plugin extends `org.pegdown.Parser`, which is a subclass of `BaseParser`. You don't have to extend these classes, but doing so is highly recommended. They provide many parsing primitives you will need, such as `Sequence()` and `Newline()`
</div>

After finding the opening `%%%`, I then want to extract the name. `OneOrMore()` is doing just that. First `TestNot('(')` says "as long as the next character isn't a `(`, then keep doing your thing". `BaseParser.ANY` then matches any character at all (since `TestNot` has succeeded at this point, I know I like what `ANY` is going to find). From there I grab what was matched out of the text stream and throw it into `componentName`. This will happen repeatedly until a `(` is hit. At that point, `push(componentName.getString())` will happen, and the name of the component is tucked away onto the stack.

The rest of the method looks for a set of parentheses and has the `params()` rule handle whatever is found inside of them.

### What If a Rule Fizzles Out?

What if the input was actually

```markdown
%%% someComponent thisIsUnexpected
```

wouldn't the above Rule push the name onto the stack, then crap out? Yes, it would. But if a Rule doesn't fully finish parsing, then Pegdown/Parboiled will abandon the changes the Rule made to the stack. So don't worry, just charge ahead.

### Dealing with Vars

At this point, you're pretty much good to go on how parsing plugins work. It's then mostly a matter of getting a feel for composing primitive Rules together.

But there is one more funky thing you might have to deal with, Parboiled Vars. Remember that magic that Parboiled does to your Rules methods? This magic means you can't just use any ol' Java you want. If you need to work with a data structure, such as a string, then you need to do so with it wrapped up in a `Var`. Notice in `open()` the `componentName` was being added to a `StringBuilderVar`? That's just a simple class that wraps a `StringBuilder`, and does so in such a way that is compatible with Parboiled's rewrite magic.

Here is `params()`, which parses out the parameters to the component:

```java
  public Rule params() {
    ParamVar params = new ParamVar();
    StringBuilderVar paramName = new StringBuilderVar();
    StringBuilderVar paramValue = new StringBuilderVar();

    return Sequence(
             ...
             params.put(paramName.getString(), paramValue.getString())
             ...
          );
  }
```

It's using `StringBuilderVar`s again, which come with Parboiled. But `ParamVar` is my own creation. It wraps a `Map<String,String>` into a Var. Basically all you need to do is have working with your data structure return `true` to let Parboiled know it can continue with the next step of your Rule.

<pre><code class="lang-java"><span class="keyword">public</span> <span class="class"><span class="keyword">class</span> <span class="title">ParamVar</span> <span class="keyword">extends</span> <span class="title">Var&lt;Map&lt;String,String&gt;&gt;</span> {</span>
  <span class="keyword">public</span> <span class="title">ParamVar</span>() {
    <span class="keyword">super</span>(<span class="keyword">new</span> HashMap&lt;String,String&gt;());
  }

  <span class="keyword">public</span> <span class="keyword">boolean</span> <span class="title">put</span>(String key, String value) {
    get().put(key, value);
    <span class="keyword">return</span> <span class="keyword">true</span>;
  }
}
</code></pre>

That's as far as I needed to take Vars, I'm sure they get more involved if you need to do fancier stuff.

##Having Pegdown Use Your Parser Plugin

Now with the parser plugin written, I need to tell Pegdown to use it:

```java
  PegDownPlugins plugins = new PegDownPlugins.Builder()
    .withPlugin(ComponentParser.class).build();

  PegDownProcessor processor = new PegDownProcessor(0, plugins);
  RootNode ast = processor.parseMarkdown(markdown.toCharArray());
```

<div class="callout pitfall">
You need to give Pegdown your parser's **class**, this is key to allowing Parboiled to perform its rewrite magic.
</div>

## Nodes

Pegdown parses Markdown into a tree of Nodes, where `RootNode` is the root. In my parser plugin above, I created a `ComponentNode`, which is my own class. This allows your custom parsing's results to live in the AST. Here is my `ComponentNode` class, simplified a bit:

```java
public class ComponentNode extends AbstractNode {
  private String name;
  private Map<String,String> params;
  private String body;

  public ComponentNode(String name, Map<String,String> params, String body) {
    this.name = name;
    this.params = params;
    this.body = body;
  }

  @Override
  public void accept(Visitor visitor) {
    visitor.visit((Node) this);
  }

  @Override
  public List<Node> getChildren() {
    return null;
  }
  ...
}
```

Converting from AST to HTML involves the visitor pattern, hence the `accept()` method.

## From AST to HTML

Now I'll serialize the custom node into the final HTML. This requires me to give Pegdown a serializer plugin during the serialization phase:

```java
  List<ToHtmlSerializerPlugin> serializePlugins =
    Arrays.asList((ToHtmlSerializerPlugin)(new ComponentSerializer()));

  String finalHtml =
    new ToHtmlSerializer(new LinkRenderer(), serializePlugins)
      .toHtml(ast);
```

And of course `ComponentSerializer` is a class I wrote to handle my custom stuff:

```java
public class ComponentSerializer implements ToHtmlSerializerPlugin {

  @Override
  public boolean visit(Node node, Visitor visitor, Printer printer) {
    if (node instanceof ComponentNode) {
      ComponentNode cNode = (ComponentNode)node;

      printer.print("This gets dumped into the final HTML");
      printer.print(cNode.getName());
      printer.println();

      return true;
    }
    return false
  }
}
```

You need to return `true` to let Pegdown know you've successfully handled the node.

And that's all it takes to add custom Markdown extensions with Pegdown.
