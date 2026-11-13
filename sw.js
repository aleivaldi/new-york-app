var V='ny-2026-11-13-3';
var CORE=['./','./index.html','./app.css','./app.js','./data.js','./manifest.webmanifest',
 './leaflet.css','./leaflet.js','./icon-192.png','./icon-512.png'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(V).then(function(c){
    return Promise.all(CORE.map(function(u){ return c.add(u).catch(function(){}); }));
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(k){
    return Promise.all(k.filter(function(x){return x!==V;}).map(function(x){return caches.delete(x);}));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch',function(e){
  var r=e.request; if(r.method!=='GET') return;
  var u=new URL(r.url);
  var runtime = /tile\.openstreetmap\.org|upload\.wikimedia\.org|wikipedia\.org|fonts\.(googleapis|gstatic)\.com/.test(u.host+u.pathname);
  e.respondWith(
    caches.match(r).then(function(hit){
      if(hit) return hit;
      return fetch(r).then(function(res){
        if(res && (res.ok||res.type==='opaque') && (runtime || u.origin===location.origin)){
          var cp=res.clone(); caches.open(V).then(function(c){ c.put(r,cp).catch(function(){}); });
        }
        return res;
      }).catch(function(){
        if(r.mode==='navigate') return caches.match('./index.html');
        return new Response('',{status:504});
      });
    })
  );
});
