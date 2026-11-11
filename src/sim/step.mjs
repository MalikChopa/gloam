import {
LANTERN_ZONE, LANTERN_START, SWARM_START, SWARM_MAX, FIREFLY_R, HITBOX_SHRINK, REMOVE_Y,
HAZARD_POOL, STRAY_POOL, EVENTS_MAX, MAX_TICKS, DIFFICULTY_STEP, COMBO_CAP, SCORE_DIV,
LIGHT_R_BASE, LIGHT_PER_FIREFLY, RULES_VERSION, EV, T_BRAMBLE, T_GATE, T_BAT, T_TIME, CAUSE_NAME,
INPUT_QUANT, NEAR_DIST, STRAY_R, PICKUP_FULL_RAW, FLARE_CD, flareCdAt, FLARE_BUFFER, FLARE_FX_TICKS,
T_PULSE, T_COCOON, T_EMBER, T_COUNT, ITEM_POOL, ITEM_R, SHIELD_TTL, START_SHIELD, PULSE_PERIOD, PULSE_ON_T, PULSE_NEAR_T,
VIEW_W, ACT_TICKS, LATE_T0, WIND_WARN_T, WIND_BLOW_T, WIND_RAMP, WIND_F, WIND_FIRST, WIND_EVERY, WIND_JIT,
difficultyAt, scrollAt, lateAt, actAt,
} from './params.mjs'
import { createLevelRng, createContentRng, createWindRng, createGauntletRng } from './rng.mjs'
import { initSwarm, addFirefly, updateLantern, updateSwarm } from './swarm.mjs'
import { initGenerator, runGenerator, placeBramble, placeItem } from './generator.mjs'
import { makeHazard, moveStatic, updateMobiles, flareHazards, placeCurrent, placeBat, placeMoth, placeGate, placePulse, placeBolt, collideBolts } from './hazards.mjs'
import { pushEvent, nearMiss, loseFirefly } from './events.mjs'
function quantize(v) { return Math.floor(v / INPUT_QUANT) * INPUT_QUANT }
export function prepareInput(input) {
input.hasTarget = !!input.hasTarget
input.flare = !!input.flare
const dx = input.dx
const dy = input.dy
input.dx = dx > 0 ? 1 : dx < 0 ? -1 : 0
input.dy = dy > 0 ? 1 : dy < 0 ? -1 : 0
let tx = input.tx
let ty = input.ty
if (!(tx >= LANTERN_ZONE.x0)) tx = LANTERN_ZONE.x0
else if (tx > LANTERN_ZONE.x1) tx = LANTERN_ZONE.x1
if (!(ty >= LANTERN_ZONE.y0)) ty = LANTERN_ZONE.y0
else if (ty > LANTERN_ZONE.y1) ty = LANTERN_ZONE.y1
input.tx = quantize(tx)
input.ty = quantize(ty)
return input
}
export function createRun(opts) {
const o = opts || {}
const seedKey = o.seedKey
if (typeof seedKey !== 'string' || seedKey.length === 0) throw new Error('createRun: seedKey requis')
const rules = o.rules === undefined ? RULES_VERSION : o.rules
if (rules !== RULES_VERSION) throw new Error('createRun: rules ' + rules + ' != ' + RULES_VERSION)
let n = o.swarm === undefined ? SWARM_START : o.swarm
if (!(n >= 1)) n = 1
if (n > SWARM_MAX) n = SWARM_MAX
n = Math.floor(n)
const startTick = o.startTick === undefined ? 0 : o.startTick
const hazards = []
for (let i = 0; i < HAZARD_POOL; i++) {
hazards.push(makeHazard())
}
const strays = []
for (let i = 0; i < STRAY_POOL; i++) strays.push({ active: 0, x: 0, y: 0 })
const events = []
for (let i = 0; i < EVENTS_MAX; i++) events.push({ type: 0, x: 0, y: 0, a: 0 })
const items = []
for (let i = 0; i < ITEM_POOL; i++) items.push({ active: 0, kind: 0, x: 0, y: 0 })
const s = {
seedKey,
mode: o.mode === undefined ? 'free' : o.mode,
rules,
tick: startTick,
startTick,
over: false,
cause: '',
killer: 0,
raw: 0,
score: 0,
combo: 0,
maxCombo: 0,
count: 0,
target: n,
lantern: { x: LANTERN_START.x, y: LANTERN_START.y },
lvx: 0,
lvy: 0,
fx: new Float32Array(SWARM_MAX),
fy: new Float32Array(SWARM_MAX),
fvx: new Float64Array(SWARM_MAX),
fvy: new Float64Array(SWARM_MAX),
alive: new Uint8Array(SWARM_MAX),
hazards,
strays,
flareCd: 0,
flareCdMax: FLARE_CD,
flareT: 0,
flareBuf: 0,
lightR: 0,
scroll: scrollAt(startTick),
distance: 0,
difficulty: difficultyAt(startTick),
chunkLog: [],
secMin: new Uint8Array(360),
secCount: 0,
events,
eventCount: 0,
eventsDropped: 0,
nearMisses: 0,
batDodges: 0,
flares: 0,
lost: 0,
picked: 0,
noSpawn: !!o.noSpawn,
invincible: !!o.invincible,
poolOverflow: false,
spawned: false,
gen: null,
seen: new Uint16Array(T_COUNT),
curIdx: new Int8Array(HAZARD_POOL),
near2: 0,
onlyTypes: null,
act: actAt(startTick),
late: lateAt(startTick),
items,
shield: startTick === 0 ? START_SHIELD : 0,
iframes: 0,
shieldsUsed: 0,
shieldsGained: 0,
embers: 0,
windSt: 0,
windDir: 0,
windT: 0,
windF: 0,
windNext: (startTick > LATE_T0 ? startTick : LATE_T0) + WIND_FIRST,
windRng: createWindRng(seedKey),
gauntSt: 0,
gauntKind: 0,
gauntAt: 0,
gauntEndAt: 0,
gauntCount: 0,
gauntClean: 0,
gauntLost0: 0,
}
if (o.types !== undefined) {
s.onlyTypes = new Uint8Array(T_COUNT)
for (let i = 0; i < o.types.length; i++) s.onlyTypes[o.types[i]] = 1
s.onlyTypes[T_BRAMBLE] = 1
}
initSwarm(s, n)
s.lightR = LIGHT_R_BASE + LIGHT_PER_FIREFLY * s.count
initGenerator(s, createLevelRng(seedKey), createContentRng(seedKey), createGauntletRng(seedKey))
runGenerator(s)
return s
}
function collideWalls(s) {
const R = FIREFLY_R
const sh = HITBOX_SHRINK
let maxY = -1e9
for (let i = 0; i < SWARM_MAX; i++) if (s.alive[i] && s.fy[i] > maxY) maxY = s.fy[i]
for (let k = 0; k < HAZARD_POOL; k++) {
const hz = s.hazards[k]
if (!hz.active || (hz.type !== T_BRAMBLE && hz.type !== T_GATE && hz.type !== T_PULSE)) continue
const off = hz.type === T_PULSE && hz.st === 0
const y0 = hz.y + sh
const y1 = hz.y + hz.h - sh
const leftEdge = hz.x - hz.w / 2 - sh
const rightEdge = hz.x + hz.w / 2 + sh
for (let i = 0; i < SWARM_MAX; i++) {
if (!s.alive[i]) continue
const py = s.fy[i]
if (py < y0 - R || py > y1 + R) continue
hz.seen = 1
if (off) {
const ph = (hz.ph + hz.age) % PULSE_PERIOD
const since = ph - PULSE_ON_T + 1
const until = PULSE_PERIOD - ph
const m = since < until ? since : until
if (m < hz.c) hz.c = m
continue
}
const px = s.fx[i]
let dy = 0
if (py < y0) dy = y0 - py
else if (py > y1) dy = py - y1
let dx = 0
if (px > leftEdge && px < rightEdge) {
const dl = px - leftEdge
const dr = rightEdge - px
dx = dl < dr ? dl : dr
if (dx < hz.nm) { hz.nm = dx; hz.nmx = px; hz.nmy = py }
} else if (hz.nm > 0) {
hz.nm = 0; hz.nmx = px; hz.nmy = py
}
if (dx * dx + dy * dy < R * R) {
hz.hit = 1
loseFirefly(s, i, hz.type)
}
}
if (hz.seen && !hz.done && y0 > maxY + R) {
hz.done = 1
if (!hz.hit && (hz.nm < NEAR_DIST || (hz.type === T_PULSE && hz.c < PULSE_NEAR_T))) nearMiss(s, hz.nmx, hz.nmy)
}
}
}
function pickStrays(s) {
const lx = s.lantern.x
const ly = s.lantern.y
const r2 = STRAY_R * STRAY_R
for (let k = 0; k < STRAY_POOL; k++) {
const st = s.strays[k]
if (!st.active) continue
const dx = st.x - lx
const dy = st.y - ly
if (dx * dx + dy * dy >= r2) continue
st.active = 0
s.picked++
if (s.count < SWARM_MAX) addFirefly(s, st.x, st.y)
else s.raw += PICKUP_FULL_RAW
pushEvent(s, EV.PICKUP, st.x, st.y, s.count)
}
}
function pickItems(s) {
const lx = s.lantern.x
const ly = s.lantern.y
const r2 = ITEM_R * ITEM_R
for (let k = 0; k < ITEM_POOL; k++) {
const it = s.items[k]
if (!it.active) continue
const dx = it.x - lx
const dy = it.y - ly
if (dx * dx + dy * dy >= r2) continue
it.active = 0
if (it.kind === T_COCOON) {
s.shield = SHIELD_TTL
s.shieldsGained++
pushEvent(s, EV.SHIELD_GAIN, it.x, it.y, SHIELD_TTL)
} else {
s.flareCd = 0
s.flareBuf = 0
s.embers++
pushEvent(s, EV.EMBER_GAIN, it.x, it.y, 0)
}
}
}
function updateWind(s) {
if (s.windSt === 0) {
s.windF = 0
if (s.tick < s.windNext) return
s.windSt = 1
s.windT = 0
s.windDir = s.windRng.float() < 0.5 ? -1 : 1
pushEvent(s, EV.WIND_WARN, s.windDir < 0 ? VIEW_W : 0, 0, s.windDir)
return
}
s.windT++
if (s.windSt === 1) {
if (s.windT >= WIND_WARN_T) {
s.windSt = 2
s.windT = 0
pushEvent(s, EV.WIND_START, s.windDir < 0 ? VIEW_W : 0, 0, s.windDir)
}
return
}
const t = s.windT
if (t >= WIND_BLOW_T) {
s.windSt = 0
s.windF = 0
s.windDir = 0
s.windNext = s.tick + WIND_EVERY + s.windRng.int(WIND_JIT)
return
}
let k = 1
if (t < WIND_RAMP) k = t / WIND_RAMP
else if (t > WIND_BLOW_T - WIND_RAMP) k = (WIND_BLOW_T - t) / WIND_RAMP
s.windF = WIND_F * s.windDir * k
}
function updateFlare(s, input) {
if (s.flareCd > 0) s.flareCd--
if (s.flareT > 0) s.flareT--
let fire = false
if (s.flareBuf && s.flareCd === 0) fire = true
if (input.flare) {
if (s.flareCd === 0) fire = true
else if (s.flareCd <= FLARE_BUFFER) s.flareBuf = 1
}
if (fire) {
s.flareBuf = 0
s.flareCdMax = flareCdAt(s.late)
s.flareCd = s.flareCdMax
s.flareT = FLARE_FX_TICKS
s.flares++
pushEvent(s, EV.FLARE, s.lantern.x, s.lantern.y, 0)
flareHazards(s)
}
}
export function step(s, input) {
s.eventCount = 0
if (s.over) return
prepareInput(input)
const sc = scrollAt(s.tick)
s.scroll = sc
s.distance += sc
s.difficulty = difficultyAt(s.tick)
s.late = lateAt(s.tick)
moveStatic(s, sc)
for (let k = 0; k < STRAY_POOL; k++) {
const st = s.strays[k]
if (!st.active) continue
st.y += sc
if (st.y > REMOVE_Y) st.active = 0
}
for (let k = 0; k < ITEM_POOL; k++) {
const it = s.items[k]
if (!it.active) continue
it.y += sc
if (it.y > REMOVE_Y) it.active = 0
}
runGenerator(s)
updateFlare(s, input)
if (s.iframes > 0) s.iframes--
if (s.shield > 0) {
s.shield--
if (s.shield === 0) pushEvent(s, EV.SHIELD_BREAK, s.lantern.x, s.lantern.y, 0)
}
if (s.late > 0 || s.windSt !== 0) updateWind(s)
updateLantern(s, input)
updateSwarm(s)
pickStrays(s)
pickItems(s)
updateMobiles(s)
if (s.count > 0) collideWalls(s)
if (s.count > 0) collideBolts(s)
if (s.invincible) {
while (s.count < s.target) {
if (addFirefly(s, s.lantern.x, s.lantern.y) < 0) break
}
}
if (s.gauntSt === 1 && s.tick >= s.gauntAt) {
s.gauntSt = 2
s.gauntLost0 = s.lost
pushEvent(s, EV.GAUNTLET_START, 0, 0, s.gauntKind)
} else if (s.gauntSt === 2 && s.gauntEndAt > 0 && s.tick >= s.gauntEndAt) {
const lost = s.lost - s.gauntLost0
s.gauntSt = 0
s.gauntEndAt = 0
if (lost === 0) s.gauntClean++
pushEvent(s, EV.GAUNTLET_END, lost, 0, s.gauntKind)
}
const mult = 2 + (s.combo < COMBO_CAP ? s.combo : COMBO_CAP)
s.raw += s.count * mult
s.score = Math.floor(s.raw / SCORE_DIV)
if (s.combo > s.maxCombo) s.maxCombo = s.combo
s.lightR = LIGHT_R_BASE + LIGHT_PER_FIREFLY * s.count
s.tick++
const elapsed = s.tick - s.startTick
const sec = Math.floor((elapsed - 1) / 60)
if (sec < 360) {
if (sec >= s.secCount) { s.secMin[sec] = s.count; s.secCount = sec + 1 }
else if (s.count < s.secMin[sec]) s.secMin[sec] = s.count
}
if (elapsed % DIFFICULTY_STEP === 0) pushEvent(s, EV.DIFFICULTY_UP, 0, 0, elapsed / DIFFICULTY_STEP)
for (let a = 1; a < ACT_TICKS.length; a++) {
if (s.tick === ACT_TICKS[a]) { s.act = a; pushEvent(s, EV.ACT_START, 0, 0, a) }
}
if (s.count === 0) {
s.over = true
s.cause = CAUSE_NAME[s.killer]
pushEvent(s, EV.DEATH, s.lantern.x, s.lantern.y, s.killer)
} else if (elapsed >= MAX_TICKS) {
s.over = true
s.cause = CAUSE_NAME[T_TIME]
pushEvent(s, EV.DEATH, s.lantern.x, s.lantern.y, T_TIME)
}
}
export function snapshot(s, out) {
if (!out.fx) {
out.fx = new Float32Array(SWARM_MAX)
out.fy = new Float32Array(SWARM_MAX)
out.alive = new Uint8Array(SWARM_MAX)
out.hx = new Float32Array(HAZARD_POOL)
out.hy = new Float32Array(HAZARD_POOL)
out.hactive = new Uint8Array(HAZARD_POOL)
}
out.lx = s.lantern.x
out.ly = s.lantern.y
out.count = s.count
out.tick = s.tick
out.distance = s.distance
for (let i = 0; i < SWARM_MAX; i++) {
out.fx[i] = s.fx[i]
out.fy[i] = s.fy[i]
out.alive[i] = s.alive[i]
}
for (let k = 0; k < HAZARD_POOL; k++) {
out.hactive[k] = s.hazards[k].active
out.hx[k] = s.hazards[k].x
out.hy[k] = s.hazards[k].y
}
return out
}
export function summary(s) {
const elapsed = s.tick - s.startTick
const S = s.secCount
const timeline = []
let prev = S > 0 ? s.secMin[0] : s.count
for (let p = 0; p < 10; p++) {
const from = Math.floor((p * S) / 10)
const to = Math.floor(((p + 1) * S) / 10)
if (to <= from) { timeline.push(prev); continue }
let m = 255
for (let k = from; k < to; k++) if (s.secMin[k] < m) m = s.secMin[k]
timeline.push(m)
prev = m
}
return {
score: s.score,
ticks: elapsed,
maxCombo: s.maxCombo,
nearMisses: s.nearMisses,
batDodges: s.batDodges,
flares: s.flares,
lost: s.lost,
picked: s.picked,
timeline,
cause: s.cause,
invincible: s.invincible,
poolOverflow: s.poolOverflow,
unrankable: s.invincible || s.noSpawn || s.startTick !== 0 || s.spawned || s.onlyTypes !== null,
}
}
export function spawnHazard(s, def) {
s.spawned = true
const y = def.y === undefined ? -60 : def.y
switch (def.type) {
case 'BRAMBLE': return placeBramble(s, -1, def.x, def.w === undefined ? 92 : def.w, y)
case 'CURRENT': return placeCurrent(s, -1, def.x, def.w === undefined ? 90 : def.w, def.sens === undefined ? 1 : def.sens, y)
case 'BAT': {
const r = placeBat(s, -1, def.side === undefined ? 0 : def.side, y, !!def.active)
if (def.active) { const h = s.hazards[findLast(s, T_BAT)]; h.x = def.x; h.px = def.x; h.y = y; h.py = y }
return r
}
case 'MOTH': return placeMoth(s, -1, def.x, def.zig === undefined ? 0 : def.zig, y)
case 'GATE': return placeGate(s, -1, def.x, y, def.phase === undefined ? 0 : def.phase)
case 'PULSE': return placePulse(s, -1, def.x, def.w === undefined ? 92 : def.w, y, def.phase === undefined ? 0 : def.phase)
case 'BOLT': return placeBolt(s, -1, y, def.delay === undefined ? 1 : def.delay, def.off === undefined ? 0 : def.off)
case 'COCOON': return placeItem(s, T_COCOON, def.x, y)
case 'EMBER': return placeItem(s, T_EMBER, def.x, y)
default: throw new Error('spawnHazard: type inconnu ' + def.type)
}
}
function findLast(s, type) {
let r = -1
for (let k = 0; k < HAZARD_POOL; k++) if (s.hazards[k].active && s.hazards[k].type === type) r = k
return r
}
