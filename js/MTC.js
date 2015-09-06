if (typeof MTC === 'undefined') {

  (typeof window !== 'undefined' ? window : this).MTC = {};
  MTC.jspath = '';
  if (typeof document === 'object' && document && document.currentScript) {
    MTC.jspath = document.currentScript.src.substring(0, document.currentScript.src.lastIndexOf('/')+1)
  }
  MTC.real = {
    Date: Date,
    dateNow: Date.now,
    performanceNow: this.performance && performance.now.bind(performance) || Date.now,
    setTimeout: setTimeout.bind(this),
    clearTimeout: clearTimeout.bind(this),
    setInterval: setInterval.bind(this),
    clearInterval: clearInterval.bind(this),
    Worker: this.Worker && Worker.bind(this)
  };
  MTC.excludeTimers = [];
  MTC.excludeWorkers = [];
  MTC.installTimeHook = function() {
    var self = this,
      spoofOn = false;

    var timeStart = 0,
      nowStart, currentTime = 0,
      realTimeInterval = null;
    var timers = [],
      tfirst = 0,
      ctimers = [],
      workers = [];

    function getTime() {
      return spoofOn ? currentTime : self.real.dateNow();
    }

    var fakeDate = function() {
      var d = new self.real.Date();
      if (spoofOn) d.setTime(currentTime);

      if (!(this instanceof fakeDate))
        return d.toString();

      return d; //yeah, legal, it's an object
    };
    Date = fakeDate;
    Date.prototype = self.real.Date.prototype; //should fake instanceOf
    Date.now = getTime;
    performance.now = function() {
      return spoofOn ? nowStart + getTime() - timeStart : self.real.performanceNow.call(performance);
    };

    var addTimer = function(func, delta, repeat) {
      delta = Math.abs(delta);
      while (timers[tfirst]) tfirst++;
      ctimers.push(tfirst);

      if (!delta || self.excludeTimers && self.excludeTimers.indexOf(func) !== -1)
        timers[tfirst] = [self.real[delta ? 'setInterval' : 'setTimeout'](func, delta), Infinity, repeat ? delta : 0];
      else
        timers[tfirst] = [func, getTime() + delta, repeat ? delta : 0];

      return tfirst;
    };
    setTimeout = function(func, delta) {
      return addTimer(func, delta);
    };
    setInterval = function(func, delta) {
      return addTimer(func, delta, true);
    };

    clearInterval = clearTimeout = function(id) {
      if (id === null || !timers[id]) return;

      if (timers[id][1] === Infinity)
        self.real[timers[id][2] ? 'clearInterval' : 'clearTimeout'](timers[id][0]);
      timers[id] = null;
      tfirst = Math.min(tfirst, id);
      ctimers.splice(ctimers.indexOf(id), 1);
    };

    //who doesn't support nested workers? IE? FF? Nope, it's actually chrome.
    if (typeof Worker !== 'undefined') {
      Worker = function(url) {
        if (self.excludeWorkers.indexOf(url) !== -1) return new self.real.Worker(url);

        var worker = new self.real.Worker(MTC.jspath+'MTCWorker.js');
        worker.postMessage({
          MTCInit: true,
          spoofOn: spoofOn,
          url: url,
          currentTime: getTime()
        });
        workers.push(worker);
        return worker;
      };
      //we'll assign the prototype, however we'll overwrite instance things
      Worker.prototype = self.real.Worker.prototype;
    }

    var changingTime, desiredTime = 0;

    function setTime(newTime) {
      if (changingTime) {
        desiredTime = Math.max(newTime, desiredTime);
        return;
      }

      changingTime = true;
      desiredTime = newTime;
      var minimalTime = 0,
        t;
      while (minimalTime < desiredTime) {
        minimalTime = desiredTime;

        for (t = 0; t < ctimers.length; t++)
          if (timers[ctimers[t]][1] < desiredTime)
            minimalTime = Math.min(timers[ctimers[t]][1], minimalTime);

        currentTime = minimalTime;
        for (t = 0; t < ctimers.length; t++)
          if (timers[ctimers[t]][1] === currentTime) {
            if (typeof timers[ctimers[t]][0] === 'string')
              (1, eval)(timers[ctimers[t]][0]);
            else if (typeof timers[ctimers[t]][0] === 'function')
              timers[ctimers[t]][0]();

            if (timers[ctimers[t]][2])
              timers[ctimers[t]][1] = currentTime + timers[ctimers[t]][2];
            else
              clearTimeout(ctimers[t--]);
          }
      }

      for (var t = 0; t < workers.length; t++)
        workers[t].postMessage({
          MTCcmd: 'setTime',
          param: currentTime
        });

      changingTime = false;
    }
    this.setTime = setTime;

    function syncTime() {
      setTime(self.real.dateNow());
    }

    function toggleSpoofing(on) {
      if (on) {
        currentTime = timeStart = getTime();
        nowStart = performance.now();
        spoofOn = true;

        self.real.clearInterval(realTimeInterval);
        realTimeInterval = null;
      } else {
        spoofOn = false;
        if (realTimeInterval === null)
          realTimeInterval = self.real.setInterval(syncTime, 10);
      }

      for (var t = 0; t < workers.length; t++)
        workers[t].postMessage({
          MTCcmd: 'toggleSpoofing',
          param: on
        });

      return currentTime;
    };
    this.toggleSpoofing = toggleSpoofing;

    toggleSpoofing(spoofOn);
  };
  MTC.installTimeHook();
}