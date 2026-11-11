export const GHOST_COLOR = '#dfe9ee'
export const GHOST_ALPHA = 0.42
const TAU = Math.PI * 2
const PX = 2
function makeCanvas(size) {
const c = document.createElement('canvas')
c.width = c.height = size
return c
}
function rgbaOf(hex, a) {
const n = parseInt(hex.slice(1), 16)
return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'
}
export function createGhostSprites() {
const ring = makeCanvas(34 * PX)
{
const g = ring.getContext('2d')
g.scale(PX, PX)
g.strokeStyle = rgbaOf(GHOST_COLOR, 0.95)
g.lineWidth = 1.6
g.beginPath(); g.arc(17, 17, 10.5, 0, TAU); g.stroke()
g.fillStyle = rgbaOf(GHOST_COLOR, 0.9)
g.beginPath(); g.arc(17, 17, 2.6, 0, TAU); g.fill()
}
const halo = makeCanvas(60 * PX)
{
const g = halo.getContext('2d')
const r = 30 * PX
const grad = g.createRadialGradient(r, r, 0, r, r, r)
grad.addColorStop(0, rgbaOf(GHOST_COLOR, 0.5))
grad.addColorStop(0.45, rgbaOf(GHOST_COLOR, 0.14))
grad.addColorStop(1, rgbaOf(GHOST_COLOR, 0))
g.fillStyle = grad
g.fillRect(0, 0, 60 * PX, 60 * PX)
}
const diamond = makeCanvas(14 * PX)
{
const g = diamond.getContext('2d')
g.scale(PX, PX)
g.strokeStyle = rgbaOf(GHOST_COLOR, 0.95)
g.lineWidth = 1.4
g.beginPath(); g.moveTo(7, 1.5); g.lineTo(12.5, 7); g.lineTo(7, 12.5); g.lineTo(1.5, 7); g.closePath(); g.stroke()
}
return { ring, halo, diamond }
}
export function drawGhost(ctx, sprites, g, alpha, time) {
const lx = g.px + (g.x - g.px) * alpha, ly = g.py + (g.y - g.py) * alpha
const cx = g.pcx + (g.cx - g.pcx) * alpha, cy = g.pcy + (g.cy - g.pcy) * alpha
const a = (g.fade === undefined ? 1 : g.fade) * GHOST_ALPHA * (0.9 + 0.1 * Math.sin(time * 2.2))
if (!(a > 0.01)) return 0
let n = 0
ctx.globalCompositeOperation = 'lighter'
ctx.globalAlpha = a * 0.7
ctx.drawImage(sprites.halo, lx - 30, ly - 30, 60, 60); n++
ctx.globalCompositeOperation = 'source-over'
ctx.globalAlpha = a
ctx.drawImage(sprites.ring, lx - 17, ly - 17, 34, 34); n++
if (g.alive > 0) {
ctx.drawImage(sprites.diamond, cx - 7, cy - 7, 14, 14); n++
}
ctx.globalAlpha = 1
return n
}
