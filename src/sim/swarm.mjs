import {
LANTERN_ZONE, LANTERN_V, LANTERN_KEY_ACC, LANTERN_KEY_V, LANTERN_KEY_FRICTION,
SWARM_MAX, SWARM_R_BASE, SWARM_R_PER, SWARM_R_MIN, FOLLOW_K, DAMPING, LEASH_R, LEASH_K,
SEP_R, SEP_K, FIREFLY_VMAX, VIEW_W, CURRENT_F,
} from './params.mjs'
import { listCurrents } from './hazards.mjs'
import { sinT, cosT } from './trig.mjs'
function slotAngle(i, tick) {
const sens = (i & 1) ? -1 : 1
return (i * 97 + sens * (tick >> 2)) & 255
}
function slotRadius(i, rSwarm) {
return SWARM_R_MIN + ((i % 5) / 4) * (rSwarm - SWARM_R_MIN)
}
export function initSwarm(s, n) {
const rSwarm = SWARM_R_BASE + SWARM_R_PER * n
for (let i = 0; i < SWARM_MAX; i++) {
s.alive[i] = 0
s.fx[i] = 0
s.fy[i] = 0
s.fvx[i] = 0
s.fvy[i] = 0
}
for (let i = 0; i < n; i++) {
const a = slotAngle(i, s.tick)
const r = slotRadius(i, rSwarm)
s.alive[i] = 1
s.fx[i] = s.lantern.x + cosT(a) * r
s.fy[i] = s.lantern.y + sinT(a) * r
}
s.count = n
}
export function addFirefly(s, x, y) {
for (let i = 0; i < SWARM_MAX; i++) {
if (!s.alive[i]) {
s.alive[i] = 1
s.fx[i] = x
s.fy[i] = y
s.fvx[i] = 0
s.fvy[i] = 0
s.count++
return i
}
}
return -1
}
export function updateLantern(s, input) {
const L = s.lantern
if (input.hasTarget) {
s.lvx = 0
s.lvy = 0
const dx = input.tx - L.x
const dy = input.ty - L.y
const d2 = dx * dx + dy * dy
if (d2 <= LANTERN_V * LANTERN_V) {
L.x = input.tx
L.y = input.ty
} else {
const d = Math.sqrt(d2)
L.x += (dx / d) * LANTERN_V
L.y += (dy / d) * LANTERN_V
}
} else {
let vx = s.lvx
let vy = s.lvy
if (input.dx !== 0) vx += input.dx * LANTERN_KEY_ACC
else vx *= LANTERN_KEY_FRICTION
if (input.dy !== 0) vy += input.dy * LANTERN_KEY_ACC
else vy *= LANTERN_KEY_FRICTION
const v2 = vx * vx + vy * vy
if (v2 > LANTERN_KEY_V * LANTERN_KEY_V) {
const k = LANTERN_KEY_V / Math.sqrt(v2)
vx *= k
vy *= k
}
if (vx < 0.05 && vx > -0.05 && input.dx === 0) vx = 0
if (vy < 0.05 && vy > -0.05 && input.dy === 0) vy = 0
s.lvx = vx
s.lvy = vy
L.x += vx
L.y += vy
}
if (L.x < LANTERN_ZONE.x0) { L.x = LANTERN_ZONE.x0; s.lvx = 0 }
else if (L.x > LANTERN_ZONE.x1) { L.x = LANTERN_ZONE.x1; s.lvx = 0 }
if (L.y < LANTERN_ZONE.y0) { L.y = LANTERN_ZONE.y0; s.lvy = 0 }
else if (L.y > LANTERN_ZONE.y1) { L.y = LANTERN_ZONE.y1; s.lvy = 0 }
}
export function updateSwarm(s) {
const n = s.count
if (n === 0) return
const rSwarm = SWARM_R_BASE + SWARM_R_PER * n
const lx = s.lantern.x
const ly = s.lantern.y
const fx = s.fx
const fy = s.fy
const vxs = s.fvx
const vys = s.fvy
const alive = s.alive
const sep2 = SEP_R * SEP_R
const vmax2 = FIREFLY_VMAX * FIREFLY_VMAX
const tick = s.tick
const nCur = listCurrents(s)
const wind = s.windF
for (let i = 0; i < SWARM_MAX; i++) {
if (!alive[i]) continue
const a = slotAngle(i, tick)
const r = slotRadius(i, rSwarm)
const ex = lx + cosT(a) * r - fx[i]
const ey = ly + sinT(a) * r - fy[i]
let vx = vxs[i] + ex * FOLLOW_K
let vy = vys[i] + ey * FOLLOW_K
const e2 = ex * ex + ey * ey
if (e2 > LEASH_R * LEASH_R) {
const e = Math.sqrt(e2)
const f = ((e - LEASH_R) * LEASH_K) / e
vx += ex * f
vy += ey * f
}
const px = fx[i]
const py = fy[i]
for (let j = 0; j < SWARM_MAX; j++) {
if (j === i || !alive[j]) continue
const dx = px - fx[j]
const dy = py - fy[j]
const d2 = dx * dx + dy * dy
if (d2 < sep2) {
const k = SEP_K / (d2 + 1)
vx += dx * k
vy += dy * k
}
}
for (let c = 0; c < nCur; c++) {
const cu = s.hazards[s.curIdx[c]]
const hw = cu.w / 2
if (px >= cu.x - hw && px <= cu.x + hw && py >= cu.y && py <= cu.y + cu.h) vx += CURRENT_F * cu.sens
}
vx += wind
vx *= DAMPING
vy *= DAMPING
const v2 = vx * vx + vy * vy
if (v2 > vmax2) {
const k = FIREFLY_VMAX / Math.sqrt(v2)
vx *= k
vy *= k
}
vxs[i] = vx
vys[i] = vy
let nx = px + vx
if (nx < 0) nx = 0
else if (nx > VIEW_W) nx = VIEW_W
fx[i] = nx
fy[i] = py + vy
}
}
