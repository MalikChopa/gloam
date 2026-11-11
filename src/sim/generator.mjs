import {
SPAWN_Y, FIRST_CHUNK_Y, BRAMBLE_H, CHICANE_GAP, CHUNK_LEN_BRAMBLE, CHUNK_LEN_CHICANE, CHUNK_LEN_CURRENT,
CHUNK_LEN_GATE, CHUNK_LEN_MOBILE, CHICANE_D_MIN, CHICANE_P, CHICANE_SHIFT, GAP_W, MAX_SHIFT,
LANTERN_START, VIEW_W, T_BRAMBLE, T_CURRENT, T_BAT, T_MOTH, T_GATE, TYPE_NAME,
STRAY_POOL, STRAY_P, STRAY_EDGE, STRAY_SLOTS, CURRENT_W_MIN, CURRENT_W_MAX, CURRENT_H, CURRENT_EDGE,
BAT_Y_MIN, BAT_Y_MAX, BAT_MAX_ALIVE, MOTH_MAX_ALIVE, HAZARD_DESPAWN, GATE_OPEN, GATE_H,
T_PULSE, T_BOLT, T_COCOON, T_EMBER, CHUNK_LEN_PULSE, CHUNK_LEN_BOLT, BOLT_SEP, BOLT_OFF, CHICANE_P_LATE, strayPAt,
ITEM_POOL, ITEM_UNLOCK, mothMaxAlive, EMBER_P, COCOON_P, ITEM_EDGE, COMBINE_P,
difficultyAt, scrollAt, lateAt, chunkGapAt, typeWeight,
ACT_TICKS, EV, C_CHICANE, GAUNTLET_KINDS, GAUNTLET_QUIET, GAUNTLET_EVERY, GAUNTLET_JIT, GAUNTLET_START_Y, GAUNTLET_END_Y,
GAUNTLET_SPAN_MARGIN, HAZARD_POOL,
} from './params.mjs'
import { pushEvent } from './events.mjs'
import { allocHazard, placeCurrent, placeBat, placeMoth, placeGate, gatePhaseFor, placePulse, pulsePhaseFor, placeBolt, boltDelayFor } from './hazards.mjs'
export { allocHazard }
export const CHUNK_LOG_MAX = 512
export function ticksToY(t0, y0, Y) {
let y = y0
let a = 0
while (y < Y && a < 4000) { a++; y += scrollAt(t0 + a) }
return a
}
export function gauntletSpan(t) {
const d = 3 * CHUNK_LEN_CHICANE + 2 * chunkGapAt(t) + (GAUNTLET_END_Y - SPAWN_Y)
return Math.ceil(d / scrollAt(t)) + GAUNTLET_SPAN_MARGIN
}
export function gauntletAllowed(s, t) {
const span = gauntletSpan(t)
for (let a = 1; a < ACT_TICKS.length; a++) {
if (t + span > ACT_TICKS[a] && t < ACT_TICKS[a] + GAUNTLET_QUIET) return false
}
return s.windSt === 0 && s.windNext > t + span
}
export function initGenerator(s, rng, crng, grng) {
let gNext = ACT_TICKS[2] + GAUNTLET_QUIET + grng.int(GAUNTLET_JIT)
while (gNext < s.startTick) gNext += GAUNTLET_EVERY + grng.int(GAUNTLET_JIT)
s.gen = {
grng,
gNext,
gIdx: -1,
gKind: 0,
rng,
crng,
boltT: -1e9,
next: SPAWN_Y - FIRST_CHUNK_Y,
lastCx: LANTERN_START.x,
lastType: T_BRAMBLE,
chunks: 0,
batT: [-1e9, -1e9, -1e9],
mothT: [-1e9, -1e9, -1e9],
curSens: 0,
curLo: 0,
curHi: 0,
}
}
export function placeBramble(s, chunkId, cx, w, y) {
const i = allocHazard(s)
if (i < 0) { s.poolOverflow = true; return -1 }
const h = s.hazards[i]
h.active = 1
h.type = T_BRAMBLE
h.chunk = chunkId
h.x = cx
h.y = y
h.px = cx
h.py = y
h.vx = 0; h.vy = 0; h.age = 0; h.st = 0; h.n = 0; h.c = 0; h.d = 0; h.sens = 0; h.ph = 0; h.o = 0; h.tr = 0; h.gl = 0
h.w = w
h.h = BRAMBLE_H
h.nm = 1e9
h.nmx = 0
h.nmy = 0
h.seen = 0
h.hit = 0
h.done = 0
return i
}
export function placeStray(s, x, y) {
for (let i = 0; i < STRAY_POOL; i++) {
const st = s.strays[i]
if (!st.active) {
st.active = 1
st.x = x
st.y = y
return i
}
}
s.poolOverflow = true
return -1
}
export function placeItem(s, kind, x, y) {
for (let i = 0; i < ITEM_POOL; i++) {
const it = s.items[i]
if (!it.active) {
it.active = 1
it.kind = kind
it.x = x
it.y = y
return i
}
}
s.poolOverflow = true
return -1
}
function pickType(roll, tick) {
let total = 0
for (let t = 1; t <= T_BOLT; t++) total += typeWeight(t, tick)
let r = roll * total
for (let t = 1; t <= T_BOLT; t++) {
const w = typeWeight(t, tick)
if (w <= 0) continue
if (r < w) return t
r -= w
}
return T_BRAMBLE
}
function recent(ring, tick) {
let n = 0
for (let i = 0; i < ring.length; i++) if (tick - ring[i] < HAZARD_DESPAWN) n++
return n
}
function remember(ring, tick) {
for (let i = 0; i + 1 < ring.length; i++) ring[i] = ring[i + 1]
ring[ring.length - 1] = tick
}
export function createChunk(s) {
const g = s.gen
const rng = g.rng
const tick = s.tick
const D = difficultyAt(tick)
const L = lateAt(tick)
const typeRoll = rng.float()
let type = pickType(typeRoll, tick)
if (type !== T_BRAMBLE) {
if (g.lastType !== T_BRAMBLE) type = T_BRAMBLE
else if (type === T_BAT && recent(g.batT, tick) >= BAT_MAX_ALIVE(D, L)) type = T_BRAMBLE
else if (type === T_MOTH && recent(g.mothT, tick) >= mothMaxAlive(L)) type = T_BRAMBLE
else if (type === T_BOLT && tick - g.boltT < BOLT_SEP) type = T_BRAMBLE
}
if (s.onlyTypes !== null && !s.onlyTypes[type]) type = T_BRAMBLE
let gEl = -1
let gWarn = false
if (g.gIdx < 0 && tick >= g.gNext && s.onlyTypes === null && g.lastType === T_BRAMBLE && gauntletAllowed(s, tick)) {
g.gKind = g.grng.int(GAUNTLET_KINDS.length)
g.gNext = tick + GAUNTLET_EVERY + g.grng.int(GAUNTLET_JIT)
g.gIdx = 0
gWarn = true
}
if (g.gIdx >= 0) {
gEl = GAUNTLET_KINDS[g.gKind][g.gIdx]
type = gEl === C_CHICANE ? T_BRAMBLE : gEl
if (type === T_BOLT && tick - g.boltT < BOLT_SEP) { type = T_BRAMBLE; gEl = C_CHICANE }
}
const w = type === T_GATE ? GATE_OPEN : GAP_W(D)
const cxMin = Math.ceil(w / 2 + 20)
const cxMax = Math.floor(340 - w / 2)
const gap = chunkGapAt(tick)
const shift = MAX_SHIFT(D, scrollAt(tick + 400), gap)
let lo = Math.ceil(g.lastCx - shift)
let hi = Math.floor(g.lastCx + shift)
if (lo < cxMin) lo = cxMin
if (hi > cxMax) hi = cxMax
if (g.curSens !== 0) {
let clo = lo
let chi = hi
if (g.curSens > 0) chi = Math.min(hi, Math.floor(g.curLo - CURRENT_EDGE))
else clo = Math.max(lo, Math.ceil(g.curHi + CURRENT_EDGE))
if (chi >= clo) { lo = clo; hi = chi }
g.curSens = 0
}
if (hi < lo) hi = lo
const cx = lo + rng.int(hi - lo + 1)
const chRoll = rng.float()
const cs = CHICANE_SHIFT(D)
let lo2 = Math.ceil(cx - cs)
let hi2 = Math.floor(cx + cs)
const cxMin2 = Math.ceil(GAP_W(D) / 2 + 20)
const cxMax2 = Math.floor(340 - GAP_W(D) / 2)
if (lo2 < cxMin2) lo2 = cxMin2
if (hi2 > cxMax2) hi2 = cxMax2
if (hi2 < lo2) hi2 = lo2
const cx2 = lo2 + rng.int(hi2 - lo2 + 1)
const chicane = type === T_BRAMBLE && (gEl === C_CHICANE || (gEl < 0 && D >= CHICANE_D_MIN && chRoll < CHICANE_P(D) + CHICANE_P_LATE * L))
const sRoll = rng.float()
const sCount = 1 + rng.int(STRAY_SLOTS)
const sSide0 = rng.float()
const sSide1 = rng.float()
const sSide2 = rng.float()
const nStray = type === T_BRAMBLE && gEl < 0 && sRoll < strayPAt(L) ? sCount : 0
const curW = Math.floor(CURRENT_W_MIN + rng.float() * (CURRENT_W_MAX - CURRENT_W_MIN + 1))
const curSens = rng.float() < 0.5 ? -1 : 1
const curXr = rng.float()
const batSide = rng.float() < 0.5 ? 0 : 1
const batY = BAT_Y_MIN + Math.floor(rng.float() * (BAT_Y_MAX - BAT_Y_MIN + 1))
const mothX = 20 + Math.floor(rng.float() * 321)
const mothZig = rng.int(256)
const cr = g.crng
const pulseXr = cr.float()
const boltOff = -BOLT_OFF + cr.int(2 * BOLT_OFF + 1)
const itemRoll = cr.float()
const itemSide = cr.float()
const comboRoll = cr.float()
const comboKind = cr.float()
cr.u32()
const start = g.next
const bottom = SPAWN_Y + (s.distance - start)
const id = g.chunks
let len = 0
let logCx = cx
let logSide = 0
let logPhase = 0
let logItem = 0
let logCombo = 0
if (type === T_BRAMBLE) {
placeBramble(s, id, cx, w, bottom - BRAMBLE_H)
len = CHUNK_LEN_BRAMBLE
g.lastCx = cx
const top1 = bottom - BRAMBLE_H
const top2 = bottom - BRAMBLE_H - CHICANE_GAP - BRAMBLE_H
if (chicane) {
placeBramble(s, id, cx2, w, top2)
len = CHUNK_LEN_CHICANE
g.lastCx = cx2
}
for (let k = 0; k < nStray; k++) {
const u = k === 0 ? sSide0 : k === 1 ? sSide1 : sSide2
const onSecond = chicane && k === 1
const wcx = onSecond ? cx2 : cx
const wtop = onSecond ? top2 : top1
const sx = u < 0.5 ? wcx - w / 2 + STRAY_EDGE : wcx + w / 2 - STRAY_EDGE
placeStray(s, sx, wtop + BRAMBLE_H / 2 + (k - 1) * 16)
}
if (tick >= ITEM_UNLOCK && gEl < 0) {
const kind = itemRoll < COCOON_P ? T_COCOON : itemRoll < COCOON_P + EMBER_P ? T_EMBER : 0
if (kind !== 0) {
const ix = itemSide < 0.5 ? cx - w / 2 + ITEM_EDGE : cx + w / 2 - ITEM_EDGE
placeItem(s, kind, ix, top1 + BRAMBLE_H / 2)
logItem = kind
}
}
if (gEl < 0 && comboRoll < COMBINE_P(L)) {
const batOk = recent(g.batT, tick) < BAT_MAX_ALIVE(D, L)
const mothOk = recent(g.mothT, tick) < mothMaxAlive(L)
const wantBat = comboKind < 0.5
if (wantBat ? batOk : !mothOk && batOk) { placeBat(s, id, batSide, batY, false); remember(g.batT, tick); logCombo = T_BAT }
else if (mothOk) { placeMoth(s, id, mothX, mothZig, SPAWN_Y); remember(g.mothT, tick); logCombo = T_MOTH }
}
} else if (type === T_PULSE) {
const pcMin = Math.ceil(w / 2 + 20)
const pcMax = Math.floor(340 - w / 2)
const pcx = pcMin + Math.floor(pulseXr * (pcMax - pcMin + 1))
const y0 = bottom - BRAMBLE_H
const ph = pulsePhaseFor(tick, y0)
placePulse(s, id, pcx, w, y0, ph)
len = CHUNK_LEN_PULSE
logCx = pcx
logPhase = ph
} else if (type === T_BOLT) {
const yc = bottom - CHUNK_LEN_BOLT / 2
const delay = boltDelayFor(tick, yc)
placeBolt(s, id, yc, delay, boltOff)
len = CHUNK_LEN_BOLT
g.boltT = tick
logCx = 0
logSide = boltOff
logPhase = delay
} else if (type === T_GATE) {
const y0 = bottom - GATE_H
const ph = gatePhaseFor(tick, y0)
placeGate(s, id, cx, y0, ph)
len = CHUNK_LEN_GATE
g.lastCx = cx
logPhase = ph
} else if (type === T_CURRENT) {
let bxMin = Math.ceil(curW / 2 + 10)
let bxMax = Math.floor(VIEW_W - curW / 2 - 10)
const nD = difficultyAt(tick + 150)
const nShift = MAX_SHIFT(nD, scrollAt(tick + 550), chunkGapAt(tick + 150))
const reachLo = Math.max(Math.ceil(GAP_W(nD) / 2 + 20), Math.ceil(g.lastCx - nShift))
const reachHi = Math.min(Math.floor(340 - GAP_W(nD) / 2), Math.floor(g.lastCx + nShift))
if (curSens > 0) { const m = Math.ceil(reachLo + CURRENT_EDGE + curW / 2); if (m <= bxMax) bxMin = Math.max(bxMin, m) }
else { const m = Math.floor(reachHi - CURRENT_EDGE - curW / 2); if (m >= bxMin) bxMax = Math.min(bxMax, m) }
const bx = bxMin + Math.floor(curXr * (bxMax - bxMin + 1))
placeCurrent(s, id, bx, curW, curSens, bottom - CURRENT_H)
len = CHUNK_LEN_CURRENT
g.curSens = curSens
g.curLo = bx - curW / 2
g.curHi = bx + curW / 2
logCx = bx
logSide = curSens > 0 ? 1 : 0
logPhase = curW
} else if (type === T_BAT) {
placeBat(s, id, batSide, batY, false)
len = CHUNK_LEN_MOBILE
remember(g.batT, tick)
logCx = 0
logSide = batSide
logPhase = batY
} else {
placeMoth(s, id, mothX, mothZig, SPAWN_Y)
len = CHUNK_LEN_MOBILE
remember(g.mothT, tick)
logCx = mothX
logPhase = mothZig
}
s.seen[type]++
if (gEl >= 0) {
for (let k = 0; k < HAZARD_POOL; k++) { const h = s.hazards[k]; if (h.active && h.chunk === id) h.gl = 1 }
const top = bottom - len
if (gWarn) {
const a = ticksToY(tick, top, GAUNTLET_START_Y)
s.gauntSt = 1
s.gauntKind = g.gKind
s.gauntAt = tick + (a > 1 ? a : 1)
s.gauntEndAt = 0
s.gauntCount++
pushEvent(s, EV.GAUNTLET_WARN, 0, s.gauntAt - tick, g.gKind)
}
g.gIdx++
if (g.gIdx >= GAUNTLET_KINDS[g.gKind].length) {
g.gIdx = -1
s.gauntEndAt = tick + ticksToY(tick, top, GAUNTLET_END_Y)
}
}
g.lastType = type
g.next = start + len + gap
g.chunks = id + 1
if (s.chunkLog.length < CHUNK_LOG_MAX) {
s.chunkLog.push({
tick, type: TYPE_NAME[type], cx: logCx, side: logSide, phase: logPhase,
chicane: chicane ? 1 : 0, cx2: chicane ? cx2 : 0, strays: nStray, item: logItem, combo: logCombo,
gaunt: gEl >= 0 ? g.gKind + 1 : 0,
})
}
}
export function runGenerator(s) {
if (s.noSpawn) return
while (s.distance >= s.gen.next) createChunk(s)
}
