const SEED_RE = /^[A-Za-z0-9_-]{1,32}$/
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const T_MAX = 21600
function int(v, lo, hi, dflt) {
if (v === null || !/^\d{1,9}$/.test(v)) return dflt
const n = parseInt(v, 10)
return n < lo ? lo : n > hi ? hi : n
}
export function readFlags(search) {
const p = new URLSearchParams(search || '')
const debug = p.get('debug') === '1'
const t = debug ? int(p.get('t'), 0, T_MAX, 0) : 0
const lang = p.get('lang')
const skill = p.get('skill')
const day = p.get('day')
const seed = p.get('seed')
return {
seed: seed !== null && SEED_RE.test(seed) ? seed : null,
mode: p.get('mode') === 'daily' ? 'daily' : 'free',
day: day !== null && DAY_RE.test(day) ? day : null,
autoplay: p.get('autoplay') === '1',
play: p.get('play') === '1',
retryMs: int(p.get('retry'), 0, 60000, null),
skill: skill !== null && /^(0|1|0?\.\d{1,3})$/.test(skill) ? parseFloat(skill) : null,
t,
invincible: debug && (t > 0 || p.get('invincible') === '1'),
debug,
boxes: p.get('boxes') !== '0',
nopause: p.get('nopause') === '1',
fx: p.get('fx') !== '0',
cb: p.get('cb') === '1',
lang: lang === 'fr' || lang === 'en' ? lang : null,
sw: p.get('sw') === '1',
api: p.get('api') !== '0',
}
}
