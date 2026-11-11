import { createRun, step, summary, prepareInput } from './step.mjs'
import { RULES_VERSION, MAX_TICKS, MAX_LOG_CHARS, LANTERN_ZONE } from './params.mjs'
export const REPLAY_V = 1
const XMIN = LANTERN_ZONE.x0 / 2
const XMAX = LANTERN_ZONE.x1 / 2
const YMIN = LANTERN_ZONE.y0 / 2
const YMAX = LANTERN_ZONE.y1 / 2
const B36 = '0123456789abcdefghijklmnopqrstuvwxyz'
function b36x2(n) { return B36[(n / 36) | 0] + B36[n % 36] }
function digit(ch) { return B36.indexOf(ch) }
export function createRecorder() {
return { parts: [], size: 0, last: -1, kind: 0, a: 0, b: 0, flares: 0 }
}
export function record(rec, tick, input) {
if (tick <= rec.last) throw new Error('record: tick ' + tick + ' <= ' + rec.last)
let kind, a, b
if (input.hasTarget) { kind = 1; a = input.tx / 2; b = input.ty / 2 }
else {
kind = 2
a = (input.dx < 0 ? 1 : input.dx > 0 ? 2 : 0) | (input.dy < 0 ? 4 : input.dy > 0 ? 8 : 0)
b = 0
}
const changed = kind !== rec.kind || a !== rec.a || b !== rec.b
const flare = !!input.flare
if (!changed && !flare) return
let s = ''
const gap = tick - rec.last
if (gap >= 2) s += gap.toString(36) + ':'
if (changed) {
if (kind === 1) s += 'P' + b36x2(a) + b36x2(b)
else s += 'K' + a.toString(16)
rec.kind = kind; rec.a = a; rec.b = b
}
if (flare) { s += 'F'; rec.flares++ }
rec.parts.push(s)
rec.size += s.length + (rec.parts.length > 1 ? 1 : 0)
rec.last = tick
}
export function encodeLog(rec) { return rec.parts.join(';') }
export function encode(rec, state) {
const sm = summary(state)
if (sm.unrankable || sm.poolOverflow) throw new Error('encode: run non classable')
if (!state.over) throw new Error('encode: run non terminé')
if (rec.parts.length === 0) throw new Error('encode: journal vide')
const log = encodeLog(rec)
if (log.length > MAX_LOG_CHARS) throw new Error('encode: journal trop long')
return { v: REPLAY_V, rules: state.rules, mode: state.mode, seedKey: state.seedKey, ticks: sm.ticks, log }
}
function bad(msg, at) { throw new Error('decode: ' + msg + ' (enregistrement ' + at + ')') }
export function decode(str, ticks = MAX_TICKS) {
if (typeof str !== 'string') throw new Error('decode: chaîne attendue')
if (str.length === 0) throw new Error('decode: journal vide')
if (str.length > MAX_LOG_CHARS) throw new Error('decode: journal trop long')
const out = []
let last = -1
let pos = 0
const n = str.length
for (let r = 0; ; r++) {
let gap = 1
let q = pos
while (q < n && digit(str[q]) >= 0) q++
if (q > pos) {
if (str[q] !== ':') bad('gap sans « : »', r)
if (q - pos > 5) bad('gap trop long', r)
gap = 0
for (let k = pos; k < q; k++) gap = gap * 36 + digit(str[k])
if (gap < 2) bad('gap < 2 écrit', r)
pos = q + 1
}
const tick = last + gap
if (tick >= ticks) bad('tick ' + tick + ' >= ticks', r)
const c = str[pos]
let kind = 0, a = 0, b = 0, flare = false
if (c === 'P') {
const d0 = digit(str[pos + 1]), d1 = digit(str[pos + 2]), d2 = digit(str[pos + 3]), d3 = digit(str[pos + 4])
if (d0 < 0 || d1 < 0 || d2 < 0 || d3 < 0) bad('cible mal formée', r)
a = d0 * 36 + d1
b = d2 * 36 + d3
if (a < XMIN || a > XMAX || b < YMIN || b > YMAX) bad('cible hors zone', r)
kind = 1
pos += 5
} else if (c === 'K') {
const m = str.charCodeAt(pos + 1)
let v = -1
if (m >= 48 && m <= 57) v = m - 48
else if (m >= 97 && m <= 102) v = m - 87
if (v < 0) bad('masque mal formé', r)
a = v
kind = 2
pos += 2
} else if (c === 'F') {
} else bad('caractère hors grammaire', r)
if (str[pos] === 'F') { flare = true; pos++ }
else if (kind === 0) bad('enregistrement vide', r)
out.push({ tick, kind, a, b, flare })
last = tick
if (pos >= n) break
if (str[pos] !== ';') bad('séparateur attendu', r)
pos++
if (pos >= n) bad('enregistrement final vide', r)
}
return out
}
export function replayRun({ seedKey, mode, rules, ticks, log }, maxTicks = MAX_TICKS) {
if (rules !== RULES_VERSION) throw new Error('replay: rules ' + rules + ' != ' + RULES_VERSION)
if (!Number.isInteger(ticks) || ticks < 1 || ticks > MAX_TICKS) throw new Error('replay: ticks hors bornes')
const recs = decode(log, ticks)
const state = createRun({ seedKey, mode, rules })
const input = { hasTarget: false, tx: 0, ty: 0, dx: 0, dy: 0, flare: false }
const stop = ticks < maxTicks ? ticks : maxTicks
let i = 0
while (!state.over && state.tick < stop) {
input.flare = false
if (i < recs.length && recs[i].tick === state.tick) {
const r = recs[i++]
if (r.kind === 1) {
input.hasTarget = true; input.tx = r.a * 2; input.ty = r.b * 2; input.dx = 0; input.dy = 0
} else if (r.kind === 2) {
input.hasTarget = false; input.tx = 0; input.ty = 0
input.dx = (r.a & 2 ? 1 : 0) - (r.a & 1 ? 1 : 0)
input.dy = (r.a & 8 ? 1 : 0) - (r.a & 4 ? 1 : 0)
}
input.flare = r.flare
}
prepareInput(input)
step(state, input)
}
return state
}
export function replay(obj, maxTicks = MAX_TICKS) { return summary(replayRun(obj, maxTicks)) }
