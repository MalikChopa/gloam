import { t, fmtNumber } from '../platform/i18n.mjs'
import { SKINS, SKIN_KINDS, skinById, isUnlocked } from '../shared/skins.mjs'
import { ACHIEVEMENTS, achievementById } from '../shared/achievements.mjs'
import { BIOME_COUNT } from '../shared/biomes.mjs'
import { drawComboPreview, drawLanternPreview, drawFireflyPreview } from '../render/preview.mjs'
const NICK_RE = /^[\p{L}\p{N} _-]{1,16}$/u
function h(tag, props, ...kids) {
const el = document.createElement(tag)
if (props) {
for (const k in props) {
const v = props[k]
if (v === undefined || v === null || v === false) continue
if (k === 'class') el.className = v
else if (k === 'text') el.textContent = v
else if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
else el.setAttribute(k, v === true ? '' : String(v))
}
}
for (const c of kids) if (c) el.append(c)
return el
}
function btn(cls, label, onclick, extra) {
return h('button', { type: 'button', class: 'btn ' + cls, onclick, ...extra }, h('span', { text: label }))
}
function sw(label, on, onChange) {
const b = h('button', { type: 'button', class: 'set-row', role: 'switch', 'aria-checked': on ? 'true' : 'false' },
h('span', { class: 'lbl', text: label }), h('span', { class: 'switch' }))
b.addEventListener('click', () => {
const v = b.getAttribute('aria-checked') !== 'true'
b.setAttribute('aria-checked', v ? 'true' : 'false')
onChange(v)
})
return b
}
function seg(key, label, options, current, onChange) {
const group = h('div', { class: 'set-row seg-row', role: 'group', 'aria-label': label }, h('span', { class: 'lbl', text: label }))
const wrap = h('span', { class: 'seg' })
const buttons = []
for (const [value, text] of options) {
const b = h('button', { type: 'button', id: 'seg-' + key + '-' + value, 'aria-pressed': value === current ? 'true' : 'false', text })
b.addEventListener('click', () => {
for (const o of buttons) o.setAttribute('aria-pressed', o === b ? 'true' : 'false')
onChange(value)
})
buttons.push(b)
wrap.append(b)
}
group.append(wrap)
return group
}
export function createScreens(root, handlers) {
let current = null
let lastData = null
let el = null
let retryBtn = null
let toastEl = null
let flushNick = () => true
const live = h('div', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' })
root.append(live)
function fireflies() {
const f = h('div', { class: 'fly-field', 'aria-hidden': 'true' })
for (let i = 0; i < 14; i++) {
const s = h('i', { class: 'fly' })
s.style.setProperty('--x', (6 + ((i * 37) % 88)) + '%')
s.style.setProperty('--y', (10 + ((i * 53) % 80)) + '%')
s.style.setProperty('--d', (7 + (i % 5) * 1.7) + 's')
s.style.setProperty('--t', (2.4 + (i % 4) * 0.8) + 's')
s.style.setProperty('--dl', (-(i % 7) * 0.9) + 's')
s.style.setProperty('--dx', (i % 2 ? 22 : -18) + 'px')
s.style.setProperty('--dy', (i % 3 ? -28 : 20) + 'px')
f.append(s)
}
return f
}
function saveOffBadge(d) {
return d && d.saveOff ? h('p', { class: 'save-off', role: 'status', text: '⚠ ' + t('save.off') }) : null
}
function buildMenu(d) {
const dailySub = d.dailyBest > 0 ? t('home.dailySub', { n: d.night, best: fmtNumber(d.dailyBest) }) : t('home.dailySubNew', { n: d.night })
const freeSub = d.freeBest > 0 ? t('home.freeSub', { best: fmtNumber(d.freeBest) }) : t('home.freeSubNew')
const streak = d.streak > 0 ? h('div', { class: 'streak', role: 'status' }, h('b', { text: d.streak === 1 ? t('home.streak1') : t('home.streak', { n: d.streak }) })) : null
return h('section', { class: 'screen menu', id: 'menu', 'aria-labelledby': 'logo' },
fireflies(),
h('div', { class: 'topbar' }, h('span'),
h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('home.settings'), id: 'btn-settings', onclick: () => handlers.onSettings() },
h('span', { class: 'gear', 'aria-hidden': 'true', text: '⚙' }))),
h('div', { class: 'brand' }, h('h1', { class: 'logo', id: 'logo', text: 'GLOAM' }), h('p', { class: 'tagline', text: t('tagline') })),
h('div', { class: 'home-actions' },
btn('btn-primary', t('home.daily'), () => handlers.onDaily(), { 'data-primary': '', id: 'btn-daily' }),
h('p', { class: 'btn-sub', text: dailySub }),
btn('btn-secondary', t('home.free'), () => handlers.onFree(), { id: 'btn-free' }),
h('p', { class: 'btn-sub', text: freeSub }),
h('div', { class: 'row menu-links' },
btn('btn-ghost', t('home.collection'), () => handlers.onCollection(), { id: 'btn-collection' }),
btn('btn-ghost', t('home.stats'), () => handlers.onStats(), { id: 'btn-stats' })),
streak, saveOffBadge(d)))
}
function buildPause() {
return h('section', { class: 'screen veil pause', id: 'pause', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pause-title' },
h('div', { class: 'card' },
h('h1', { id: 'pause-title', text: t('pause.title') }),
btn('btn-primary', t('pause.resume'), () => handlers.onResume(), { 'data-primary': '', id: 'btn-resume' }),
btn('btn-secondary', t('pause.settings'), () => handlers.onSettings(), { id: 'btn-pause-settings' }),
btn('btn-ghost', t('pause.menu'), () => handlers.onMenu(), { id: 'btn-pause-menu' })))
}
function buildDead(d) {
const cause = t('dead.cause.' + (['bramble', 'bat', 'moth', 'gate', 'time', 'pulse', 'bolt'].includes(d.cause) ? d.cause : 'other'))
let badge = null
if (d.isRecord) badge = h('span', { class: 'badge new', text: t('dead.record') })
else if (d.prevBest > 0 && d.score < d.prevBest && (d.prevBest - d.score) / d.prevBest <= 0.25) {
badge = h('span', { class: 'badge prev', text: t('dead.short', { d: fmtNumber(d.prevBest - d.score) }) })
}
const stat = (v, l) => h('div', { class: 'stat' }, h('b', { text: String(v) }), h('span', { text: l }))
const meta = d.mode === 'daily'
? t('dead.nightLabel', { n: d.night }) + (d.attempts > 1 ? ' · ' + t('dead.attempts', { n: d.attempts }) : '') + (d.streak > 1 ? ' · ' + t('dead.streak', { n: d.streak }) : '')
: t('dead.seedLabel', { seed: d.seed })
toastEl = h('p', { class: 'toast', role: 'status', 'aria-live': 'polite' })
const shareCard = h('div', { class: 'share-card', id: 'share-card', hidden: true },
h('pre', { id: 'share-text', text: d.shareText }), toastEl)
retryBtn = btn('btn-primary', t('dead.retry'), () => handlers.onRetry(), { 'data-primary': '', id: 'retry' })
const unlocks = buildUnlocks(d)
const shareBtn = btn('btn-secondary', t('dead.share'), async () => {
shareCard.hidden = false
const r = await handlers.onShare(d.shareText)
toastEl.textContent = r === 'copied' ? t('share.copied') : r === 'shared' ? t('share.shared') : r === 'failed' ? t('share.failed') : ''
}, { id: 'btn-share', 'aria-controls': 'share-card' })
live.textContent = ''
return h('section', { class: 'screen veil dead' + (d.isRecord ? ' rec' : ''), id: 'dead', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dead-title' },
h('div', { class: 'card scroll' },
h('h1', { id: 'dead-title', text: cause }),
h('p', { class: 'res-score', id: 'dead-score' }, document.createTextNode(fmtNumber(d.score)), h('small', { text: ' pts' })),
h('div', { class: 'badge-row' }, badge),
h('p', { class: 'meta', text: meta }),
unlocks,
h('div', { class: 'stats' }, stat('x' + d.maxCombo, t('dead.statCombo')), stat(d.nearMisses, t('dead.statNear')), stat(d.seconds + ' s', t('dead.statTime'))),
retryBtn,
h('p', { class: 'hint', text: t('dead.retryHint') }),
h('div', { class: 'row' }, shareBtn, btn('btn-ghost', t('dead.menu'), () => handlers.onMenu(), { id: 'btn-dead-menu' })),
d.showBoard ? h('section', { class: 'board', id: 'board', 'aria-live': 'polite', hidden: true }) : null,
shareCard,
saveOffBadge(d)))
}
function unlockItems(d) {
const ids = Array.isArray(d.ach) ? d.ach : []
const keys = Array.isArray(d.skins) ? d.skins : []
const items = []
const covered = new Set()
for (const id of ids) {
const a = achievementById(id)
if (!a) continue
let sub = ''
if (a.skin && keys.includes(a.skin.kind + ':' + a.skin.id)) { covered.add(a.skin.kind + ':' + a.skin.id); sub = t('dead.skinNew', { name: t('skin.name.' + a.skin.id) }) }
items.push({ title: '★ ' + t('ach.' + id + '.t'), sub })
}
for (const k of keys) if (!covered.has(k)) items.push({ title: t('dead.skinNew', { name: t('skin.name.' + k.split(':')[1]) }), sub: '' })
return items
}
function buildUnlocks(d) {
const items = unlockItems(d)
if (items.length === 0) return null
const box = h('div', { class: 'unlocks', id: 'unlocks', role: 'status', 'aria-live': 'polite' })
for (const it of items.slice(0, 2)) box.append(h('p', { class: 'unlock' }, h('b', { text: it.title }), it.sub ? h('span', { text: it.sub }) : null))
if (items.length > 2) box.append(h('p', { class: 'unlock more', text: '+' + (items.length - 2) }))
return box
}
let rafId = 0
function stopPreview() {
if (rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId)
rafId = 0
}
function startPreview(d, canvas) {
const lanternDef = skinById('lantern', d.equipped.lantern), fireDef = skinById('fireflies', d.equipped.fireflies)
const draw = (ms) => drawComboPreview(canvas, d.pal, lanternDef, fireDef, ms / 1000, !!d.reduced)
draw(0)
if (!d.reduced && typeof requestAnimationFrame === 'function') {
const loop = (ms) => { draw(ms); rafId = requestAnimationFrame(loop) }
rafId = requestAnimationFrame(loop)
}
}
function ruleText(rule) {
if (rule.k === 'ach') {
const name = t('ach.' + rule.id + '.t')
return achievementById(rule.id) ? t('skin.rule.achFull', { name, desc: t('ach.' + rule.id + '.d') }) : t('skin.rule.ach', { name })
}
if (rule.k === 'biome') return t('skin.rule.biome', { name: t('biome.name.' + rule.n) })
if (rule.k === 'none') return t('skin.rule.none')
return t('skin.rule.' + rule.k, { n: fmtNumber(rule.n) })
}
function buildCollection(d) {
const cells = []
let unlockedN = 0, total = 0
const sections = SKIN_KINDS.map((kind) => {
const grid = h('div', { class: 'skin-grid', role: 'group', 'aria-label': t(kind === 'lantern' ? 'coll.lantern' : 'coll.fireflies') })
for (const def of SKINS[kind]) {
total++
const open = isUnlocked(def, d.prog)
if (open) unlockedN++
const on = d.equipped[kind] === def.id
const cv = h('canvas', { class: 'skin-cv', 'aria-hidden': 'true' })
cv.cssW = 76; cv.cssH = 44
cells.push([kind, def, cv])
const name = t('skin.name.' + def.id)
const state = on ? t('coll.equipped') : open ? t('coll.equip') : t('coll.lockedRule', { rule: ruleText(def.rule) })
const b = h('button', {
type: 'button', class: 'skin' + (on ? ' on' : '') + (open ? '' : ' locked'), id: 'skin-' + def.id, 'data-kind': kind,
'aria-pressed': open ? (on ? 'true' : 'false') : null, 'aria-disabled': open ? null : 'true',
}, cv, h('span', { class: 'skin-name', text: name }), h('span', { class: 'skin-state', text: state }))
b.addEventListener('click', () => {
if (!open || on) return
handlers.onEquip(kind, def.id)
live.textContent = t('a11y.equipped', { name })
})
grid.append(b)
}
return h('section', { class: 'skin-sec' }, h('h2', { text: t(kind === 'lantern' ? 'coll.lantern' : 'coll.fireflies') }), grid)
})
const pv = h('canvas', { class: 'coll-preview', id: 'coll-preview', 'aria-hidden': 'true' })
pv.cssW = 240; pv.cssH = 130
const el = h('section', { class: 'screen veil collection', id: 'collection', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'coll-title' },
h('div', { class: 'card scroll wide' },
h('div', { class: 'topbar' },
h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('settings.back'), id: 'btn-back', 'data-primary': '', onclick: () => handlers.onBack() }, h('span', { 'aria-hidden': 'true', text: '←' })),
h('h1', { id: 'coll-title', text: t('coll.title') }), h('span')),
h('div', { class: 'coll-pv-wrap' }, pv, h('p', { class: 'fine', text: t('coll.preview') + ' · ' + t('coll.count', { n: unlockedN, total }) })),
...sections,
h('p', { class: 'fine', text: t('coll.note') }),
btn('btn-primary', t('settings.done'), () => handlers.onBack(), { id: 'btn-done' })))
el._after = () => {
for (const [kind, def, cv] of cells) (kind === 'lantern' ? drawLanternPreview : drawFireflyPreview)(cv, d.pal, def, 0, true)
startPreview(d, pv)
}
return el
}
function fmtDuration(totalSeconds) {
const sec = Math.max(0, Math.floor(totalSeconds))
const hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60), ss = sec % 60
if (hh > 0) return t('stats.fmtHM', { h: hh, m: mm })
if (mm > 0) return t('stats.fmtMS', { m: mm, s: ss })
return t('stats.fmtS', { s: ss })
}
function buildStats(d) {
const st = d.stats
const tile = (label, value) => h('div', { class: 'stat-tile' }, h('b', { text: value }), h('span', { text: label }))
const done = new Set(d.ach)
const list = h('ul', { class: 'ach-list' })
for (const a of ACHIEVEMENTS) {
const ok = done.has(a.id)
list.append(h('li', { class: 'ach' + (ok ? ' done' : ' todo'), id: 'ach-' + a.id },
h('span', { class: 'ach-mark', 'aria-hidden': 'true', text: ok ? '★' : '☆' }),
h('span', { class: 'ach-txt' }, h('b', { text: t('ach.' + a.id + '.t') }), h('span', { text: t('ach.' + a.id + '.d') })),
h('span', { class: 'ach-state', text: ok ? t('stats.achDone') : t('stats.achLocked') })))
}
const bestBiome = Math.min(BIOME_COUNT - 1, Math.max(0, st.bestBiome | 0))
return h('section', { class: 'screen veil stats-screen', id: 'stats', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'stats-title' },
h('div', { class: 'card scroll wide' },
h('div', { class: 'topbar' },
h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('settings.back'), id: 'btn-back', 'data-primary': '', onclick: () => handlers.onBack() }, h('span', { 'aria-hidden': 'true', text: '←' })),
h('h1', { id: 'stats-title', text: t('stats.title') }), h('span')),
h('div', { class: 'stat-grid', id: 'stat-grid' },
tile(t('stats.runs'), fmtNumber(st.runs)),
tile(t('stats.bestScore'), fmtNumber(st.bestScore)),
tile(t('stats.bestStreak'), (d.bestStreak === 1 ? t('stats.nights1') : t('stats.nights', { n: fmtNumber(d.bestStreak) }))),
tile(t('stats.bestDist'), t('stats.metres', { n: fmtNumber(Math.round(st.bestDist / 100)) })),
tile(t('stats.time'), fmtDuration(st.ticks / 60)),
tile(t('stats.near'), fmtNumber(st.near)),
tile(t('stats.picked'), fmtNumber(st.picked)),
tile(t('stats.cocoons'), fmtNumber(st.cocoons || 0)),
tile(t('stats.bolts'), fmtNumber(st.bolts || 0)),
tile(t('stats.gaunts'), fmtNumber(st.gaunts || 0)),
tile(t('stats.gauntsClean'), fmtNumber(st.gauntsClean || 0)),
tile(t('stats.bestBiome'), t('biome.name.' + bestBiome))),
h('h2', { id: 'ach-title', text: t('stats.ach') + ' · ' + t('stats.achCount', { n: done.size, total: ACHIEVEMENTS.length }) }),
list,
btn('btn-primary', t('settings.done'), () => handlers.onBack(), { id: 'btn-done' })))
}
function buildSettings(d) {
const s = d.settings
const nick = h('input', { type: 'text', id: 'nick', maxlength: '16', value: d.nick, autocomplete: 'off', spellcheck: 'false', 'aria-describedby': 'nick-help' })
nick.value = d.nick
const nickMsg = h('p', { class: 'fine', id: 'nick-help', text: t('settings.nickHelp') })
const nickErr = h('p', { class: 'fine nick-err', id: 'nick-err', role: 'alert' })
function checkNick(commit) {
const v = nick.value.trim()
if (NICK_RE.test(v)) {
nick.removeAttribute('aria-invalid')
nick.setAttribute('aria-describedby', 'nick-help')
nickErr.textContent = ''
if (commit) handlers.onChange({ nick: v })
return true
} else if (commit || nick.getAttribute('aria-invalid') === 'true') {
nick.setAttribute('aria-invalid', 'true')
nick.setAttribute('aria-describedby', 'nick-help nick-err')
nickErr.textContent = t('settings.nickErr')
}
return false
}
nick.addEventListener('change', () => checkNick(true))
nick.addEventListener('input', () => checkNick(false))
flushNick = () => checkNick(true)
const vol = h('input', { type: 'range', id: 'volume', min: '0', max: '100', step: '10', value: String(Math.round(s.volume * 100)), 'aria-label': t('settings.volume') })
vol.addEventListener('change', () => handlers.onChange({ settings: { volume: Number(vol.value) / 100 } }))
return h('section', { class: 'screen veil settings', id: 'settings', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'set-title' },
h('div', { class: 'card scroll wide' },
h('div', { class: 'topbar' },
h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('settings.back'), id: 'btn-back', 'data-primary': '', onclick: () => handlers.onBack() }, h('span', { 'aria-hidden': 'true', text: '←' })),
h('h1', { id: 'set-title', text: t('settings.title') }), h('span')),
h('div', { class: 'set-list' },
sw(t('settings.sound'), s.sound, (v) => handlers.onChange({ settings: { sound: v } })),
h('div', { class: 'set-row' }, h('label', { class: 'lbl', for: 'volume', text: t('settings.volume') }), vol),
sw(t('settings.music'), s.music !== false, (v) => handlers.onChange({ settings: { music: v } })),
seg('fx', t('settings.reducedFx'), [['auto', t('settings.auto')], ['on', t('settings.on')], ['off', t('settings.off')]], s.reducedFx, (v) => handlers.onChange({ settings: { reducedFx: v } })),
sw(t('settings.cb'), s.cbMode, (v) => handlers.onChange({ settings: { cbMode: v } })),
seg('lang', t('settings.lang'), [['auto', t('settings.auto')], ['fr', 'FR'], ['en', 'EN']], s.lang, (v) => handlers.onChange({ settings: { lang: v } })),
sw(t('settings.touch'), s.touchOffset, (v) => handlers.onChange({ settings: { touchOffset: v } })),
sw(t('settings.ghost'), s.ghost !== false, (v) => handlers.onChange({ settings: { ghost: v } })),
h('p', { class: 'fine', text: t('settings.ghostNote') }),
sw(t('settings.haptics'), s.haptics !== false, (v) => handlers.onChange({ settings: { haptics: v } })),
h('p', { class: 'fine', text: t('settings.hapticsNote') }),
h('div', { class: 'set-row' }, h('label', { class: 'lbl', for: 'nick', text: t('settings.nick') }), nick),
nickMsg, nickErr),
btn('btn-primary', t('settings.done'), () => handlers.onBack(), { id: 'btn-done' })))
}
function setBoard(b) {
const box = el && el.querySelector('#board')
if (!box) return
box.textContent = ''
box.hidden = false
box.setAttribute('aria-busy', b.status === 'loading' ? 'true' : 'false')
box.classList.toggle('offline', b.status === 'offline')
box.append(h('h2', { id: 'board-title', text: b.status === 'offline' ? t('board.offline') : t('board.title') }))
if (b.status === 'loading') { box.append(h('p', { class: 'fine', text: t('board.loading') })); return }
const rows = b.top.slice(0, 5)
if (rows.length === 0) box.append(h('p', { class: 'fine', text: t('board.empty') }))
else {
const ol = h('ol', { class: 'board-list' })
let marked = false
for (const r of rows) {
const mine = !marked && b.you && (b.status === 'offline' ? r.score === b.you.score : r.nick === b.you.nick)
if (mine) marked = true
ol.append(h('li', { class: mine ? 'me' : null },
h('span', { class: 'rk', text: String(r.rank) }), h('span', { class: 'nm', text: r.nick }), h('span', { class: 'sc', text: fmtNumber(r.score) })))
}
box.append(ol)
}
if (b.status === 'online' && b.you && b.you.rank > 5) box.append(h('p', { class: 'fine me-rank', text: t('board.rank', { r: b.you.rank }) }))
if (b.notice) box.append(h('p', { class: 'fine notice', role: 'status', text: t(b.notice) }))
}
function focusId(id) {
const b = id ? document.getElementById(id) : null
if (b) b.focus({ preventScroll: true })
return !!b
}
function show(name, data) {
hide()
lastData = data
current = name
if (name === 'menu') el = buildMenu(data)
else if (name === 'pause') el = buildPause(data)
else if (name === 'dead') el = buildDead(data)
else if (name === 'settings') el = buildSettings(data)
else if (name === 'collection') el = buildCollection(data)
else if (name === 'stats') el = buildStats(data)
else { current = null; return }
root.append(el)
if (el._after) el._after()
if (name === 'dead') live.textContent = fmtNumber(data.score) + ' pts'
const p = el.querySelector('[data-primary]')
if (p) p.focus({ preventScroll: true })
}
function hide() {
stopPreview()
flushNick = () => true
if (el) el.remove()
el = null; current = null; retryBtn = null; toastEl = null
}
function refresh(data) {
if (!current) return
const id = document.activeElement && document.activeElement.id
const sc = el && el.querySelector('.card.scroll')
const top = sc ? sc.scrollTop : 0
show(current, data === undefined ? lastData : data)
if (id) { const b = document.getElementById(id); if (b) b.focus({ preventScroll: true }) }
const sc2 = el && el.querySelector('.card.scroll')
if (sc2 && top) sc2.scrollTop = top
}
return {
show, hide, refresh, setBoard, focusId,
flushNick: () => flushNick(),
get current() { return current },
get retryButton() { return retryBtn },
get element() { return el },
setToast(text) { if (toastEl) toastEl.textContent = text },
}
}
