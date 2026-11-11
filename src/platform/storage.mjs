import { isDayKey, daysBetween } from '../shared/daily.mjs'
import { BIOME_COUNT, biomeAtTicks, distanceAtTick } from '../shared/biomes.mjs'
import { ACH_IDS, progressOf, evaluate } from '../shared/achievements.mjs'
import { sanitizeGhosts, putGhost } from '../shared/ghost.mjs'
import { DEFAULT_SKINS, SKIN_KINDS, isSkinId, skinById, isUnlocked, unlockedKeys } from '../shared/skins.mjs'
import { RULES_VERSION } from '../sim/params.mjs'
export const KEY = 'gloam:v1'
export const SCHEMA = 2
export const MAX_SAVE_CHARS = 256 * 1024
export const HISTORY_MAX = 30
const TRIES_MAX = 5
const NICK_RE = /^[\p{L}\p{N} _-]{1,16}$/u
const NICK_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function makeNick(rand = Math.random) {
let s = 'Luciole-'
for (let i = 0; i < 4; i++) s += NICK_CHARS[Math.floor(rand() * NICK_CHARS.length) % NICK_CHARS.length]
return s
}
export function defaults(rand = Math.random) {
return {
v: SCHEMA,
settings: { sound: true, volume: 0.8, reducedFx: 'auto', cbMode: false, lang: 'auto', touchOffset: true, ghost: true, music: true, haptics: true },
nick: makeNick(rand),
best: { free: 0 },
daily: { key: '', best: 0, attempts: 0, bestTicks: 0, bestReplay: '', tries: [], sent: 0, rules: 0 },
history: [],
streak: { current: 0, best: 0, lastKey: '' },
stats: defaultStats(),
ach: [],
skins: { ...DEFAULT_SKINS },
ghosts: [],
seen: { hint: false },
}
}
export function defaultStats() {
return { runs: 0, ticks: 0, bestScore: 0, bestCombo: 0, bestTicks: 0, bestDist: 0, near: 0, picked: 0, batDodges: 0, flares: 0, bestBiome: 0, cocoons: 0, embers: 0, bolts: 0, gaunts: 0, gauntsClean: 0 }
}
function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x) }
function nat(x, max = 1e9) { return typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.min(Math.floor(x), max) : 0 }
function bool(x, d) { return typeof x === 'boolean' ? x : d }
function pick(x, list, d) { return list.includes(x) ? x : d }
export function migrate(raw, rand = Math.random) {
const d = defaults(rand)
if (!isObj(raw) || (raw.v !== 1 && raw.v !== SCHEMA)) return d
const st = isObj(raw.settings) ? raw.settings : {}
const vol = typeof st.volume === 'number' && Number.isFinite(st.volume) ? Math.round(Math.min(1, Math.max(0, st.volume)) * 10) / 10 : d.settings.volume
const settings = {
sound: bool(st.sound, d.settings.sound),
volume: vol,
reducedFx: pick(st.reducedFx, ['auto', 'on', 'off'], 'auto'),
cbMode: bool(st.cbMode, false),
lang: pick(st.lang, ['auto', 'fr', 'en'], 'auto'),
touchOffset: bool(st.touchOffset, true),
ghost: bool(st.ghost, true),
music: bool(st.music, true),
haptics: bool(st.haptics, true),
}
const nick = typeof raw.nick === 'string' && NICK_RE.test(raw.nick) ? raw.nick : d.nick
const best = { free: isObj(raw.best) ? nat(raw.best.free) : 0 }
const dl = isObj(raw.daily) ? raw.daily : {}
const daily = {
key: isDayKey(dl.key) ? dl.key : '',
best: nat(dl.best),
attempts: nat(dl.attempts, 1e6),
bestTicks: nat(dl.bestTicks, 21600),
bestReplay: typeof dl.bestReplay === 'string' && dl.bestReplay.length <= 200000 && /^[0-9a-zA-Z:;]*$/.test(dl.bestReplay) ? dl.bestReplay : '',
}
daily.tries = Array.isArray(dl.tries) ? dl.tries.filter((x) => Number.isInteger(x) && x >= 0 && x <= 1e9).sort((a, b) => b - a).slice(0, TRIES_MAX) : []
daily.sent = Math.min(nat(dl.sent), daily.best)
daily.rules = nat(dl.rules, 1e6)
if (daily.key === '') { daily.best = 0; daily.attempts = 0; daily.tries = []; daily.sent = 0; daily.rules = 0 }
if (daily.bestReplay === '' || daily.bestTicks === 0) { daily.bestReplay = ''; daily.bestTicks = 0 }
const history = []
if (Array.isArray(raw.history)) {
for (const h of raw.history) {
if (history.length >= HISTORY_MAX) break
if (isObj(h) && isDayKey(h.key) && !history.some((e) => e.key === h.key)) history.push({ key: h.key, best: nat(h.best) })
}
}
const sk = isObj(raw.streak) ? raw.streak : {}
const streak = { current: nat(sk.current, 100000), best: nat(sk.best, 100000), lastKey: isDayKey(sk.lastKey) ? sk.lastKey : '' }
if (streak.lastKey === '') streak.current = 0
if (streak.best < streak.current) streak.best = streak.current
const ss = isObj(raw.stats) ? raw.stats : {}
const stats = {
runs: nat(ss.runs, 1e9), ticks: nat(ss.ticks, 1e12),
bestScore: nat(ss.bestScore), bestCombo: nat(ss.bestCombo, 1e6), bestTicks: nat(ss.bestTicks, 21600), bestDist: nat(ss.bestDist, 1e8),
near: nat(ss.near, 1e9), picked: nat(ss.picked, 1e9), batDodges: nat(ss.batDodges, 1e9), flares: nat(ss.flares, 1e9),
bestBiome: Math.min(BIOME_COUNT - 1, nat(ss.bestBiome, 1e3)),
cocoons: nat(ss.cocoons, 1e9), embers: nat(ss.embers, 1e9), bolts: nat(ss.bolts, 1e9), gaunts: nat(ss.gaunts, 1e9), gauntsClean: nat(ss.gauntsClean, 1e9),
}
stats.bestScore = Math.max(stats.bestScore, best.free, daily.best, ...history.map((e) => e.best))
const out = { v: SCHEMA, settings, nick, best, daily, history, streak, stats, ach: [], skins: { ...DEFAULT_SKINS }, ghosts: sanitizeGhosts(raw.ghosts), seen: { hint: isObj(raw.seen) ? bool(raw.seen.hint, false) : false } }
const have = new Set(Array.isArray(raw.ach) ? raw.ach.filter((x) => typeof x === 'string' && ACH_IDS.includes(x)) : [])
out.ach = ACH_IDS.filter((id) => have.has(id))
out.ach = out.ach.concat(evaluate(progressOf(out)))
const eq = isObj(raw.skins) ? raw.skins : {}
const prog = progressOf(out)
for (const kind of SKIN_KINDS) if (isSkinId(kind, eq[kind]) && isUnlocked(skinById(kind, eq[kind]), prog)) out.skins[kind] = eq[kind]
return out
}
const BAK_KEY = KEY + '.bak'
function backup(storage, txt) {
try {
if (typeof txt !== 'string' || txt.length === 0 || txt.length > MAX_SAVE_CHARS) return
if (storage.getItem(BAK_KEY) !== null) return
storage.setItem(BAK_KEY, txt)
} catch {   }
}
export function load(storage, rand = Math.random) {
try {
if (!storage) return defaults(rand)
const txt = storage.getItem(KEY)
if (txt === null || txt === undefined || txt.length > MAX_SAVE_CHARS) return defaults(rand)
let raw
try { raw = JSON.parse(txt) } catch { backup(storage, txt); return defaults(rand) }
if (!isObj(raw) || (raw.v !== 1 && raw.v !== SCHEMA)) backup(storage, txt)
return migrate(raw, rand)
} catch {
return defaults(rand)
}
}
export function loadStrict(storage, rand = Math.random) {
try {
if (!storage) return null
const txt = storage.getItem(KEY)
if (typeof txt !== 'string' || txt.length > MAX_SAVE_CHARS) return null
let raw
try { raw = JSON.parse(txt) } catch { backup(storage, txt); return null }
if (!isObj(raw) || (raw.v !== 1 && raw.v !== SCHEMA)) { backup(storage, txt); return null }
return migrate(raw, rand)
} catch {
return null
}
}
export function save(storage, data) {
try {
if (!storage) return false
let txt = JSON.stringify(data)
if (txt.length > MAX_SAVE_CHARS) {
txt = JSON.stringify({ ...data, ghosts: [] })
if (txt.length > MAX_SAVE_CHARS) txt = JSON.stringify({ ...data, ghosts: [], daily: { ...data.daily, bestReplay: '', bestTicks: 0 } })
if (txt.length > MAX_SAVE_CHARS) return false
}
storage.setItem(KEY, txt)
return true
} catch {
return false
}
}
export function activeStreak(sv, today) {
const k = sv.streak.lastKey
if (!k || !isDayKey(today)) return 0
const d = daysBetween(k, today)
return d === 0 || d === 1 ? sv.streak.current : 0
}
export function dailyCurrent(sv, key) { return sv.daily.key === key && sv.daily.rules === RULES_VERSION }
export function dailyBest(sv, key) { return dailyCurrent(sv, key) ? sv.daily.best : 0 }
function clone(sv) { return JSON.parse(JSON.stringify(sv)) }
export function recordResult(sv, result) {
const out = clone(sv)
const score = nat(result.score)
const ticks = nat(result.ticks, 21600)
const before = progressOf(sv)
out.stats.runs++
out.stats.ticks += ticks
const counted = !(result.mode === 'daily' && result.practice)
if (counted) {
const st = out.stats
st.bestScore = Math.max(st.bestScore, score)
st.bestCombo = Math.max(st.bestCombo, nat(result.maxCombo, 1e6))
st.bestTicks = Math.max(st.bestTicks, ticks)
st.bestDist = Math.max(st.bestDist, Math.min(1e8, Math.round(distanceAtTick(ticks))))
st.bestBiome = Math.max(st.bestBiome, biomeAtTicks(ticks))
st.near = Math.min(1e9, st.near + nat(result.nearMisses, 1e6))
st.picked = Math.min(1e9, st.picked + nat(result.picked, 1e6))
st.batDodges = Math.min(1e9, st.batDodges + nat(result.batDodges, 1e6))
st.flares = Math.min(1e9, st.flares + nat(result.flares, 1e6))
st.cocoons = Math.min(1e9, (st.cocoons || 0) + nat(result.cocoons, 1e6))
st.embers = Math.min(1e9, (st.embers || 0) + nat(result.embers, 1e6))
st.bolts = Math.min(1e9, (st.bolts || 0) + nat(result.bolts, 1e6))
st.gaunts = Math.min(1e9, (st.gaunts || 0) + nat(result.gaunts, 1e6))
st.gauntsClean = Math.min(1e9, (st.gauntsClean || 0) + nat(result.gauntsClean, 1e6))
}
let prevBest = 0
let stale = false
if (result.mode === 'daily' && !result.practice && isDayKey(result.key)) {
stale = isDayKey(out.daily.key) && daysBetween(result.key, out.daily.key) === 1
if (stale) prevBest = score
else {
if (out.daily.key !== result.key) out.daily = { key: result.key, best: 0, attempts: 0, bestTicks: 0, bestReplay: '', tries: [], sent: 0, rules: RULES_VERSION }
else if (out.daily.rules !== RULES_VERSION) out.daily = { ...out.daily, best: 0, bestTicks: 0, bestReplay: '', tries: [], sent: 0, rules: RULES_VERSION }
prevBest = out.daily.best
out.daily.attempts++
out.daily.tries = (out.daily.tries || []).concat([score]).sort((a, b) => b - a).slice(0, TRIES_MAX)
if (score > out.daily.best) {
out.daily.best = score
const rep = typeof result.replay === 'string' && result.replay.length <= 200000 ? result.replay : ''
out.daily.bestReplay = rep
out.daily.bestTicks = rep ? ticks : 0
}
}
const h = out.history.find((e) => e.key === result.key)
if (h) { if (score > h.best) h.best = score }
else {
out.history.unshift({ key: result.key, best: score })
if (out.history.length > HISTORY_MAX) out.history.length = HISTORY_MAX
}
const sk = out.streak
if (sk.lastKey !== result.key) {
const gap = sk.lastKey ? daysBetween(sk.lastKey, result.key) : 0
if (gap === 1) sk.current++
else if (gap === -1) {   } else sk.current = 1
if (gap >= 0 || gap < -1 || sk.lastKey === '') sk.lastKey = result.key
if (sk.current > sk.best) sk.best = sk.current
}
} else if (result.mode === 'free') {
prevBest = out.best.free
if (score > out.best.free) out.best.free = score
} else {
prevBest = score
}
if (result.mode === 'daily' && typeof result.ghostLog === 'string' && typeof result.seedKey === 'string') {
out.ghosts = putGhost(out.ghosts, { key: result.seedKey, score, ticks, log: result.ghostLog }).list
}
const comparable = !(result.mode === 'daily' && result.practice)
let ach = []
if (counted) {
ach = evaluate(progressOf(out), { ticks, flares: nat(result.flares, 1e6), maxCombo: nat(result.maxCombo, 1e6), score })
out.ach = ACH_IDS.filter((id) => out.ach.includes(id) || ach.includes(id))
}
const was = new Set(unlockedKeys(before))
const skins = unlockedKeys(progressOf(out)).filter((k) => !was.has(k))
return {
ach, skins,
save: out,
isRecord: comparable && score > prevBest && prevBest > 0,
isFirst: comparable && !stale && prevBest === 0,
prevBest,
delta: score - prevBest,
streak: out.streak.current,
}
}
