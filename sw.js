var CACHE = 'float-v2';
var ASSETS = ['./', './index.html', './manifest.json', './firebase-config.js', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS).catch(function(){}); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ if(k !== CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

function isAppShell(req){
  if(req.mode === 'navigate') return true;
  var u = new URL(req.url);
  return /\/(index\.html|firebase-config\.js|manifest\.json)?$/.test(u.pathname) || /firebase-config\.js$/.test(u.pathname);
}

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  var sameOrigin = new URL(e.request.url).origin === self.location.origin;
  if(!sameOrigin) return;

  // The app itself: always try the network first so a new upload shows up straight away;
  // fall back to the saved copy only when offline.
  if(isAppShell(e.request)){
    e.respondWith(
      fetch(e.request).then(function(res){
        if(res && res.status === 200){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(e.request).then(function(hit){ return hit || caches.match('./index.html'); });
      })
    );
    return;
  }

  // Icons and other static files: saved copy first, network to fill gaps.
  e.respondWith(
    caches.match(e.request).then(function(hit){
      if(hit) return hit;
      return fetch(e.request).then(function(res){
        if(res && res.status === 200 && res.type === 'basic'){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      });
    })
  );
});
