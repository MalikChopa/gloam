const BUILD = 4
const CACHE = 'gloam-' + BUILD + '-01a5dbf8'
const PRECACHE = [
'./',
'./index.html',
'./style.css',
'./manifest.webmanifest',
'./icons/icon-192.png',
'./icons/icon-512.png',
'./src/main.mjs',
'./src/platform/a11y.mjs',
'./src/platform/audio.mjs',
'./src/platform/ghostrun.mjs',
'./src/platform/haptics.mjs',
'./src/platform/i18n.mjs',
'./src/platform/input.mjs',
'./src/platform/juice.mjs',
'./src/platform/loop.mjs',
'./src/platform/music.mjs',
'./src/platform/net.mjs',
'./src/platform/pwa.mjs',
'./src/platform/share.mjs',
'./src/platform/storage.mjs',
'./src/render/debug.mjs',
'./src/render/ghost.mjs',
'./src/render/hud.mjs',
'./src/render/palette.mjs',
'./src/render/particles.mjs',
'./src/render/preview.mjs',
'./src/render/renderer.mjs',
'./src/render/sprites.mjs',
'./src/shared/achievements.mjs',
'./src/shared/biomes.mjs',
'./src/shared/daily.mjs',
'./src/shared/flags.mjs',
'./src/shared/ghost.mjs',
'./src/shared/hint.mjs',
'./src/shared/skins.mjs',
'./src/shared/version.mjs',
'./src/sim/bot.mjs',
'./src/sim/events.mjs',
'./src/sim/generator.mjs',
'./src/sim/golden.mjs',
'./src/sim/hazards.mjs',
'./src/sim/index.mjs',
'./src/sim/params.mjs',
'./src/sim/replay.mjs',
'./src/sim/rng.mjs',
'./src/sim/step.mjs',
'./src/sim/swarm.mjs',
'./src/sim/trig.mjs',
'./src/ui/screens.mjs',
]
function matchPrecache(url, list, scope) {
let u, base
try { base = new URL(scope || 'http://x/'); u = new URL(url, base) } catch (e) { return null }
if (u.origin !== base.origin) return null
if (!u.pathname.startsWith(base.pathname)) return null
let rel = u.pathname.slice(base.pathname.length)
if (rel === '' || rel === 'index.html') rel = 'index.html'
for (let i = 0; i < list.length; i++) {
const e = list[i] === './' ? 'index.html' : list[i].replace(/^\.\//, '')
if (e === rel) return list[i]
}
return null
}
self.addEventListener('install', (event) => {
self.skipWaiting()
event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE.map((p) => new Request(p, { cache: 'reload' })))))
})
self.addEventListener('activate', (event) => {
event.waitUntil(
caches.keys()
.then((keys) => Promise.all(keys.filter((k) => k.startsWith('gloam-') && k !== CACHE).map((k) => caches.delete(k))))
.then(() => self.clients.claim())
)
})
self.addEventListener('fetch', (event) => {
const req = event.request
if (req.method !== 'GET') return
const url = new URL(req.url)
if (url.origin !== self.location.origin) return
if (url.pathname.indexOf('/api/') >= 0 || url.pathname.endsWith('/api')) return
if (req.mode === 'navigate') {
event.respondWith(
caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html')).then((hit) => hit || fetch(req))
)
return
}
event.respondWith(
caches.match(req).then((hit) => hit || fetch(req).then((res) => {
if (res && res.ok && matchPrecache(req.url, PRECACHE, self.registration.scope)) {
const copy = res.clone()
caches.open(CACHE).then((c) => c.put(req, copy))
}
return res
}))
)
})
