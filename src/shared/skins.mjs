function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
export function mixHex(a, b, t) {
const A = hexToRgb(a), B = hexToRgb(b)
const h = (i) => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0')
return '#' + h(0) + h(1) + h(2)
}
export const HUE_SLOTS = 4
export const LANTERN_SKINS = [
{ id: 'ember', flame: null, rule: { k: 'none' } },
{ id: 'moon', flame: { core: '#ffffff', mid: '#e8edf5', halo: '#b9c3dc' }, rule: { k: 'score', n: 3000 } },
{ id: 'moss', flame: { core: '#f2ffe0', mid: '#b8f27a', halo: '#6fc43a' }, rule: { k: 'ach', id: 'regular' } },
{ id: 'snow', flame: { core: '#ffffff', mid: '#eaf2ff', halo: '#b5c6e6' }, rule: { k: 'ach', id: 'peaks' } },
{ id: 'sun', flame: { core: '#fffde0', mid: '#fff06a', halo: '#f2c200' }, rule: { k: 'near', n: 150 } },
]
export const FIREFLY_SKINS = [
{ id: 'gold', a: null, b: null, rule: { k: 'none' } },
{ id: 'ice', a: '#f4f7ff', b: '#b8c4e2', rule: { k: 'streak', n: 3 } },
{ id: 'lime', a: '#eaffc4', b: '#8fdc4e', rule: { k: 'ach', id: 'marsh' } },
{ id: 'pearl', a: '#fff6ee', b: '#f0c9d4', rule: { k: 'ach', id: 'veteran' } },
{ id: 'mosaic', hues: [{ core: '#fff3c4', halo: '#ffc861' }, { core: '#f4f7ff', halo: '#b8c4e2' }, { core: '#eaffc4', halo: '#8fdc4e' }, { core: '#fff6ee', halo: '#f0c9d4' }], rule: { k: 'ach', id: 'score8k' } },
]
export const SKINS = { lantern: LANTERN_SKINS, fireflies: FIREFLY_SKINS }
export const SKIN_KINDS = ['lantern', 'fireflies']
export const DEFAULT_SKINS = { lantern: 'ember', fireflies: 'gold' }
export const MIN_COLOR_DISTANCE = 90
export function skinById(kind, id) {
const list = Object.prototype.hasOwnProperty.call(SKINS, kind) ? SKINS[kind] : null
if (!Array.isArray(list) || typeof id !== 'string') return null
return list.find((s) => s.id === id) || null
}
export function isSkinId(kind, id) { return skinById(kind, id) !== null }
export function ruleMet(rule, prog) {
if (!rule || !prog) return false
const n = rule.n
switch (rule.k) {
case 'none': return true
case 'score': return prog.bestScore >= n
case 'runs': return prog.runs >= n
case 'streak': return prog.bestStreak >= n
case 'near': return prog.near >= n
case 'biome': return prog.bestBiome >= n
case 'ach': return Array.isArray(prog.ach) && prog.ach.includes(rule.id)
default: return false
}
}
export function isUnlocked(def, prog) { return !!def && ruleMet(def.rule, prog) }
export function unlockedIds(kind, prog) { return (SKIN_KINDS.includes(kind) ? SKINS[kind] : []).filter((s) => isUnlocked(s, prog)).map((s) => s.id) }
export function unlockedKeys(prog) {
const out = []
for (const kind of SKIN_KINDS) for (const s of SKINS[kind]) if (isUnlocked(s, prog)) out.push(kind + ':' + s.id)
return out
}
export function lanternColors(def, pal) {
if (!def || !def.flame) return { core: pal.lanternCore, mid: pal.fireCore, halo: pal.fireHalo }
return def.flame
}
export function fireflyHues(def, pal) {
const out = []
if (def && def.hues) { for (let i = 0; i < HUE_SLOTS; i++) out.push({ core: def.hues[i].core, halo: def.hues[i].halo }); return out }
const a = def && def.a ? def.a : pal.fireCore, b = def && def.b ? def.b : pal.fireHalo
for (let i = 0; i < HUE_SLOTS; i++) { const t = i / (HUE_SLOTS - 1); out.push({ core: mixHex(a, b, 0.7 * t), halo: mixHex(a, b, 0.35 + 0.65 * t) }) }
return out
}
export function skinColors(kind, def, pal) {
if (kind === 'lantern') { const c = lanternColors(def, pal); return [c.core, c.mid, c.halo] }
const out = []
for (const h of fireflyHues(def, pal)) out.push(h.core, h.halo)
return out
}
function colorDistance(x, y) {
const A = hexToRgb(x), B = hexToRgb(y)
return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2])
}
export function minDistanceToSignals(kind, def, pal) {
let m = Infinity
for (const c of skinColors(kind, def, pal)) for (const s of [pal.danger, pal.lanternRing, pal.accent]) m = Math.min(m, colorDistance(c, s))
return m
}
export function resolveSkin(kind, id, prog, pal) {
if (!SKIN_KINDS.includes(kind)) return null
const def = skinById(kind, id)
const dflt = skinById(kind, DEFAULT_SKINS[kind])
if (!def || !isUnlocked(def, prog)) return dflt
if (def !== dflt && minDistanceToSignals(kind, def, pal) < MIN_COLOR_DISTANCE) return dflt
return def
}
