import { SWARM_START } from '../sim/params.mjs'
const WORDS = {
fr: { night: 'Nuit #', free: 'Partie libre', seed: 'graine', pts: 'pts', combo: 'combo', dodge: ['esquive', 'esquives'], flare: ['éclat', 'éclats'], cocoon: ['cocon', 'cocons'], bolt: ['éclair esquivé', 'éclairs esquivés'] },
en: { night: 'Night #', free: 'Free run', seed: 'seed', pts: 'pts', combo: 'combo', dodge: ['dodge', 'dodges'], flare: ['flare', 'flares'], cocoon: ['cocoon', 'cocoons'], bolt: ['bolt dodged', 'bolts dodged'] },
}
export function timelineSquares(timeline) {
let s = ''
for (let i = 0; i < timeline.length; i++) {
const r = timeline[i] / SWARM_START
s += r >= 0.66 ? '🟨' : r >= 0.33 ? '🟧' : '🟥'
}
return s
}
export function buildShareText(summary, ctx, lang) {
const L = lang === 'en' ? 'en' : 'fr'
const w = WORDS[L]
const nf = new Intl.NumberFormat(L)
const lines = []
lines.push('GLOAM · ' + (ctx.mode === 'daily' ? w.night + ctx.night : w.free + ' 🌙 (' + w.seed + ' ' + ctx.seed + ')') + (ctx.mode === 'daily' ? ' 🌙' : ''))
lines.push('✨ ' + nf.format(summary.score) + ' ' + w.pts + ' · ' + w.combo + ' x' + summary.maxCombo)
lines.push(timelineSquares(summary.timeline) + ' ' + Math.round(summary.ticks / 60) + ' s')
const parts = []
if (summary.batDodges > 0) parts.push('🦇 ' + summary.batDodges + ' ' + w.dodge[summary.batDodges === 1 ? 0 : 1])
if (summary.flares > 0) parts.push('🔥 ' + summary.flares + ' ' + w.flare[summary.flares === 1 ? 0 : 1])
if (summary.cocoons > 0) parts.push('🛡 ' + summary.cocoons + ' ' + w.cocoon[summary.cocoons === 1 ? 0 : 1])
if (summary.boltDodges > 0) parts.push('⚡ ' + summary.boltDodges + ' ' + w.bolt[summary.boltDodges === 1 ? 0 : 1])
if (parts.length) lines.push(parts.join(' · '))
if (ctx.url) lines.push(ctx.url)
return lines.join('\n')
}
export async function shareText(text, { preferShare = true, env = null } = {}) {
const nav = env ? env.nav : (typeof navigator !== 'undefined' ? navigator : null)
const doc = env ? env.doc : (typeof document !== 'undefined' ? document : null)
if (nav && preferShare && typeof nav.share === 'function') {
try {
await nav.share({ text })
return 'shared'
} catch (e) {
if (e && e.name === 'AbortError') return 'cancelled'
}
}
if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
try {
await nav.clipboard.writeText(text)
return 'copied'
} catch {   }
}
if (doc && typeof doc.createElement === 'function' && doc.body && typeof doc.execCommand === 'function') {
const ta = doc.createElement('textarea')
try {
ta.value = text
ta.setAttribute('readonly', '')
ta.style.position = 'fixed'
ta.style.opacity = '0'
doc.body.appendChild(ta)
ta.select()
if (typeof ta.setSelectionRange === 'function') ta.setSelectionRange(0, text.length)
const ok = doc.execCommand('copy')
return ok ? 'copied' : 'failed'
} catch {
return 'failed'
} finally {
if (ta.parentNode) ta.parentNode.removeChild(ta)
}
}
return 'failed'
}
