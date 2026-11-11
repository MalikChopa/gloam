import { RULES_VERSION, MAX_TICKS } from '../sim/params.mjs'
import { decode } from '../sim/replay.mjs'
export const GHOST_MAX = 7
export const GHOST_LOG_MAX = 48000
export const GHOST_TOTAL_MAX = 120000
const KEY_RE = /^[A-Za-z0-9|_.-]{1,64}$/
const LOG_RE = /^[0-9a-zA-Z:;]+$/
function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x) }
export function cleanGhost(g, rules = RULES_VERSION) {
try {
if (!isObj(g)) return null
if (typeof g.key !== 'string' || !KEY_RE.test(g.key)) return null
if (g.rules !== rules) return null
if (!Number.isInteger(g.score) || g.score < 0 || g.score > 1e9) return null
if (!Number.isInteger(g.ticks) || g.ticks < 1 || g.ticks > MAX_TICKS) return null
if (typeof g.log !== 'string' || g.log.length === 0 || g.log.length > GHOST_LOG_MAX || !LOG_RE.test(g.log)) return null
decode(g.log, g.ticks)
return { key: g.key, rules: g.rules, score: g.score, ticks: g.ticks, log: g.log }
} catch {
return null
}
}
function enforce(list) {
const out = list.slice(0, GHOST_MAX)
let total = out.reduce((s, g) => s + g.log.length, 0)
while (out.length > 0 && total > GHOST_TOTAL_MAX) total -= out.pop().log.length
return out
}
export function sanitizeGhosts(raw, rules = RULES_VERSION) {
if (!Array.isArray(raw)) return []
const out = []
const seen = new Set()
for (let i = 0; i < raw.length && i < 4 * GHOST_MAX; i++) {
const g = cleanGhost(raw[i], rules)
if (g && !seen.has(g.key)) { seen.add(g.key); out.push(g) }
}
return enforce(out)
}
export function findGhost(list, key) {
if (!Array.isArray(list) || typeof key !== 'string') return null
return list.find((g) => g.key === key) || null
}
export function putGhost(list, run) {
const cur = Array.isArray(list) ? list : []
const entry = cleanGhost({ key: run && run.key, rules: run && run.rules !== undefined ? run.rules : RULES_VERSION, score: run && run.score, ticks: run && run.ticks, log: run && run.log })
const old = entry ? findGhost(cur, entry.key) : null
if (!entry) return { list: cur, stored: false }
const rest = cur.filter((g) => g.key !== entry.key)
if (old && old.score >= entry.score) return { list: enforce([old, ...rest]), stored: false }
return { list: enforce([entry, ...rest]), stored: true }
}
