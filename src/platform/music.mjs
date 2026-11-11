export const LOOKAHEAD = 0.25
export const MAX_STEPS_PER_TICK = 8
export const MUSIC_LEVEL = 0.19
export const FADE_IN_S = 1.6
const FLOOR = 0.001
export const BIOME_MUSIC = [
{ id: 'lisiere', root: 146.83, scale: [0, 2, 4, 7, 9], pad: 'triangle', cut: [650, 1500], note: 'sine', decay: 1.8, bell: 0, tempo: 1, pNote: 0.2 },
{ id: 'marais', root: 110, scale: [0, 3, 5, 7, 10], pad: 'sawtooth', cut: [320, 800], note: 'triangle', decay: 2.4, bell: 0, tempo: 0.88, pNote: 0.16 },
{ id: 'cimes', root: 164.81, scale: [0, 2, 5, 7, 9], pad: 'sine', cut: [900, 2200], note: 'sine', decay: 2.2, bell: 0.3, tempo: 0.94, pNote: 0.22 },
{ id: 'nuit', root: 98, scale: [0, 1, 5, 7, 10], pad: 'square', cut: [240, 620], note: 'sine', decay: 2.6, bell: 0.35, tempo: 0.92, pNote: 0.14, padGain: 0.5 },
]
const SHIFTS = [0, 2, 3, 5]
export const LATE_SHIFT = 2
export const LATE_TEMPO = 0.1
const clamp01 = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0)
export function bpmFor(intensity, biome, late = 0) {
const b = BIOME_MUSIC[biomeIndex(biome)]
return (52 + 24 * clamp01(intensity)) * b.tempo * (1 + LATE_TEMPO * clamp01(late))
}
export function keyShiftFor(intensity, late = 0) { return SHIFTS[Math.min(SHIFTS.length - 1, Math.floor(clamp01(intensity) * SHIFTS.length))] + (clamp01(late) >= 0.5 ? LATE_SHIFT : 0) }
export function actIndex(a) { return Number.isFinite(a) ? Math.min(3, Math.max(0, Math.floor(a))) : 0 }
export function biomeIndex(b) { return Number.isFinite(b) ? Math.min(BIOME_MUSIC.length - 1, Math.max(0, Math.floor(b))) : 0 }
export function degreeFreq(biome, deg, shift = 0) {
const b = BIOME_MUSIC[biomeIndex(biome)]
const n = b.scale.length
const oct = Math.floor(deg / n)
const semis = b.scale[((deg % n) + n) % n] + 12 * oct + shift
return b.root * Math.pow(2, semis / 12)
}
function mulberry32(a) {
let s = a >>> 0
return function () {
s = (s + 0x6d2b79f5) >>> 0
let t = s
t = Math.imul(t ^ (t >>> 15), t | 1)
t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
}
export function createMusic({ audio, seed = 1, level = MUSIC_LEVEL, timer = null } = {}) {
const rnd = mulberry32(seed)
const later = timer || ((fn, ms) => { const h = setTimeout(fn, ms); if (h && h.unref) h.unref(); return h })
let bus = null
let busCtx = null
let track = []
let duckLow = null
let running = false
let intensity = 0, biome = 0, act = 0, late = 0
let curBiome = 0, shift = 0
let nextT = 0, stepDur = 0.5, stepInBar = 0, bar = 0
let deg = 0, ni = 4
const groups = new Set()
const stats = { groupsMade: 0, groupsFreed: 0, nodesMade: 0, nodesFreed: 0, pads: 0, notes: 0, starts: 0, stops: 0, errors: 0 }
function param(p, fn) { try { fn(p) } catch { stats.errors++ } }
function mkGroup() { const g = { nodes: [], oscs: [], end: 0, pending: 0, dying: false }; groups.add(g); stats.groupsMade++; return g }
function node(g, n) { g.nodes.push(n); stats.nodesMade++; return n }
function freeGroup(g) {
if (!groups.has(g)) return
groups.delete(g)
stats.groupsFreed++
for (const n of g.nodes) { try { n.disconnect() } catch {   } stats.nodesFreed++ }
g.nodes.length = 0; g.oscs.length = 0
}
function sweep(now) {
for (const g of groups) if (g.end <= now) freeGroup(g)
}
function busAt(x) {
const n = track.length
if (!n) return 0
if (x <= track[0][0]) return track[0][1]
for (let i = 1; i < n; i++) {
const a = track[i - 1], b = track[i]
if (x <= b[0]) return b[0] > a[0] ? a[1] + (b[1] - a[1]) * ((x - a[0]) / (b[0] - a[0])) : b[1]
}
return track[n - 1][1]
}
function ensureBus(c, out) {
if (bus && busCtx === c.ctx) return true
try {
busCtx = c.ctx
track = []; duckLow = null
bus = c.ctx.createGain()
bus.gain.value = 0
bus.connect(out)
return true
} catch { stats.errors++; bus = null; return false }
}
function setBus(c, to, atS, rampS, now) {
const p = bus.gain
const v0 = busAt(now)
const end = now + atS + rampS
param(p, () => { if (p.cancelScheduledValues) p.cancelScheduledValues(now) })
param(p, () => { p.setValueAtTime(v0, now); p.linearRampToValueAtTime(to, end) })
track = [[now, v0], [end, to]]; duckLow = null
}
function modeBiome() { return act >= 3 ? 3 : biome }
function inten() { return act >= 3 ? 1 : intensity }
function oscNode(c, g, type, f, t, dur, detune = 0) {
const o = node(g, c.ctx.createOscillator())
o.type = type
o.frequency.value = f
if (detune && o.detune) o.detune.value = detune
o.start(t); o.stop(t + dur)
g.oscs.push(o)
g.pending++
o.onended = () => { if (--g.pending <= 0) freeGroup(g) }
return o
}
function padChord(c, t, dur, b, shiftNow) {
const rel = 2.2
const att = Math.min(2.6, dur * 0.25)
const cut = b.cut[0] + (b.cut[1] - b.cut[0]) * inten()
const g = mkGroup()
g.end = t + dur + rel + 0.1
const root = deg
for (const d of [root, root + 2, root + 4]) {
const f = degreeFreq(curBiome, d, shiftNow)
const vg = node(g, c.ctx.createGain())
const flt = node(g, c.ctx.createBiquadFilter())
flt.type = 'lowpass'; flt.frequency.value = cut; flt.Q.value = 0.5
const peak = 0.03 * (b.padGain || 1) * (0.85 + 0.3 * inten())
vg.gain.setValueAtTime(FLOOR, t)
vg.gain.linearRampToValueAtTime(peak, t + att)
vg.gain.setValueAtTime(peak, t + dur)
vg.gain.linearRampToValueAtTime(FLOOR, t + dur + rel)
const a = oscNode(c, g, b.pad, f, t, dur + rel + 0.05, -5)
const bb = oscNode(c, g, b.pad, f, t, dur + rel + 0.05, 5)
a.connect(flt); bb.connect(flt); flt.connect(vg); vg.connect(bus)
}
stats.pads++
}
function playNote(c, t, b, shiftNow) {
const f = degreeFreq(curBiome, ni, shiftNow) * 2
const g = mkGroup()
const dur = b.decay
g.end = t + dur + 0.1
const vg = node(g, c.ctx.createGain())
const peak = 0.06 * (0.8 + 0.4 * inten())
vg.gain.setValueAtTime(FLOOR, t)
vg.gain.linearRampToValueAtTime(peak, t + 0.02)
vg.gain.exponentialRampToValueAtTime(FLOOR, t + dur)
const o = oscNode(c, g, b.note, f, t, dur + 0.05)
o.connect(vg)
if (b.bell > 0) {
const bg = node(g, c.ctx.createGain())
bg.gain.setValueAtTime(peak * b.bell, t)
bg.gain.exponentialRampToValueAtTime(FLOOR, t + dur * 0.35)
const o2 = oscNode(c, g, 'sine', f * 2.76, t, dur * 0.35 + 0.05)
o2.connect(bg); bg.connect(bus)
}
vg.connect(bus)
stats.notes++
}
function startBar(c, t) {
if (modeBiome() !== curBiome) curBiome = modeBiome()
shift = keyShiftFor(inten(), act >= 3 ? late : 0)
const b = BIOME_MUSIC[curBiome]
stepDur = 60 / bpmFor(inten(), curBiome, act >= 3 ? late : 0) / 2
if (bar % 2 === 0) {
const r = rnd()
deg = r < 0.34 ? 0 : r < 0.54 ? 3 : r < 0.74 ? 2 : r < 0.9 ? 4 : 1
padChord(c, t, stepDur * 16, b, shift)
}
bar++
}
function step(c, t) {
if (stepInBar === 0) startBar(c, t)
const b = BIOME_MUSIC[curBiome]
const odd = stepInBar & 1
const p = (b.pNote + 0.3 * inten()) * (odd ? 0.5 : 1) * (stepInBar === 0 ? 0.4 : 1)
if (rnd() < p) {
const r = rnd()
ni += r < 0.2 ? -2 : r < 0.45 ? -1 : r < 0.5 ? 0 : r < 0.8 ? 1 : 2
if (ni < 3) ni = 3 + Math.floor(rnd() * 2)
if (ni > 11) ni = 11 - Math.floor(rnd() * 2)
playNote(c, t + (odd ? stepDur * 0.04 : 0), b, shift)
}
stepInBar = (stepInBar + 1) & 7
}
function graph() {
const c = audio && typeof audio.graph === 'function' ? audio.graph() : null
return c && c.ctx && c.out ? c : null
}
function start() {
if (running) return true
const c = graph()
if (!c || c.ctx.state !== 'running') return false
if (!ensureBus(c, c.out)) return false
const now = c.ctx.currentTime
running = true
stats.starts++
biome = biomeIndex(biome); curBiome = modeBiome()
nextT = now + 0.08; stepInBar = 0; bar = 0; deg = 0; ni = 5
setBus(c, level, 0, FADE_IN_S, now)
return true
}
function tick() {
const c = graph()
if (!c) return
const now = c.ctx.currentTime
sweep(now)
if (!running || c.ctx.state !== 'running') return
if (nextT < now - 0.05) nextT = now + 0.05
let n = 0
while (nextT < now + LOOKAHEAD && n++ < MAX_STEPS_PER_TICK) {
try { step(c, nextT) } catch { stats.errors++ }
nextT += stepDur
}
}
function stop(fadeS = 0.8) {
if (!running) return
running = false
stats.stops++
const c = graph()
if (!c || !bus) return
const now = c.ctx.currentTime
const f = Math.max(0.05, fadeS)
const p = bus.gain
const v0 = busAt(now)
const dl = duckLow && duckLow[0] > now && duckLow[0] < now + f ? duckLow : null
param(p, () => { if (p.cancelScheduledValues) p.cancelScheduledValues(now) })
param(p, () => {
p.setValueAtTime(v0, now)
if (dl) p.linearRampToValueAtTime(dl[1], dl[0])
p.linearRampToValueAtTime(0, now + f)
})
track = dl ? [[now, v0], [dl[0], dl[1]], [now + f, 0]] : [[now, v0], [now + f, 0]]
duckLow = null
for (const g of groups) {
const end = now + f + 0.05
g.dying = true
if (g.end > end) { for (const o of g.oscs) param(o, () => o.stop(end)); g.end = end }
}
later(() => { for (const g of [...groups]) if (g.dying) freeGroup(g) }, Math.round((f + 0.4) * 1000))
}
function duck(depth = 0.25, holdS = 0.45, releaseS = 0.7) {
const c = graph()
if (!running || !c || !bus) return
const now = c.ctx.currentTime
const p = bus.gain
const v0 = busAt(now)
const low = Math.min(level * depth, v0)
const t1 = now + 0.05, t2 = t1 + holdS, t3 = t2 + releaseS
param(p, () => { if (p.cancelScheduledValues) p.cancelScheduledValues(now) })
param(p, () => {
p.setValueAtTime(v0, now)
p.linearRampToValueAtTime(low, t1)
p.setValueAtTime(low, t2)
p.linearRampToValueAtTime(level, t3)
})
track = [[now, v0], [t1, low], [t2, low], [t3, level]]
duckLow = [t1, low]
}
function dispose() {
running = false
for (const g of [...groups]) { for (const o of g.oscs) param(o, () => o.stop(0)); freeGroup(g) }
if (bus) { try { bus.disconnect() } catch {   } bus = null; busCtx = null }
track = []; duckLow = null
}
return {
start, tick, stop, duck, dispose,
setIntensity(v) { intensity = clamp01(v) },
setBiome(b) { biome = biomeIndex(b) },
setAct(a, l = 0) { act = actIndex(a); late = clamp01(l) },
get running() { return running },
get intensity() { return intensity },
get biome() { return biome },
get act() { return act },
get late() { return late },
get modeBiome() { return modeBiome() },
get liveGroups() { return groups.size },
get hasBus() { return bus !== null },
get stepSeconds() { return stepDur },
stats,
}
}
