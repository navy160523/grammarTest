const scope = new URL(self.registration.scope)
const prefix = 'grammar-300:' + scope.pathname + ':'
const cacheName = prefix + version
const urlFor = path => new URL(path, scope).href
const home = urlFor('index.html')
const cachedUrls = new Set(files.map(urlFor))

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(
    [...cachedUrls].map(url => new Request(url, { cache: 'reload' })),
  )))
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(prefix) && key !== cacheName) await caches.delete(key)
    }
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  const appNavigation = event.request.mode === 'navigate' &&
    url.origin === scope.origin &&
    (url.pathname === scope.pathname || url.pathname === new URL(home).pathname)
  const cachedUrl = appNavigation ? home : url.href
  if (!cachedUrls.has(cachedUrl)) return

  event.respondWith((async () => {
    const cache = await caches.open(cacheName)
    return (await cache.match(cachedUrl)) || fetch(event.request)
  })())
})
