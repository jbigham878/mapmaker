const TILE_CACHE = 'mapmaker-tiles-v1'

const TILE_ORIGINS = [
  'basemaps.cartocdn.com',
  'tile.opentopomap.org',
  'arcgisonline.com',
]

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', e => {
  // Delete any old tile cache versions on activation
  e.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => n.startsWith('mapmaker-tiles-') && n !== TILE_CACHE)
            .map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  const isTile = TILE_ORIGINS.some(o => url.hostname.includes(o))
  if (!isTile) return

  e.respondWith(
    caches.open(TILE_CACHE).then(async cache => {
      const cached = await cache.match(e.request)
      if (cached) return cached

      try {
        const response = await fetch(e.request)
        if (response.ok || response.type === 'opaque') {
          cache.put(e.request, response.clone())
        }
        return response
      } catch {
        return new Response('', { status: 503 })
      }
    })
  )
})
