import { createRun, step, summary, prepareInput } from './step.mjs'
import { botInput } from './bot.mjs'
import { sinT, cosT } from './trig.mjs'
import { HAZARD_POOL, STRAY_POOL, SWARM_MAX, ITEM_POOL } from './params.mjs'
export const GOLDEN_SEED = 'GLOAM|golden|1'
export const GOLDEN_TICKS = 1200
const GOLDEN_RUNS = [[GOLDEN_SEED, 6000], ['GLOAM|golden|2', 5400], ['GLOAM|golden|3', 4800], ['GLOAM|golden|4', 9600], ['GLOAM|golden|9', 16800],
['GLOAM|golden|0', 0], ['GLOAM|golden|5', 10200]]
function fnv(h, byte) {
h ^= byte & 255
return Math.imul(h, 16777619) >>> 0
}
function fnvString(h, str) {
for (let i = 0; i < str.length; i++) {
const c = str.charCodeAt(i)
h = fnv(h, c)
h = fnv(h, c >> 8)
}
return h
}
const f32 = new Float32Array(1)
const u32 = new Uint32Array(f32.buffer)
function fnvF32(h, v) {
f32[0] = v
const b = u32[0]
h = fnv(h, b)
h = fnv(h, b >>> 8)
h = fnv(h, b >>> 16)
return fnv(h, b >>> 24)
}
function playScripted(seedKey, startTick) {
const s = createRun({ seedKey, mode: 'free', startTick })
const inp = { hasTarget: true, tx: 180, ty: 480, dx: 0, dy: 0, flare: false }
const bot = { hasTarget: true, tx: 180, ty: 480, dx: 0, dy: 0, flare: false }
for (let t = 0; t < GOLDEN_TICKS && !s.over; t++) {
botInput(s, bot, 0.9, 1)
inp.hasTarget = true
inp.tx = bot.tx + 14 * sinT((t * 3) & 255)
inp.ty = bot.ty - 20 + 30 * cosT((t * 2) & 255)
inp.dx = 0
inp.dy = 0
inp.flare = bot.flare || t % 300 === 299
prepareInput(inp)
step(s, inp)
}
return s
}
function hashState(h, s) {
h = fnvString(h, JSON.stringify(summary(s)))
h = fnvF32(h, s.tick)
h = fnvF32(h, s.lantern.x)
h = fnvF32(h, s.lantern.y)
h = fnvF32(h, s.scroll)
h = fnvF32(h, s.distance)
for (let i = 0; i < SWARM_MAX; i++) {
h = fnv(h, s.alive[i])
h = fnvF32(h, s.fx[i])
h = fnvF32(h, s.fy[i])
}
for (let k = 0; k < HAZARD_POOL; k++) {
const z = s.hazards[k]
h = fnv(h, z.active ? 1 : 0)
if (z.active) { h = fnv(h, z.type); h = fnvF32(h, z.x); h = fnvF32(h, z.y) }
}
for (let k = 0; k < STRAY_POOL; k++) {
const z = s.strays[k]
h = fnv(h, z.active ? 1 : 0)
if (z.active) { h = fnvF32(h, z.x); h = fnvF32(h, z.y) }
}
for (let k = 0; k < HAZARD_POOL; k++) {
const z = s.hazards[k]
if (z.active) { h = fnv(h, z.st); h = fnv(h, z.tr); h = fnvF32(h, z.w) }
}
for (let k = 0; k < ITEM_POOL; k++) {
const z = s.items[k]
h = fnv(h, z.active ? z.kind : 0)
if (z.active) { h = fnvF32(h, z.x); h = fnvF32(h, z.y) }
}
h = fnvF32(h, s.shield)
h = fnvF32(h, s.iframes)
h = fnvF32(h, s.windF)
h = fnv(h, s.windSt)
h = fnvF32(h, s.shieldsGained + 256 * s.embers)
h = fnv(h, s.gauntSt)
h = fnvF32(h, s.gauntCount + 256 * s.gauntClean)
for (let k = 0; k < HAZARD_POOL; k++) if (s.hazards[k].active) h = fnv(h, s.hazards[k].gl)
return h
}
export function runGolden() {
let h = 2166136261
for (let r = 0; r < GOLDEN_RUNS.length; r++) h = hashState(h, playScripted(GOLDEN_RUNS[r][0], GOLDEN_RUNS[r][1]))
return h.toString(16).padStart(8, '0')
}
export function goldenStates() {
const out = []
for (let r = 0; r < GOLDEN_RUNS.length; r++) out.push(playScripted(GOLDEN_RUNS[r][0], GOLDEN_RUNS[r][1]))
return out
}
