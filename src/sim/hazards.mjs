import {
HAZARD_POOL, SWARM_MAX, FIREFLY_R, FLARE_R, VIEW_W, VIEW_H, SPAWN_Y, REMOVE_Y, HAZARD_DESPAWN, EV,
T_CURRENT, T_BAT, T_MOTH, T_GATE, NEAR_DIST_BAT,
CURRENT_H, BAT_WARN_TICKS, BAT_ENTRY_X, BAT_ACC, BAT_R, BAT_BITE_DELAY, BAT_CHEW, batBitesMax, BAT_LIFE,
BAT_LEAVE_V, BAT_FLEE, BAT_FLEE_MULT, BAT_REPEL_RAW, BAT_V,
MOTH_ZIG, MOTH_ZIG_STEP, MOTH_R, MOTH_CONTACT, MOTH_EAT_TICKS, MOTH_BITES_MAX, MOTH_BURN_RAW, MOTH_V,
GATE_H, GATE_OPEN, GATE_PERIOD, GATE_OPEN_T, GATE_WARN, GATE_CLOSE_T, GATE_SHUT_T, GATE_REOPEN_T, GATE_GRACE, GATE_REF_Y,
T_PULSE, T_BOLT, BRAMBLE_H, PULSE_PERIOD, PULSE_ON_T, PULSE_WARN, PULSE_REF_Y,
BOLT_WARN_T, BOLT_STRIKE_T, BOLT_HW, BOLT_REF_Y, BOLT_NEAR, LANTERN_ZONE,
scrollAt,
} from './params.mjs'
import { sinT } from './trig.mjs'
import { pushEvent, nearMiss, loseFirefly } from './events.mjs'
export const BAT_WARN = 0
export const BAT_CHASE = 1
export const BAT_FLEEING = 2
export const BAT_LEAVING = 3
export function makeHazard() {
return {
active: 0, type: 0, chunk: 0, x: 0, y: 0, w: 0, h: 0,
px: 0, py: 0, vx: 0, vy: 0, age: 0, st: 0, n: 0, c: 0, d: 0, sens: 0, ph: 0, o: 0, tr: 0,
nm: 1e9, nmx: 0, nmy: 0, seen: 0, hit: 0, done: 0,
gl: 0,
}
}
export function allocHazard(s) {
for (let i = 0; i < HAZARD_POOL; i++) if (!s.hazards[i].active) return i
return -1
}
function claim(s, type, chunk) {
const i = allocHazard(s)
if (i < 0) { s.poolOverflow = true; return null }
const h = s.hazards[i]
h.active = 1
h.type = type
h.chunk = chunk
h.x = 0; h.y = 0; h.w = 0; h.h = 0; h.px = 0; h.py = 0; h.vx = 0; h.vy = 0
h.age = 0; h.st = 0; h.n = 0; h.c = 0; h.d = 0; h.sens = 0; h.ph = 0; h.o = 0; h.tr = 0
h.nm = 1e9; h.nmx = 0; h.nmy = 0; h.seen = 0; h.hit = 0; h.done = 0; h.gl = 0
return h
}
export function placeCurrent(s, chunk, cx, w, sens, y) {
const h = claim(s, T_CURRENT, chunk)
if (!h) return -1
h.x = cx; h.y = y; h.px = cx; h.py = y; h.w = w; h.h = CURRENT_H; h.sens = sens
return 0
}
export function batMarkerX(side) { return side ? VIEW_W - BAT_ENTRY_X : BAT_ENTRY_X }
export function placeBat(s, chunk, side, y, active) {
const h = claim(s, T_BAT, chunk)
if (!h) return -1
h.x = side ? VIEW_W + 20 : -20
h.y = y; h.px = h.x; h.py = y
h.sens = side ? 1 : -1
if (active) { h.st = BAT_CHASE; h.age = BAT_WARN_TICKS }
else pushEvent(s, EV.BAT_WARN, batMarkerX(side), y, side)
return 0
}
export function placeMoth(s, chunk, x, zig, y) {
const h = claim(s, T_MOTH, chunk)
if (!h) return -1
h.x = x; h.y = y; h.px = x; h.py = y; h.ph = zig
return 0
}
export function gateOpening(phase) {
let p = phase
if (p < GATE_OPEN_T) return GATE_OPEN
p -= GATE_OPEN_T
if (p < GATE_CLOSE_T) return GATE_OPEN * (1 - p / GATE_CLOSE_T)
p -= GATE_CLOSE_T
if (p < GATE_SHUT_T) return 0
p -= GATE_SHUT_T
return GATE_OPEN * (p / GATE_REOPEN_T)
}
export function gatePhaseFor(t0, y0) {
let y = y0
let a = 0
while (y < GATE_REF_Y && a < 4000) { a++; y += scrollAt(t0 + a) }
const mid = GATE_OPEN_T / 2
let ph = (mid - a) % GATE_PERIOD
if (ph < 0) ph += GATE_PERIOD
return ph
}
function gateUpdate(s, h) {
const phase = (h.ph + h.age) % GATE_PERIOD
h.o = gateOpening(phase)
h.w = phase >= GATE_OPEN_T && phase < GATE_OPEN_T + GATE_GRACE ? GATE_OPEN : h.o
h.tr = phase >= GATE_OPEN_T - GATE_WARN && phase < GATE_OPEN_T ? 1 : 0
if (phase === GATE_OPEN_T - GATE_WARN && h.y + GATE_H > 0 && h.y < VIEW_H) pushEvent(s, EV.GATE_WARN, h.x, h.y, 0)
}
export function placeGate(s, chunk, cx, y, ph) {
const h = claim(s, T_GATE, chunk)
if (!h) return -1
h.x = cx; h.y = y; h.px = cx; h.py = y; h.h = GATE_H; h.ph = ph
gateUpdate(s, h)
return 0
}
export const PULSE_MID_OFF = PULSE_ON_T + ((PULSE_PERIOD - PULSE_ON_T) >> 1)
export function pulsePhaseFor(t0, y0) {
let y = y0
let a = 0
while (y < PULSE_REF_Y && a < 4000) { a++; y += scrollAt(t0 + a) }
let ph = (PULSE_MID_OFF - a) % PULSE_PERIOD
if (ph < 0) ph += PULSE_PERIOD
return ph
}
function pulseUpdate(s, h) {
const phase = (h.ph + h.age) % PULSE_PERIOD
h.st = phase < PULSE_ON_T ? 1 : 0
h.tr = phase >= PULSE_PERIOD - PULSE_WARN ? 1 : 0
h.o = phase / PULSE_PERIOD
if (phase === 0 && h.age > 0 && h.y + BRAMBLE_H > 0 && h.y < VIEW_H) pushEvent(s, EV.PULSE_ON, h.x, h.y, 0)
}
export function placePulse(s, chunk, cx, w, y, ph) {
const h = claim(s, T_PULSE, chunk)
if (!h) return -1
h.x = cx; h.y = y; h.px = cx; h.py = y; h.w = w; h.h = BRAMBLE_H; h.ph = ph; h.c = 1e9
pulseUpdate(s, h)
return 0
}
export function boltDelayFor(t0, yc) {
let y = yc
let a = 0
while (y < BOLT_REF_Y && a < 4000) { a++; y += scrollAt(t0 + a) }
const d = a - BOLT_WARN_T - (BOLT_STRIKE_T >> 1)
return d > 1 ? d : 1
}
export const BOLT_WAIT = 0
export const BOLT_WARNING = 1
export const BOLT_STRIKE = 2
export function placeBolt(s, chunk, yc, delay, off) {
const h = claim(s, T_BOLT, chunk)
if (!h) return -1
h.y = yc; h.py = yc; h.d = delay; h.sens = off; h.w = 2 * BOLT_HW; h.h = 0; h.nm = 1e9
return 0
}
function boltUpdate(s, h) {
if (h.st === BOLT_WAIT) {
h.d--
if (h.d > 0) return
let x = s.lantern.x + h.sens
if (x < LANTERN_ZONE.x0) x = LANTERN_ZONE.x0
else if (x > LANTERN_ZONE.x1) x = LANTERN_ZONE.x1
h.x = x; h.px = x
h.st = BOLT_WARNING; h.c = 0; h.o = 0
pushEvent(s, EV.BOLT_WARN, x, 0, BOLT_WARN_T)
} else if (h.st === BOLT_WARNING) {
h.c++
h.o = h.c / BOLT_WARN_T
if (h.c >= BOLT_WARN_T) {
h.st = BOLT_STRIKE; h.c = 0; h.o = 0
pushEvent(s, EV.BOLT_HIT, h.x, s.lantern.y, 0)
}
} else {
h.c++
h.o = h.c / BOLT_STRIKE_T
if (h.c >= BOLT_STRIKE_T) {
if (!h.hit && h.nm < BOLT_NEAR) nearMiss(s, h.nmx, h.nmy)
h.active = 0
}
}
}
export function collideBolts(s) {
const lethal = BOLT_HW + FIREFLY_R
for (let k = 0; k < HAZARD_POOL; k++) {
const h = s.hazards[k]
if (!h.active || h.type !== T_BOLT || h.st !== BOLT_STRIKE) continue
for (let i = 0; i < SWARM_MAX; i++) {
if (!s.alive[i]) continue
let dx = s.fx[i] - h.x
if (dx < 0) dx = -dx
if (dx < lethal) {
h.hit = 1
loseFirefly(s, i, T_BOLT)
} else if (dx - lethal < h.nm) { h.nm = dx - lethal; h.nmx = s.fx[i]; h.nmy = s.fy[i] }
}
if (s.count <= 0) return
}
}
export function moveStatic(s, sc) {
for (let k = 0; k < HAZARD_POOL; k++) {
const h = s.hazards[k]
if (!h.active) continue
h.px = h.x
h.py = h.y
if (h.type === T_BAT || h.type === T_MOTH) continue
h.y += sc
h.age++
if (h.type === T_BOLT) { boltUpdate(s, h); continue }
if (h.type === T_GATE) gateUpdate(s, h)
else if (h.type === T_PULSE) pulseUpdate(s, h)
if (h.y > REMOVE_Y) h.active = 0
}
}
export function listCurrents(s) {
let n = 0
for (let k = 0; k < HAZARD_POOL; k++) {
const h = s.hazards[k]
if (h.active && h.type === T_CURRENT) s.curIdx[n++] = k
}
return n
}
export function flareHazards(s) {
const lx = s.lantern.x
const ly = s.lantern.y
const r2 = FLARE_R * FLARE_R
for (let k = 0; k < HAZARD_POOL; k++) {
const h = s.hazards[k]
if (!h.active) continue
if (h.type === T_BAT && h.st === BAT_CHASE) {
const dx = h.x - lx
const dy = h.y - ly
const d2 = dx * dx + dy * dy
if (d2 >= r2) continue
const d = Math.sqrt(d2)
const sp = BAT_FLEE_MULT * BAT_V(s.difficulty, s.late)
h.vx = d > 0.001 ? (dx / d) * sp : 0
h.vy = d > 0.001 ? (dy / d) * sp : -sp
h.st = BAT_FLEEING
h.d = BAT_FLEE
h.c = 0
s.raw += BAT_REPEL_RAW
pushEvent(s, EV.FLARE_HIT, h.x, h.y, T_BAT)
} else if (h.type === T_MOTH) {
const dx = h.x - lx
const dy = h.y - ly
if (dx * dx + dy * dy >= r2) continue
h.active = 0
s.raw += MOTH_BURN_RAW
pushEvent(s, EV.MOTH_BURN, h.x, h.y, T_MOTH)
}
}
}
function batDepart(s, h) {
if (h.n === 0 && h.nm < NEAR_DIST_BAT) {
s.batDodges++
nearMiss(s, h.x, h.y)
}
if (h.x < -30 || h.x > VIEW_W + 30 || h.y > VIEW_H + 30 || h.y < -30) { h.active = 0; return }
h.st = BAT_LEAVING
h.vx = 0
h.vy = -BAT_LEAVE_V
}
function nearestFirefly(s, x, y) {
let best = -1
let bd = 1e18
for (let i = 0; i < SWARM_MAX; i++) {
if (!s.alive[i]) continue
const dx = s.fx[i] - x
const dy = s.fy[i] - y
const d2 = dx * dx + dy * dy
if (d2 < bd) { bd = d2; best = i }
}
s.near2 = bd
return best
}
export function updateMobiles(s) {
if (s.count <= 0) return
let have = false
let gx = 0
let gy = 0
const D = s.difficulty
const batV = BAT_V(D, s.late)
const batR2 = (BAT_R + FIREFLY_R) * (BAT_R + FIREFLY_R)
const mothR2 = (MOTH_R + FIREFLY_R) * (MOTH_R + FIREFLY_R)
for (let k = 0; k < HAZARD_POOL; k++) {
const h = s.hazards[k]
if (!h.active) continue
if (h.type !== T_BAT && h.type !== T_MOTH) continue
h.age++
if (h.age >= HAZARD_DESPAWN) { h.active = 0; continue }
if (!have) {
have = true
for (let i = 0; i < SWARM_MAX; i++) if (s.alive[i]) { gx += s.fx[i]; gy += s.fy[i] }
gx /= s.count
gy /= s.count
}
if (h.type === T_BAT) {
if (h.st === BAT_WARN) {
if (h.age >= BAT_WARN_TICKS) { h.st = BAT_CHASE; h.vx = 0; h.vy = 0 }
} else if (h.st === BAT_CHASE) {
nearestFirefly(s, h.x, h.y)
const dn = Math.sqrt(s.near2)
if (dn < h.nm) { h.nm = dn; h.nmx = h.x; h.nmy = h.y }
if (h.age - BAT_WARN_TICKS >= BAT_LIFE) { batDepart(s, h); continue }
if (h.d > 0) {
h.d--
continue
}
const dx = gx - h.x
const dy = gy - h.y
const d = Math.sqrt(dx * dx + dy * dy)
if (d > 0.001) { h.vx += (dx / d) * BAT_ACC; h.vy += (dy / d) * BAT_ACC }
const v2 = h.vx * h.vx + h.vy * h.vy
if (v2 > batV * batV) { const f = batV / Math.sqrt(v2); h.vx *= f; h.vy *= f }
h.x += h.vx
h.y += h.vy
const bi = nearestFirefly(s, h.x, h.y)
if (bi >= 0 && s.near2 < batR2) {
h.c++
if (h.c >= BAT_BITE_DELAY) {
h.c = 0
h.n++
h.d = BAT_CHEW
pushEvent(s, EV.BAT_BITE, s.fx[bi], s.fy[bi], h.n)
loseFirefly(s, bi, T_BAT)
if (s.count <= 0) return
if (h.n >= batBitesMax(s.late)) batDepart(s, h)
}
} else h.c = 0
} else if (h.st === BAT_FLEEING) {
h.x += h.vx
h.y += h.vy
h.d--
if (h.d <= 0 || h.x < -60 || h.x > VIEW_W + 60 || h.y < -60 || h.y > VIEW_H + 60) batDepart(s, h)
} else {
h.y += h.vy
if (h.y < SPAWN_Y) h.active = 0
}
} else {
const sc = s.scroll
if (h.st === 0) {
const dxl = h.x - s.lantern.x
const dyl = h.y - s.lantern.y
if (dxl * dxl + dyl * dyl < s.lightR * s.lightR) {
const dx = gx - h.x
const dy = gy - h.y
const d = Math.sqrt(dx * dx + dy * dy)
const sp = MOTH_V(D)
if (d > sp) { h.x += (dx / d) * sp; h.y += (dy / d) * sp } else { h.x = gx; h.y = gy }
} else {
h.x += MOTH_ZIG * sinT((h.ph + h.age * MOTH_ZIG_STEP) & 255)
h.y += sc
}
const mi = nearestFirefly(s, h.x, h.y)
if (mi >= 0 && s.near2 < mothR2) {
h.c++
if (h.c >= (h.n === 0 ? MOTH_CONTACT : MOTH_EAT_TICKS)) {
h.c = 0
h.n++
loseFirefly(s, mi, T_MOTH)
if (s.count <= 0) return
if (h.n >= MOTH_BITES_MAX) h.st = 1
}
} else h.c = 0
} else {
h.x += MOTH_ZIG * sinT((h.ph + h.age * MOTH_ZIG_STEP) & 255)
h.y += sc
}
if (h.x < 4) h.x = 4
else if (h.x > VIEW_W - 4) h.x = VIEW_W - 4
if (h.y > REMOVE_Y) h.active = 0
}
}
}
