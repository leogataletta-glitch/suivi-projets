/* Cache public assets and the encrypted application only. No API requests,
   decrypted documents, photos, keys or personal journal entries are cached here. */
const CACHE='leo-install-v1';
const ASSETS=['./','index.html','manifest.webmanifest','pwa-client.js','app.enc.json',
 'weight-compact.css?v=7','weight-daily.js?v=1','food-catalog.js?v=2','food-library.js?v=3',
 'icons/app-192.png','icons/app-512.png','icons/app-maskable-512.png'];
const allowed=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).pathname));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('leo-install-')&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!allowed.has(url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{const response=await fetch(request);if(response.ok){try{await cache.put(request,response.clone())}catch{}}return response}
  catch(error){const cached=await cache.match(request);if(cached)return cached;if(request.mode==='navigate'){const shell=await cache.match('./');if(shell)return shell}throw error}
 })());
});
