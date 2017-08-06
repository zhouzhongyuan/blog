---
title: "React Internals, Part Five: transactions"
author: Matt
date: 2017-07-23
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

At this point, the little React clone we built, Feact, is done. We won't be adding any more to it. You can see the final version of it [here](https://jsfiddle.net/city41/fbw81p5e/5).

But if you decide to dive into React's source, you'll quickly notice all these "transactions" everywhere. They obscure the intent of the code, and make it harder to get a sense of what is going on. Rest assured, Feact is following React closely (well, React 15.3 at least), but it purposely doesn't have transactions to make the actual "meat" of the code more apparent.

## what is a transaction?

The good news is transactions are very simple.
