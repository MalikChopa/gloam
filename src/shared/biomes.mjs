import { scrollAt } from '../sim/params.mjs'
export const BIOME_IDS = ['lisiere', 'marais', 'cimes']
export const BIOME_TABLE = [
{ id: 'lisiere', tick: 0, dist: 0 },
{ id: 'marais', tick: 4050, dist: distanceAtTick(4050) },
{ id: 'cimes', tick: 9000, dist: distanceAtTick(9000) },
]
export const BIOME_COUNT = BIOME_TABLE.length
export const FADE_S = 3
export const FADE_REDUCED_S = 1
export const BANNER_MS = 2000
export function biomeAt(distance) {
if (!(distance > 0)) return 0
let b = 0
for (let i = 1; i < BIOME_TABLE.length; i++) if (distance >= BIOME_TABLE[i].dist) b = i
return b
}
export function biomeAtTicks(ticks) {
if (!(ticks > 0)) return 0
let b = 0
for (let i = 1; i < BIOME_TABLE.length; i++) if (ticks >= BIOME_TABLE[i].tick) b = i
return b
}
export function distanceAtTick(ticks) {
const n = Math.min(21600, Math.max(0, Math.floor(Number.isFinite(ticks) ? ticks : 0)))
let d = 0
for (let k = 0; k < n; k++) d += scrollAt(k)
return d
}
export function fadeProgress(elapsed, reduced = false) {
const len = reduced ? FADE_REDUCED_S : FADE_S
if (!(elapsed > 0)) return 0
const x = elapsed >= len ? 1 : elapsed / len
return x * x * (3 - 2 * x)
}
