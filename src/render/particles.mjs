import { rgba } from './palette.mjs'
export const PARTICLE_MAX = 300
export const PK = { LOST: 0, NEAR: 1, GOLD: 2, PALE: 3, DUST: 4, DEATH: 5, CONFETTI: 6 }
const STRIDE = 8
const X = 0, Y = 1, VX = 2, VY = 3, LIFE = 4, DECAY = 5, SIZE = 6, KIND = 7
const TAU = Math.PI * 2
const SPEC = [
{ v0: 0.5, v1: 2.4, ms0: 450, ms1: 800, s0: 9, s1: 15 },
{ v0: 0.4, v1: 1.8, ms0: 400, ms1: 650, s0: 8, s1: 13 },
{ v0: 0.3, v1: 1.5, ms0: 450, ms1: 750, s0: 8, s1: 13 },
{ v0: 1.5, v1: 4.5, ms0: 350, ms1: 650, s0: 8, s1: 14 },
{ v0: 0.1, v1: 0.7, ms0: 500, ms1: 900, s0: 5, s1: 9 },
{ v0: 0.8, v1: 4.0, ms0: 600, ms1: 1100, s0: 10, s1: 18 },
{ v0: 1.0, v1: 3.0, ms0: 700, ms1: 1000, s0: 6, s1: 9 },
]
function makeCanvas(size) {
const c = document.createElement('canvas')
c.width = c.height = size
return c
}
function dot(col) {
const c = makeCanvas(32)
const g = c.getContext('2d')
const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16)
grad.addColorStop(0, rgba('#ffffff', 0.95))
grad.addColorStop(0.25, rgba(col, 0.95))
grad.addColorStop(0.6, rgba(col, 0.3))
grad.addColorStop(1, rgba(col, 0))
g.fillStyle = grad
g.fillRect(0, 0, 32, 32)
return c
}
export function makeDots(pal) {
return {
amber: dot(pal.fireHalo), magenta: dot(pal.danger), turq: dot(pal.accent),
gold: dot(pal.fireCore), pale: dot('#fff2c4'), dust: dot(pal.textDim), rose: dot('#ff9bc0'),
}
}
export function createParticles(max = PARTICLE_MAX, pal) {
const data = new Float32Array(max * STRIDE)
let next = 0
let active = 0
let maxActive = 0
let budget = 1
let spr = null
function sprites() {
if (spr || !pal) return spr
spr = makeDots(pal)
return spr
}
function emit(kind, x, y, n) {
const spec = SPEC[kind]
const count = Math.max(0, Math.round(n * budget))
for (let k = 0; k < count; k++) {
const o = next * STRIDE
next = (next + 1) % max
const a = Math.random() * TAU
const v = spec.v0 + Math.random() * (spec.v1 - spec.v0)
const ms = spec.ms0 + Math.random() * (spec.ms1 - spec.ms0)
data[o + X] = x
data[o + Y] = y
data[o + VX] = Math.cos(a) * v
data[o + VY] = Math.sin(a) * v - (kind === PK.GOLD ? 0.4 : 0)
data[o + LIFE] = 1
data[o + DECAY] = 1 / ms
data[o + SIZE] = spec.s0 + Math.random() * (spec.s1 - spec.s0)
data[o + KIND] = kind
}
}
function update(ms) {
if (ms > 100) ms = 100
if (ms <= 0) return
const k = ms / 16.667
const drag = Math.pow(0.95, k)
let n = 0
for (let i = 0; i < max; i++) {
const o = i * STRIDE
let life = data[o + LIFE]
if (life <= 0) continue
life -= data[o + DECAY] * ms
if (life <= 0) { data[o + LIFE] = 0; continue }
data[o + LIFE] = life
data[o + X] += data[o + VX] * k
data[o + Y] += data[o + VY] * k
data[o + VX] *= drag
data[o + VY] *= drag
n++
}
active = n
if (n > maxActive) maxActive = n
}
function draw(ctx) {
const sp = sprites()
if (!sp) return
ctx.globalCompositeOperation = 'lighter'
for (let i = 0; i < max; i++) {
const o = i * STRIDE
const life = data[o + LIFE]
if (life <= 0) continue
const kind = data[o + KIND]
let img
if (kind === PK.LOST) img = life > 0.5 ? ((i & 1) ? sp.gold : sp.amber) : sp.magenta
else if (kind === PK.NEAR) img = sp.turq
else if (kind === PK.GOLD) img = sp.gold
else if (kind === PK.PALE) img = sp.pale
else if (kind === PK.DEATH) img = life > 0.6 ? sp.pale : life > 0.3 ? ((i & 1) ? sp.gold : sp.amber) : sp.magenta
else if (kind === PK.CONFETTI) img = (i & 1) ? sp.turq : (i & 2) ? sp.gold : sp.rose
else img = sp.dust
const s = data[o + SIZE] * (0.55 + 0.45 * life)
ctx.globalAlpha = life > 0.25 ? 1 : life * 4
ctx.drawImage(img, data[o + X] - s / 2, data[o + Y] - s / 2, s, s)
}
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
}
return {
emit, update, draw,
clear() { data.fill(0); active = 0 },
setBudget(b) { budget = b },
setPalette(p) { pal = p; spr = null },
get budget() { return budget },
get active() { return active },
get maxActive() { return maxActive },
get capacity() { return max },
resetMax() { maxActive = active },
}
}
