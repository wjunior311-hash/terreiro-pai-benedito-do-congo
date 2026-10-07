const CACHE='tpbc-v1';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});
// Avisos no celular (push)
self.addEventListener('push',e=>{
  let d={};
  try{d=e.data?e.data.json():{}}catch(_){d={body:e.data&&e.data.text()}}
  const title=d.title||'Terreiro Pai Benedito do Congo';
  e.waitUntil(self.registration.showNotification(title,{
    body:d.body||'',
    tag:d.tag||undefined,
    icon:'/terreiro-pai-benedito-do-congo/logo.jpg',
    badge:'/terreiro-pai-benedito-do-congo/logo.jpg',
    data:{url:d.url||self.registration.scope}
  }));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||self.registration.scope;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){
      if(c.url.startsWith(self.registration.scope)){
        c.postMessage({type:'abrir',url});
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
