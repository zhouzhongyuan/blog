---
title: Yokul - Google Charts Reimplemented in a Local JS Canvas
author: Matt
date: 2011-06-05
template: article.jade
---
[Yokul](https://github.com/city41/yokul) is a little JavaScript experiment I've been playing with in my free time. Using the same query string you'd normally send to the [Google Image Chart API](http://code.google.com/apis/chart/image/) a local chart is created on the client using an HTML5 canvas.

<span class="more"></span>

<style>
  .charts {
    margin: 1em 0 2em 0;
  }
  
  .charts img {
    margin-bottom: 0.5em;
  }

  #debugOutputDiv {
    margin-top: 20px;
  }

  .debug-msg {
    margin-top: 4px;
    margin-bottom: 4px;
    background-color: #dedede;
  }

  .debug-header {
    padding: 3px;
    text-align: right;
    width: 80px;
    display: inline-block;
    margin-right: 10px;
  }

  .info {
    background-color: gray;
  }

  .error {
    background-color: red;
    color: white;
    font-weight: bold;
  }
  .warning {
    background-color: #FFCC00;
    font-weight: bold;
  }
</style>
<script type="text/javascript" src="/js/yokul/yokul.min.js"></script>

<div class="charts">
<img src="http://chart.apis.google.com/chart?chxr=2,-5,100&chxs=0,676767,10.5,0,l,676767&chxt=y,x&chbh=24,2,1&chs=400x245&cht=bvs&chco=BBCCED,FF9900,3366CC&chds=0,95,0,100,0,105&chd=t:44,33,30,20,30,40,30,20,55|0,0,40,0,40,0,40,0,0|0,20,0,67,0,20,0,63,0&chdl=water|orange stripes|blue stripes&&chma=|40,40&chtt=Chart+Fish+Done+With+Google&chts=0C3890,20.5&chxl=0:|deep|shallow|air" />  
  
<img data-src="http://chart.apis.google.com/chart?chxr=2,-5,100&chxs=0,676767,10.5,0,l,676767&chxt=y,x&chbh=24,2,1&chs=400x245&cht=bvs&chco=BBCCED,FF9900,3366CC&chds=0,95,0,100,0,105&chd=t:44,33,30,20,30,40,30,20,55|0,0,40,0,40,0,40,0,0|0,20,0,67,0,20,0,63,0&chdl=water|orange stripes|blue stripes&&chma=|40,40&chtt=Chart+Fish+Done+With+Yokul&chts=0C3890,20.5&chxl=0:|deep|shallow|air" />
</div>

Here is a [page of charts](VerticalBar.min.html) to play with

<h2>Advantages</h2>
* Open source and completely runs on the client, no data is sent to any third parties
* If your site has a lot of charts, this will save a lot of bandwidth. Granted it's saving Google's and your user's bandwidth so you may not care
* It can render many charts much faster than Google can, limited only by the power of the user's machine
* No need to send Google Charts a POST for complex chart definitions, Yokul will take a query string of any length
* Some of Google's limitations like chart size are not present in Yokul. Want to make a 10,000x10,000 pixel chart? Have at it
* No internet connection is required for Yokul to work
* Animating a Yokul chart will be pretty easy to do and is high on the list of things to do next

<h2>Disadvantages</h2>
* Your user must have JavaScript enabled and a modern browser to see the chart
* Yokul, so far, doesn't come even close to implementing all of Google Charts and if it ever does, it'll be a while
* Not a trivial drop in replacement, to use Yokul you do need to change your markup a bit (see below)

<h2>Yokul Depends On</h2>
A browser having Canvas. That's about it. No other JavaScript library is required.

<h2>What Works So Far</h2>
So far just vertical bar charts (grouped, stacked and overlapped) are implemented. There are some parameters that are not implemented, others that have bugs and others that are only partially implemented. See the <a href="/VerticalBar.min.html">sample page</a> for a decent overview of what Yokul is currently capable of

<h2>Quick Start</h2>
1. Grab [yokul.min.js](https://github.com/city41/yokul/raw/master/min/yokul.min.js) and reference it
2. Change all the `src` attributes in your Google Chart images to `data-src` attributes
3. Call `YOKUL.convertAllImages()`

<h2>Showing debug info and errors</h2>
Yokul is very early at this point, you will certainly run into issues. Mostly you'll find some of your favorite chart types and/or parameters aren't implemented yet. Yokul will let you know if you set up a debug output div for it.

Create a div on your page that Yokul can write to. Tell Yokul where this div is with 

```javascript
  YOKUL.debugOutput = "idOfYourDebugDiv";
  YOKUL.logOutput = { info: false, warning: true, error: true };
```

Ideally do this before you do anything else with Yokul. Here is the debug output from creating the above chart:

<div id="debugOutputDiv"></div>

You will need to set up some CSS styles for this output to look nice, view the source of this page to see my styles</p>

<h2>Converting just one image</h2>
If `convertAllImages()` is too course for you, you can call `YOKUL.chartCreator.create(id, [query])`. Where:

* **id** is a DOM id of an img element. This img's src will be set to the generated chart image
* **query** the chart query string you'd normally send to Google. This is optional and if not provided Yokul will try and find the query string in the img element

<script type="text/javascript">
  YOKUL.debugOutput = "debugOutputDiv";
  YOKUL.logOutput = { info: false, warning: true, error: true };
  YOKUL.convertAllImages();
</script>


