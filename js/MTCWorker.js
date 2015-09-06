importScripts('MTC.js')

addEventListener('message', function(e) {
  if (typeof e.data === 'object' && e.data !== null && e.data.MTCInit) {
    MTC.toggleSpoofing(e.data.spoofOn);
    MTC.setTime(e.data.currentTime);
    importScripts(e.data.url);
  }

  if (typeof e.data === 'object' && e.data !== null && e.data.MTCcmd)
    MTC[e.data.MTCcmd](e.data.param);

  if (typeof e.data === 'object' && e.data !== null && (e.data.MTCcmd || e.data.MTCInit))
    e.stopImmediatePropagation();
}, true);