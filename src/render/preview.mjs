import { lanternSprites, fireflySprites, FF_HUES } from './sprites.mjs'
const cache = new Map()
let cachePal = null
function memo(pal, kind, def, make) {
if (cachePal !== pal) { cache.clear(); cachePal = pal }
const key = kind + ':' + (def ? def.id : 'x')
let v = cache.get(key)
if (!v) { v = make(); cache.set(key, v) }
return v
}
function isLocked(canvas, locked) {
if (locked !== undefined && locked !== null) return !!locked
try { return !!(canvas.closest && canvas.closest('.locked')) } catch { return false }
}
const silCache = new WeakMap()
function silhouette(img) {
let c = silCache.get(img)
if (c) return c
c = document.createElement('canvas')
c.width = img.width; c.height = img.height
const g = c.getContext('2d')
g.drawImage(img, 0, 0)
g.globalCompositeOperation = 'saturation'
g.fillStyle = '#9097a8'
g.fillRect(0, 0, c.width, c.height)
g.globalCompositeOperation = 'destination-in'
g.drawImage(img, 0, 0)
g.globalCompositeOperation = 'source-over'
silCache.set(img, c)
return c
}
function padlock(ctx, w, h) {
const k = Math.max(0.8, Math.min(w, h) / 44)
const x = w - 14 * k, y = h - 13 * k
ctx.globalCompositeOperation = 'source-over'
ctx.globalAlpha = 1
ctx.lineWidth = 2 * k
ctx.strokeStyle = 'rgba(8,10,24,0.9)'
ctx.fillStyle = 'rgba(8,10,24,0.9)'
ctx.beginPath(); ctx.arc(x, y - 1.5 * k, 4 * k, Math.PI, 0); ctx.stroke()
ctx.fillRect(x - 6 * k, y - 1.5 * k, 12 * k, 9.5 * k)
ctx.strokeStyle = '#e9ecff'
ctx.fillStyle = '#e9ecff'
ctx.lineWidth = 1.5 * k
ctx.beginPath(); ctx.arc(x, y - 1.5 * k, 3.6 * k, Math.PI, 0); ctx.stroke()
ctx.fillRect(x - 5 * k, y - 0.5 * k, 10 * k, 7.5 * k)
ctx.fillStyle = 'rgba(8,10,24,0.9)'
ctx.beginPath(); ctx.arc(x, y + 2.6 * k, 1.2 * k, 0, Math.PI * 2); ctx.fill()
}
function prep(canvas) {
const ctx = canvas.getContext('2d')
const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2)
const w = canvas.clientWidth || canvas.cssW || 64, h = canvas.clientHeight || canvas.cssH || 64
if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr) }
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
ctx.clearRect(0, 0, w, h)
ctx.globalCompositeOperation = 'source-over'
ctx.fillStyle = 'rgba(8,10,24,0.85)'
ctx.fillRect(0, 0, w, h)
ctx.globalCompositeOperation = 'lighter'
return { ctx, w, h }
}
function lantern(ctx, spr, x, y, k, time, reduced) {
const fl = reduced ? 1 : 1 + 0.035 * Math.sin(time * 13.1) + 0.025 * Math.sin(time * 21.7 + 1.3)
const hr = 52 * k * 1.12
ctx.globalAlpha = 0.62 * fl
ctx.drawImage(spr.halo, x - hr, y - hr, hr * 2, hr * 2)
ctx.globalAlpha = 0.6 * fl
ctx.drawImage(spr.glow, x - 24 * k, y - 24 * k, 48 * k, 48 * k)
const sx = reduced ? 1 : 1 + 0.045 * Math.sin(time * 11.3 + 1.1), sy = reduced ? 1 : 1 + 0.07 * Math.sin(time * 9.7)
ctx.globalAlpha = 1
ctx.drawImage(spr.flame, x - 17 * k * sx, y - (17 * sy + 1) * k, 34 * k * sx, 34 * k * sy)
}
function firefly(ctx, rows, hue, x, y, k, time, reduced, i) {
const wing = reduced ? 1 : [0, 1, 2, 1][(Math.floor(time * 13) + i) & 3]
ctx.globalAlpha = reduced ? 1 : 0.82 + 0.18 * Math.sin(time * (3.6 + i * 0.4) + i * 2.1)
ctx.drawImage(rows[hue][wing], x - 12 * k, y - 12 * k, 24 * k, 24 * k)
}
function lanternLocked(ctx, spr, x, y, k) {
const flame = silhouette(spr.flame), glow = silhouette(spr.glow)
ctx.globalAlpha = 0.5
ctx.drawImage(glow, x - 24 * k, y - 24 * k, 48 * k, 48 * k)
for (let i = 0; i < 2; i++) { ctx.globalAlpha = 0.95; ctx.drawImage(flame, x - 17 * k, y - 18 * k, 34 * k, 34 * k) }
}
export function drawLanternPreview(canvas, pal, def, time = 0, reduced = false, locked) {
const spr = memo(pal, 'lantern', def, () => lanternSprites(pal, def))
const { ctx, w, h } = prep(canvas)
if (isLocked(canvas, locked)) { lanternLocked(ctx, spr, w / 2, h / 2, Math.min(w, h) / 50); padlock(ctx, w, h); return }
lantern(ctx, spr, w / 2, h / 2, Math.min(w, h) / 62, time, reduced)
ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
}
export function drawFireflyPreview(canvas, pal, def, time = 0, reduced = false, locked) {
const rows = memo(pal, 'fireflies', def, () => fireflySprites(pal, def))
const { ctx, w, h } = prep(canvas)
const k = Math.min(w / (FF_HUES * 22), h / 30)
if (isLocked(canvas, locked)) {
for (let i = 0; i < FF_HUES; i++) {
const sil = silhouette(rows[i][1])
for (let j = 0; j < 2; j++) { ctx.globalAlpha = 0.8; ctx.drawImage(sil, (w * (i + 0.5)) / FF_HUES - 12 * k, h / 2 - 12 * k, 24 * k, 24 * k) }
}
padlock(ctx, w, h)
return
}
for (let i = 0; i < FF_HUES; i++) firefly(ctx, rows, i, (w * (i + 0.5)) / FF_HUES, h / 2 + (reduced ? 0 : Math.sin(time * 1.6 + i) * 2), k, time, reduced, i)
ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
}
export function drawComboPreview(canvas, pal, lanternDef, fireflyDef, time = 0, reduced = false) {
const ls = memo(pal, 'lantern', lanternDef, () => lanternSprites(pal, lanternDef))
const rows = memo(pal, 'fireflies', fireflyDef, () => fireflySprites(pal, fireflyDef))
const { ctx, w, h } = prep(canvas)
const cx = w / 2, cy = h / 2, k = Math.min(w, h) / 70
const n = 9
for (let i = 0; i < n; i++) {
const a = i * 2.39996 + (reduced ? 0 : time * 0.5)
const r = (10 + 3.2 * Math.sqrt(i + 1) * 2.4) * k * (reduced ? 1 : 1 + 0.06 * Math.sin(time * 1.3 + i))
firefly(ctx, rows, i % FF_HUES, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, k * 0.8, time, reduced, i)
}
lantern(ctx, ls, cx, cy, k, time, reduced)
ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
}
