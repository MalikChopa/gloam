import { EV } from '../sim/params.mjs'
export const PATTERNS = {
death: [40, 30, 90],
bolt: [20, 24, 46],
flare: [22],
break: [26],
near: [12],
lost: [16],
gain: [10, 22, 16],
act: [18, 40, 36],
wind: [14, 50, 14],
warn: [10],
}
const MIN_GAP_MS = { death: 400, bolt: 300, flare: 120, break: 150, near: 90, lost: 120, gain: 150, act: 800, wind: 800, warn: 300 }
const PRIORITY = ['death', 'bolt', 'flare', 'break', 'near', 'lost', 'gain', 'act', 'wind', 'warn']
const RANK_OF = []
RANK_OF[EV.DEATH] = 0; RANK_OF[EV.BOLT_HIT] = 1; RANK_OF[EV.FLARE] = 2; RANK_OF[EV.NEAR_MISS] = 4; RANK_OF[EV.LOST] = 5; RANK_OF[EV.BAT_BITE] = 5
RANK_OF[EV.SHIELD_GAIN] = 6; RANK_OF[EV.EMBER_GAIN] = 6; RANK_OF[EV.ACT_START] = 7; RANK_OF[EV.WIND_START] = 8; RANK_OF[EV.BOLT_WARN] = 9
export function createHaptics({ nav = (typeof navigator !== 'undefined' ? navigator : null), enabled = () => true, reduced = () => false, coarse = () => false, now = () => Date.now() } = {}) {
const last = Object.create(null)
const stats = { calls: 0, skipped: 0, errors: 0 }
const can = () => !!nav && typeof nav.vibrate === 'function'
const allowed = () => can() && enabled() && !reduced() && coarse()
function fire(kind) {
if (!allowed()) { stats.skipped++; return false }
const t = now()
if (last[kind] !== undefined && t - last[kind] < MIN_GAP_MS[kind]) { stats.skipped++; return false }
last[kind] = t
try { nav.vibrate(PATTERNS[kind]); stats.calls++; return true } catch { stats.errors++; return false }
}
function dispatch(events, count) {
if (!allowed()) return false
let best = PRIORITY.length
for (let i = 0; i < count; i++) {
const e = events[i]
if (!e) continue
let k = RANK_OF[e.type]
if (e.type === EV.SHIELD_BREAK) k = e.a > 0 ? 3 : undefined
if (k !== undefined && k < best) best = k
}
return best < PRIORITY.length ? fire(PRIORITY[best]) : false
}
function cancel() { if (can()) { try { nav.vibrate(0) } catch { stats.errors++ } } }
return { dispatch, fire, cancel, stats, get available() { return can() } }
}
