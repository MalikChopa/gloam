import { createRun, prepareInput, step, snapshot, summary, botInput, EV } from './sim/index.mjs'
import { createRecorder, record, encode, REPLAY_V } from './sim/replay.mjs'
import { FLARE_CD, BOLT_STRIKE_T, T_BOLT, lateAt } from './sim/params.mjs'
import { readFlags } from './shared/flags.mjs'
import { GOLDEN_HASH } from './shared/version.mjs'
import { RULES_VERSION } from './sim/params.mjs'
import { biomeAt, BANNER_MS } from './shared/biomes.mjs'
import { resolveSkin, skinById, isUnlocked } from './shared/skins.mjs'
import { progressOf } from './shared/achievements.mjs'
import { findGhost } from './shared/ghost.mjs'
import { shouldShowFirstHint, hintKind, hintKey, kindOfPointer, kindOfKey, HINT_FIRST_MS } from './shared/hint.mjs'
import { dayKey, isDayKey, addDays, daysBetween, nightNumber, dailySeedKey, freeSeedKey, freeSeedFull } from './shared/daily.mjs'
import { createLoop } from './platform/loop.mjs'
import { createInput } from './platform/input.mjs'
import { createJuice } from './platform/juice.mjs'
import { createAudio } from './platform/audio.mjs'
import { createMusic } from './platform/music.mjs'
import { createHaptics } from './platform/haptics.mjs'
import { createGhostRun, ghostView } from './platform/ghostrun.mjs'
import { load, loadStrict, save, recordResult, activeStreak, dailyBest, dailyCurrent, KEY } from './platform/storage.mjs'
import { buildShareText, shareText } from './platform/share.mjs'
import { setLang, resolveLang, t } from './platform/i18n.mjs'
import { createNet, runSelfCheck } from './platform/net.mjs'
import { createA11y } from './platform/a11y.mjs'
import { registerSW } from './platform/pwa.mjs'
import { createScreens } from './ui/screens.mjs'
import { PALETTE, PALETTE_CB } from './render/palette.mjs'
import { createRenderer } from './render/renderer.mjs'
import { createParticles, PARTICLE_MAX } from './render/particles.mjs'
import { createDebug } from './render/debug.mjs'
const DEATH_DELAY_MS = 600
const HITSTOP_DEATH_MS = 160
const RETRY_LOCK_MS = 350
const RESUME_MS = 500
const WARMUP_PER_FRAME = 600
const AUTOPLAY_SKILL = 0.9
const AUTOPLAY_RISK = 1
const MENU_BOT_SKILL = 0.9
const MENU_BOT_RISK = 1
const MENU_BOT_Y = 350
const SUBMIT_MAX_TRIES = 4
const SUBMIT_MENU_RETRY_MS = 30000
const HINT_MS = 4000
const HUD_MASK_UNITS = 64
const flags = readFlags(location.search)
{
let off = false
try {
const m = typeof document.querySelector === 'function' ? document.querySelector('meta[name="gloam-api"]') : null
off = !!m && m.getAttribute('content') === 'off'
} catch {   }
if (off && new URLSearchParams(location.search).get('api') !== '1') flags.api = false
}
const debugOn = flags.debug
const skipMenu = flags.autoplay || flags.play || flags.seed !== null || flags.mode === 'daily' || flags.t > 0
const canvas = document.getElementById('scene')
const uiRoot = document.getElementById('ui')
const flareBtn = document.getElementById('flare-btn')
const bannerEl = document.getElementById('banner')
const pauseBtn = document.getElementById('pause-btn')
let storage = null
let probeOk = false
try { storage = window.localStorage; storage.getItem('gloam:probe') } catch { storage = null }
if (storage) { try { storage.setItem('gloam:probe', '1'); storage.removeItem('gloam:probe'); probeOk = true } catch { probeOk = false } }
let sv = load(storage)
let saveOk = probeOk
const saveOff = () => !saveOk
function currentLang() { return flags.lang || resolveLang(sv.settings.lang, navigator.language) }
const a11y = createA11y()
const coarseMq = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null
let coarse = !!(coarseMq && coarseMq.matches)
flareBtn.hidden = true
if (coarseMq && coarseMq.addEventListener) coarseMq.addEventListener('change', () => { coarse = coarseMq.matches; syncFlareButton() })
const palette = () => (flags.cb || sv.settings.cbMode ? PALETTE_CB : PALETTE)
let appliedPal = palette()
function currentSkins() {
const prog = progressOf(sv), pal = palette()
return { lantern: resolveSkin('lantern', sv.skins.lantern, prog, pal), fireflies: resolveSkin('fireflies', sv.skins.fireflies, prog, pal) }
}
let skinKey = ''
const skinSel0 = currentSkins()
skinKey = skinSel0.lantern.id + '|' + skinSel0.fireflies.id
const renderer = createRenderer(canvas, { palette: appliedPal, skins: skinSel0 })
function applySkins() {
const sel = currentSkins()
const key = sel.lantern.id + '|' + sel.fireflies.id
if (key !== skinKey) { skinKey = key; renderer.setSkins(sel) }
}
const input = createInput(canvas, renderer, { flareButton: flareBtn, touchOffset: sv.settings.touchOffset })
const inp = { hasTarget: false, tx: 180, ty: 480, dx: 0, dy: 0, flare: false }
const prev = {}
const settings = { reducedFx: false }
const particles = createParticles(PARTICLE_MAX, palette())
let loop = null
const audio = createAudio({ volume: sv.settings.volume, muted: !sv.settings.sound })
const music = createMusic({ audio, seed: randomU32() })
const haptics = createHaptics({ enabled: () => sv.settings.haptics !== false, reduced: () => settings.reducedFx, coarse: () => coarse })
const juice = createJuice({ particles, audio, loop: { hitstop: (ms) => loop.hitstop(ms) }, settings })
const fx = {
time: 0, dtMs: 0, deathT: 0, debug: debugOn && flags.boxes, particles, near: juice.near,
shakeX: 0, shakeY: 0, coarse, lowFx: false, hideHud: false, ghost: null,
act: 0,
}
function applySettings() {
const r = sv.settings.reducedFx
settings.reducedFx = !flags.fx || r === 'on' || (r === 'auto' && a11y.prefersReducedMotion)
document.documentElement.classList.toggle('reduce', settings.reducedFx)
if (appliedPal !== palette()) {
appliedPal = palette()
renderer.setPalette(appliedPal)
particles.setPalette(appliedPal)
schedulePrewarm()
applySkins()
}
input.setTouchOffset(sv.settings.touchOffset)
audio.setMuted(!sv.settings.sound)
audio.setVolume(sv.settings.volume)
setLang(currentLang())
document.documentElement.lang = currentLang()
pauseBtn.setAttribute('aria-label', t('hud.pause'))
flareBtn.setAttribute('aria-label', t('hud.flare'))
canvas.setAttribute('aria-label', t('a11y.scene'))
}
applySettings()
a11y.onReducedMotionChange(applySettings)
pauseBtn.setAttribute('tabindex', '-1')
pauseBtn.addEventListener('click', () => enterPause())
pauseBtn.addEventListener('pointerdown', (e) => e.preventDefault())
const autoSkill = flags.skill === null ? AUTOPLAY_SKILL : flags.skill
const hooks = {
botInput: flags.autoplay ? (st, i) => botInput(st, i, autoSkill, AUTOPLAY_RISK) : null,
recorder: null,
onEvents: (events, count) => { juice.dispatch(events, count); haptics.dispatch(events, count) },
}
let state = null
let seedId = ''
let seedKey = ''
let runMode = 'free'
let runDay = ''
let runPractice = false
let rec = null
let lastReplay = null
let lastResult = null
let ghost = null
const ghostOut = {}
let phase = 'BOOT'
let settingsFrom = 'MENU'
let deathAt = 0
let restartAt = 0
let resumeAt = 0
let firstTickPending = false
let warmLeft = 0
const metrics = {
retryReadyMs: null, restartMs: null, deathToPlayableMs: null, deaths: [], runs: 0, warmupMs: null,
menuReadyMs: null,
menuFirstTickMs: null,
firstTickMs: null,
}
let gestureAt = 0
const net = createNet({ enabled: flags.api })
let apiDay = ''
let apiRulesMismatch = false
let boardToken = 0
let apiLocalDay = ''
let apiDayAt = -1e9
const API_REFRESH_MS = 5 * 60 * 1000
function setApiDay(key) { apiDay = key; apiLocalDay = dayKey(); apiDayAt = performance.now() }
function apiDayNow() {
if (!apiDay) return ''
const d = apiLocalDay ? daysBetween(apiLocalDay, dayKey()) : 0
return d > 0 ? addDays(apiDay, d) : apiDay
}
const currentDay = () => flags.day || apiDayNow() || dayKey()
async function refreshApiDay(force = false) {
if (!flags.api || (!force && performance.now() - apiDayAt < API_REFRESH_MS)) return
apiDayAt = performance.now()
const r = await net.fetchDaily()
if (r.ok && isDayKey(r.data.key)) {
if (r.data.rules !== RULES_VERSION) apiRulesMismatch = true
setApiDay(r.data.key)
}
}
let reloadPending = false
let menuBot = null
let menuTickPending = false
let menuDay = ''
const sub = { key: '', tries: 0, lastAt: -1e9, busy: false, dead: false }
function randomU32() {
const u = new Uint32Array(1)
crypto.getRandomValues(u)
return u[0]
}
function syncFlareButton() {
const playing = phase === 'PLAYING' || phase === 'RESUMING' || phase === 'WARMUP'
flareBtn.hidden = !(coarse && playing)
pauseBtn.hidden = !playing
}
const hintEl = document.createElement('div')
hintEl.id = 'run-hint'
hintEl.hidden = true
hintEl.setAttribute('aria-hidden', 'true')
document.body.appendChild(hintEl)
let hintShown = false
let hintUntil = 0
function showRunHint() {
if (coarse || hintShown || flags.autoplay) return
hintShown = true
hintEl.textContent = t('hud.escHint')
hintEl.hidden = false
hintUntil = performance.now() + HINT_MS
}
function hideRunHint() { hintEl.hidden = true; hintUntil = 0 }
let runBiome = 0
let runBolts = 0
let boltEnd = 0
let boltHurt = false
const biomeEl = document.createElement('div')
biomeEl.id = 'biome-banner'
biomeEl.hidden = true
biomeEl.setAttribute('role', 'status')
document.body.appendChild(biomeEl)
biomeEl.setAttribute('aria-live', 'polite')
let biomeUntil = 0
let actBannerAt = -1e9
function showBiomeBanner(b) {
biomeEl.textContent = t('biome.name.' + b)
biomeEl.classList.remove('act')
biomeEl.hidden = false
biomeUntil = performance.now() + BANNER_MS
}
const ROMAN = ['I', 'II', 'III', 'IV']
function showActBanner(a) {
if (!(a >= 1 && a <= 3)) return
biomeEl.textContent = t('act.banner', { n: ROMAN[a], name: t('act.name.' + a) })
biomeEl.classList.add('act')
biomeEl.hidden = false
const now = performance.now()
biomeUntil = now + BANNER_MS
actBannerAt = now
}
function hideBiomeBanner() { biomeEl.hidden = true; biomeUntil = 0 }
const GAUNT_BANNER_MS = 2000
const GAUNT_CLEAN_MS = 1600
const GAUNT_VIBRATE = [28, 40, 28]
const GAUNT_VIBRATE_CLEAN = [10, 22, 16]
const gauntEl = document.createElement('div')
gauntEl.id = 'gauntlet-banner'
gauntEl.hidden = true
gauntEl.setAttribute('role', 'status')
gauntEl.setAttribute('aria-live', 'polite')
document.body.appendChild(gauntEl)
let gauntUntil = 0
let runGaunts = 0
let runGauntsClean = 0
function showGauntBanner(clean) {
gauntEl.textContent = t(clean ? 'gauntlet.clean' : 'gauntlet.warn')
gauntEl.classList.toggle('clean', clean)
gauntEl.hidden = false
gauntUntil = performance.now() + (clean ? GAUNT_CLEAN_MS : GAUNT_BANNER_MS)
}
function hideGauntBanner() { gauntEl.hidden = true; gauntUntil = 0 }
let gauntVibeAt = -1e9
function vibrateGauntlet(pattern) {
try {
if (!coarse || settings.reducedFx || sv.settings.haptics === false || typeof navigator.vibrate !== 'function') return
const now = performance.now()
if (now - gauntVibeAt < 300) return
gauntVibeAt = now
navigator.vibrate(pattern)
} catch {   }
}
const firstHintEl = document.createElement('div')
firstHintEl.id = 'first-hint'
firstHintEl.hidden = true
firstHintEl.setAttribute('role', 'status')
firstHintEl.setAttribute('aria-live', 'polite')
document.body.appendChild(firstHintEl)
let firstHintUntil = 0
let lastInputKind = ''
function renderFirstHint() { firstHintEl.textContent = t(hintKey(hintKind({ coarse, last: lastInputKind }))) }
function showFirstHint() {
mutate((s) => { s.seen.hint = true })
renderFirstHint()
firstHintEl.hidden = false
firstHintUntil = performance.now() + HINT_FIRST_MS
}
function hideFirstHint() {
if (!firstHintUntil) return
firstHintEl.hidden = true
firstHintUntil = 0
if (phase === 'PLAYING') showRunHint()
}
firstHintEl.addEventListener('click', hideFirstHint)
function noteInput(kind) {
if (kind === '' || kind === lastInputKind) return
lastInputKind = kind
if (firstHintUntil) renderFirstHint()
}
window.addEventListener('pointerdown', (e) => noteInput(kindOfPointer(e.pointerType)), true)
window.addEventListener('pointermove', (e) => noteInput(kindOfPointer(e.pointerType)), true)
window.addEventListener('keydown', (e) => noteInput(kindOfKey(e.code) || (e.code === 'Enter' || e.code === 'NumpadEnter' ? 'keys' : '')), true)
let prewarmTimer = 0
let prewarmHolds = 0
function schedulePrewarm(delay = 250) {
if (prewarmTimer) return
prewarmTimer = setTimeout(() => {
prewarmTimer = 0
if ((phase === 'BOOT' || (phase === 'PLAYING' && state && state.tick < 180)) && prewarmHolds++ < 8) { schedulePrewarm(); return }
if (renderer.prewarm() > 0) schedulePrewarm(60)
}, delay)
if (prewarmTimer && prewarmTimer.unref) prewarmTimer.unref()
}
function settingsData() { return { settings: sv.settings, nick: sv.nick } }
function panelData(name) {
if (name === 'collection') return { pal: palette(), prog: progressOf(sv), equipped: { ...sv.skins }, reduced: settings.reducedFx }
return { stats: sv.stats, bestStreak: sv.streak.best, ach: sv.ach }
}
function persist() { saveOk = save(storage, sv) }
function freshSave() {
try { if (storage && saveOk && storage.getItem(KEY) !== null) { const fresh = loadStrict(storage); if (fresh) return fresh } } catch {   }
return sv
}
function mutate(fn) { sv = freshSave(); fn(sv); persist() }
const screens = createScreens(uiRoot, {
onDaily: () => startFromMenu('daily'),
onFree: () => startFromMenu('free'),
onSettings: () => openSettings(),
onResume: () => resumeGame(),
onMenu: () => backToMenu(),
onRetry: () => requestRestart(),
onShare: (text) => shareText(text, { preferShare: coarse }),
onBack: () => (phase === 'PANEL' ? closePanel() : closeSettings()),
onCollection: () => openPanel('collection'),
onStats: () => openPanel('stats'),
onEquip: (kind, id) => {
const def = skinById(kind, id)
if (!def || !isUnlocked(def, progressOf(sv))) return
mutate((s) => { s.skins[kind] = id })
applySkins()
screens.refresh(panelData('collection'))
},
onChange: (patch) => {
mutate((s) => {
if (patch.nick !== undefined) s.nick = patch.nick
if (patch.settings) Object.assign(s.settings, patch.settings)
})
applySettings()
if (patch.settings && patch.settings.lang !== undefined) screens.refresh(settingsData())
},
})
function startMenuBot() {
state = createRun({ seedKey: dailySeedKey(currentDay()), mode: 'daily' })
snapshot(state, prev)
particles.clear()
juice.reset()
menuBot = { binp: { hasTarget: false, tx: 180, ty: 480, dx: 0, dy: 0, flare: false } }
ghost = null
menuTickPending = true
}
function inMenuBackdrop() { return phase === 'MENU' || phase === 'PANEL' || (phase === 'SETTINGS' && settingsFrom === 'MENU') }
function gameFrozen() { return phase === 'PAUSED' || (phase === 'SETTINGS' && !inMenuBackdrop()) }
function menuTick() {
if (!menuBot || !state) return true
botInput(state, menuBot.binp, MENU_BOT_SKILL, MENU_BOT_RISK)
menuBot.binp.ty = MENU_BOT_Y
prepareInput(menuBot.binp)
snapshot(state, prev)
step(state, menuBot.binp)
if (menuTickPending) {
menuTickPending = false
if (metrics.menuFirstTickMs === null) metrics.menuFirstTickMs = performance.now()
}
juice.dispatch(state.events, state.eventCount, true)
if (state.over) { startMenuBot(); return false }
return true
}
function syncHudMask() {
const cssH = canvas.clientHeight
const sc = renderer.scale || 1
const oy = Math.max(0, (cssH - 640 * sc) / 2)
document.documentElement.style.setProperty('--hud-h', Math.round(oy + HUD_MASK_UNITS * sc) + 'px')
}
function showMenu(freshBot = true) {
if (maybeReload()) return
phase = 'MENU'
syncFlareButton()
bannerEl.hidden = true
fx.deathT = 0
if (freshBot || !menuBot) startMenuBot()
syncHudMask()
const today = currentDay()
menuDay = today
flushPending()
if (apiDay) refreshApiDay().then(() => { if (phase === 'MENU' && currentDay() !== menuDay) showMenu(false) })
screens.show('menu', {
night: nightNumber(today), dailyBest: dailyBest(sv, today), freeBest: sv.best.free, streak: activeStreak(sv, today), saveOff: saveOff(),
})
if (metrics.menuReadyMs === null) metrics.menuReadyMs = performance.now()
}
function startFromMenu(mode) {
restartAt = 0
gestureAt = performance.now()
startRun(mode)
}
function backToMenu() {
if (loop) loop.resume()
screens.hide()
showMenu()
}
function openSettings() {
settingsFrom = phase
phase = 'SETTINGS'
screens.show('settings', settingsData())
a11y.announce(t('a11y.settings'))
}
let panelName = ''
function openPanel(name) {
panelName = name
phase = 'PANEL'
screens.show(name, panelData(name))
a11y.announce(t(name === 'stats' ? 'a11y.stats' : 'a11y.collection'))
}
function closePanel() {
const n = panelName
showMenu(false)
screens.focusId(n === 'stats' ? 'btn-stats' : 'btn-collection')
}
function closeSettings() {
if (screens.flushNick() === false) { screens.focusId('nick'); return }
if (settingsFrom === 'PAUSED') { phase = 'PAUSED'; screens.show('pause'); screens.focusId('btn-pause-settings') } else { showMenu(false); screens.focusId('btn-settings') }
}
function maybeReload() {
if (!reloadPending) return false
location.reload()
return true
}
function startRun(mode) {
menuBot = null
fx.hideHud = false
runBiome = 0
runBolts = 0; boltEnd = 0; boltHurt = false
runGaunts = 0; runGauntsClean = 0
actBannerAt = -1e9
hideBiomeBanner()
hideGauntBanner()
runMode = mode
if (mode === 'daily') {
runPractice = flags.day !== null
runDay = currentDay()
seedId = runDay
seedKey = dailySeedKey(runDay)
} else {
runPractice = false
runDay = ''
seedId = flags.seed || freeSeedKey(randomU32())
seedKey = freeSeedFull(seedId)
}
state = createRun({ seedKey, mode, invincible: flags.invincible })
rec = createRecorder()
hooks.recorder = state.invincible ? null : (tick, i) => record(rec, tick, i)
snapshot(state, prev)
input.reset()
juice.reset()
particles.clear()
screens.hide()
fx.deathT = 0
bannerEl.hidden = !state.invincible
lastResult = null
boardToken++
firstTickPending = true
metrics.runs++
warmLeft = flags.t
phase = warmLeft > 0 ? 'WARMUP' : 'PLAYING'
syncFlareButton()
ghost = null
if (mode === 'daily' && sv.settings.ghost !== false && !state.invincible && !flags.autoplay) {
const entry = findGhost(sv.ghosts, seedKey)
if (entry) ghost = createGhostRun(entry, mode)
}
if (!flags.autoplay && warmLeft === 0) {
a11y.announce(t('a11y.start'))
if (shouldShowFirstHint(sv, { autoplay: flags.autoplay, warmup: warmLeft > 0 })) showFirstHint(); else showRunHint()
}
}
function warmup() {
const t0 = performance.now()
let n = warmLeft < WARMUP_PER_FRAME ? warmLeft : WARMUP_PER_FRAME
warmLeft -= n
while (n-- > 0) {
botInput(state, inp, 1, 0)
prepareInput(inp)
step(state, inp)
}
metrics.warmupMs = (metrics.warmupMs || 0) + (performance.now() - t0)
if (warmLeft <= 0) {
inp.hasTarget = false
snapshot(state, prev)
particles.clear()
juice.reset()
runBiome = biomeAt(state.distance)
phase = 'PLAYING'
}
}
function finishRun() {
const sm = summary(state)
let replayObj = null
if (!sm.unrankable && !sm.poolOverflow) {
try { replayObj = encode(rec, state); lastReplay = replayObj } catch { replayObj = null }
}
let r = null
sm.cocoons = state.shieldsGained | 0
sm.embers = state.embers | 0
sm.boltDodges = runBolts
sm.gaunts = runGaunts
sm.gauntsClean = runGauntsClean
if (!flags.autoplay && !sm.unrankable) {
r = recordResult(freshSave(), {
mode: runMode, key: runDay, score: sm.score, ticks: sm.ticks, replay: replayObj ? replayObj.log : '', practice: runPractice,
nearMisses: sm.nearMisses, picked: sm.picked, batDodges: sm.batDodges, flares: sm.flares, maxCombo: sm.maxCombo,
cocoons: sm.cocoons, embers: sm.embers, bolts: sm.boltDodges, gaunts: sm.gaunts, gauntsClean: sm.gauntsClean,
seedKey, ghostLog: runMode === 'daily' && replayObj ? replayObj.log : undefined,
})
sv = r.save
persist()
}
lastResult = { summary: sm, record: r, replay: replayObj }
}
function handleEvents() {
for (let i = 0; i < state.eventCount; i++) {
const ev = state.events[i]
if (ev.type === EV.ACT_START) showActBanner(ev.a)
else if (ev.type === EV.BOLT_HIT) { boltEnd = state.tick + BOLT_STRIKE_T; boltHurt = false }
else if ((ev.type === EV.LOST || ev.type === EV.SHIELD_BREAK) && ev.a === T_BOLT) boltHurt = true
else if (ev.type === EV.GAUNTLET_WARN) { showGauntBanner(false); vibrateGauntlet(GAUNT_VIBRATE) }
else if (ev.type === EV.GAUNTLET_END) {
runGaunts++
if (ev.x === 0) { runGauntsClean++; showGauntBanner(true); vibrateGauntlet(GAUNT_VIBRATE_CLEAN) }
}
if (ev.type === EV.DEATH) {
phase = 'DYING'
deathAt = performance.now()
metrics.retryReadyMs = null
finishRun()
syncFlareButton()
music.duck()
}
}
if (boltEnd && state.tick >= boltEnd) { if (!boltHurt) runBolts++; boltEnd = 0 }
if (hooks.onEvents) hooks.onEvents(state.events, state.eventCount)
}
function doTick() {
if (phase === 'WARMUP') return true
if (inMenuBackdrop()) return menuTick()
if (phase !== 'PLAYING') return false
if (firstTickPending) {
firstTickPending = false
const tt = performance.now()
if (metrics.firstTickMs === null) metrics.firstTickMs = gestureAt ? (metrics.menuReadyMs || 0) + (tt - gestureAt) : tt
if (restartAt) {
metrics.restartMs = tt - restartAt
metrics.deathToPlayableMs = tt - deathAt
metrics.deaths.push(Math.round(metrics.deathToPlayableMs))
}
}
if (hooks.botInput) hooks.botInput(state, inp); else input.sample(inp)
prepareInput(inp)
if (hooks.recorder) hooks.recorder(state.tick, inp)
snapshot(state, prev)
step(state, inp)
if (ghost) ghost.advance()
handleEvents()
return !state.over
}
function requestRestart() {
if (phase !== 'DYING' && phase !== 'DEAD') return
const now = performance.now()
if (now < deathAt + RETRY_LOCK_MS) return
if (metrics.retryReadyMs === null) metrics.retryReadyMs = now - deathAt
restartAt = now
startRun(runMode)
}
function localBoard(notice) {
const top = dailyCurrent(sv, runDay) ? sv.daily.tries.map((score, i) => ({ rank: i + 1, nick: sv.nick, score })) : []
return { status: 'offline', top, you: { rank: 0, nick: sv.nick, score: lastResult.summary.score }, notice }
}
function pendingBest(day) {
const d = sv.daily
if (!flags.api || apiRulesMismatch || net.selfOk === false) return null
if (!d.key || d.key !== day || d.best <= d.sent || !d.bestReplay || !d.bestTicks) return null
if (!dailyCurrent(sv, day)) return null
if (sub.key !== d.key) { sub.key = d.key; sub.tries = 0; sub.dead = false; metrics.submitTries = 0 }
if (sub.dead || sub.tries >= SUBMIT_MAX_TRIES) return null
return { key: d.key, score: d.best, replay: { v: REPLAY_V, rules: RULES_VERSION, mode: 'daily', seedKey: dailySeedKey(d.key), ticks: d.bestTicks, log: d.bestReplay } }
}
async function submitPending(p) {
sub.busy = true
sub.tries++
sub.lastAt = performance.now()
metrics.submitTries = sub.tries
let res
try { res = await net.submitScore({ nick: sv.nick, claimed: p.score, replay: p.replay }) } catch { res = { ok: false, reason: 'offline', cause: 'network' } }
sub.busy = false
if (!res.ok && res.reason === 'offline' && res.cause === 'network') { sub.tries--; metrics.submitTries = sub.tries }
if (res.ok) {
mutate((s) => { if (s.daily.key === p.key && s.daily.sent < p.score) s.daily.sent = p.score })
} else if (res.reason === 'day' || res.reason === 'rejected') sub.dead = true
else if (res.reason === 'rules') { sub.dead = true; apiRulesMismatch = true }
return res
}
function flushPending() {
if (phase !== 'MENU' || sub.busy || net.selfOk !== true) return
if (performance.now() - sub.lastAt < SUBMIT_MENU_RETRY_MS) return
const p = pendingBest(currentDay())
if (p) submitPending(p)
}
async function loadBoard() {
const token = ++boardToken
const sm = lastResult.summary
const nick = sv.nick
const day = runDay
screens.setBoard({ status: 'loading', top: [] })
let res
if (!flags.api) res = { ok: false, reason: 'offline' }
else if (apiRulesMismatch) res = { ok: false, reason: 'rules' }
else if (net.selfOk === false) res = { ok: false, reason: 'selfcheck' }
else {
const p = sub.busy ? null : pendingBest(day)
res = p ? await submitPending(p) : await net.fetchDaily()
}
if (res.ok && res.data && isDayKey(res.data.key)) setApiDay(res.data.key)
if (token !== boardToken || phase !== 'DEAD') return
let board
if (res.ok && Array.isArray(res.data.top)) {
const top = res.data.top.filter((e) => e && typeof e.nick === 'string' && Number.isInteger(e.score) && Number.isInteger(e.rank)).slice(0, 20)
const idx = top.findIndex((e) => e.nick === nick)
board = { status: 'online', top, you: { nick, score: sm.score, rank: Number.isInteger(res.data.rank) && res.data.rank > 0 ? res.data.rank : idx + 1 }, notice: '' }
} else {
board = localBoard(res.reason === 'rules' ? 'net.rules409' : res.reason === 'selfcheck' ? 'net.selfcheck' : '')
}
metrics.board = board.status
screens.setBoard(board)
}
function showDead() {
if (maybeReload()) return
phase = 'DEAD'
const sm = lastResult.summary
const r = lastResult.record
const nightN = runMode === 'daily' ? nightNumber(runDay) : 0
const url = location.protocol === 'https:' ? location.origin + location.pathname : ''
screens.show('dead', {
score: sm.score, cause: sm.cause, maxCombo: sm.maxCombo, nearMisses: sm.nearMisses, seconds: Math.round(sm.ticks / 60),
mode: runMode, night: nightN, seed: seedId, attempts: runMode === 'daily' && !runPractice ? sv.daily.attempts : 0,
streak: r ? r.streak : 0, isRecord: !!(r && r.isRecord), prevBest: r ? r.prevBest : 0,
shareText: buildShareText(sm, { mode: runMode, night: nightN, seed: seedId, url }, currentLang()), saveOff: saveOff(),
showBoard: runMode === 'daily' && !runPractice && !flags.autoplay && !sm.unrankable,
ach: r ? r.ach : [], skins: r ? r.skins : [],
})
if (runMode === 'daily' && !runPractice && !flags.autoplay && !sm.unrankable) loadBoard()
if (r && r.isRecord) juice.celebrate()
}
function enterPause() {
if (phase !== 'PLAYING' && phase !== 'RESUMING') return
phase = 'PAUSED'
loop.pause()
haptics.cancel()
hideFirstHint()
hideGauntBanner()
syncMusic()
syncFlareButton()
screens.show('pause')
a11y.announce(t('a11y.paused'))
}
function resumeGame() {
if (phase !== 'PAUSED') return
screens.hide()
input.reset()
audio.resume()
resumeAt = performance.now() + RESUME_MS
phase = 'RESUMING'
loop.resume()
syncFlareButton()
a11y.announce(t('a11y.resumed'))
}
let lastBtnP = -1, lastBtnReady = null
function updateFlareButton() {
if (flareBtn.hidden) return
const ready = state.flareCd <= 0
const p = Math.round((1 - state.flareCd / (state.flareCdMax || FLARE_CD)) * 100)
if (p !== lastBtnP) { flareBtn.style.setProperty('--p', p + '%'); lastBtnP = p }
if (ready !== lastBtnReady) { flareBtn.classList.toggle('ready', ready); lastBtnReady = ready }
}
function musicWanted() {
const st = sv.settings
return !flags.autoplay && st.sound && st.music !== false && st.volume > 0 && (phase === 'PLAYING' || phase === 'RESUMING')
}
function syncMusic() {
if (musicWanted()) {
if (!music.running) music.start()
if (state) { music.setIntensity(state.difficulty); music.setBiome(runBiome); music.setAct(state.act, state.act === 3 ? lateAt(state.tick) : 0) }
} else if (music.running) music.stop(phase === 'DYING' || phase === 'DEAD' ? 1.4 : 0.5)
music.tick()
}
function onRender(alpha, dtMs, workMs) {
const now = performance.now()
if (phase === 'WARMUP') warmup()
if (phase === 'RESUMING' && now >= resumeAt) phase = 'PLAYING'
if (phase === 'DYING' || phase === 'DEAD') {
input.poll()
if (metrics.retryReadyMs === null && now >= deathAt + RETRY_LOCK_MS) metrics.retryReadyMs = now - deathAt
const k = (now - deathAt - HITSTOP_DEATH_MS) / DEATH_DELAY_MS
fx.deathT = k < 0 ? 0 : k > 1 ? 1 : k
if (phase === 'DYING' && now >= deathAt + HITSTOP_DEATH_MS + DEATH_DELAY_MS) showDead()
alpha = 1
if (flags.autoplay && now >= deathAt + (flags.retryMs === null ? RETRY_LOCK_MS : flags.retryMs)) requestRestart()
} else if (gameFrozen()) alpha = 1
fx.hideHud = inMenuBackdrop()
if ((phase === 'PLAYING' || phase === 'RESUMING') && state) {
const b = biomeAt(state.distance)
if (b > runBiome) { runBiome = b; if (now - actBannerAt > 500) showBiomeBanner(b) }
}
fx.biome = inMenuBackdrop() ? 0 : runBiome
fx.act = inMenuBackdrop() || !state ? 0 : state.act
if (biomeUntil && (now >= biomeUntil || phase === 'DYING' || phase === 'DEAD' || phase === 'MENU')) hideBiomeBanner()
if (gauntUntil && (now >= gauntUntil || phase === 'DYING' || phase === 'DEAD' || phase === 'MENU')) hideGauntBanner()
fx.time = now / 1000
fx.dtMs = dtMs
juice.update(now, dtMs, workMs)
if (!juice.frozen(now) && !gameFrozen()) particles.update(dtMs)
fx.shakeX = juice.shake.x
fx.shakeY = juice.shake.y
fx.lowFx = juice.degraded
fx.coarse = coarse
fx.ghost = ghost && sv.settings.ghost !== false && (phase === 'PLAYING' || phase === 'RESUMING' || phase === 'PAUSED' || phase === 'SETTINGS') ? ghostView(ghost, ghostOut) : null
syncMusic()
updateFlareButton()
if (hintUntil && (now >= hintUntil || phase !== 'PLAYING')) hideRunHint()
if (firstHintUntil && (now >= firstHintUntil || (phase !== 'PLAYING' && phase !== 'RESUMING') || (state && state.flares > 0))) hideFirstHint()
renderer.draw(prev, state, alpha, fx)
if (dbg) dbg.update(now)
}
loop = createLoop({
onTick: doTick, onRender, autoPause: !flags.nopause,
onAutoPause: () => enterPause(),
})
input.onFlare(() => requestRestart())
window.addEventListener('keydown', (e) => {
if (e.code === 'Escape') {
if (phase === 'PLAYING' || phase === 'RESUMING') { e.preventDefault(); enterPause() }
else if (phase === 'PAUSED') { e.preventDefault(); resumeGame() }
else if (phase === 'SETTINGS') { e.preventDefault(); closeSettings() }
else if (phase === 'PANEL') { e.preventDefault(); closePanel() }
else if (phase === 'DEAD') { e.preventDefault(); backToMenu() }
return
}
if (e.code === 'KeyP' && !e.repeat && !(document.activeElement && document.activeElement.tagName === 'INPUT')) {
if (phase === 'PLAYING' || phase === 'RESUMING') enterPause()
else if (phase === 'PAUSED') resumeGame()
return
}
if ((e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') && !e.repeat && (phase === 'DYING' || phase === 'DEAD')) {
const a = document.activeElement
const other = a && a !== document.body && a.id !== 'retry' && (a.tagName === 'BUTTON' || a.tagName === 'INPUT')
if (other) return
e.preventDefault()
requestRestart()
}
})
uiRoot.addEventListener('click', (e) => {
if (phase === 'DEAD' && e.target && e.target.id === 'dead') requestRestart()
})
let audioStateHooked = false
function onAudioState() { if (!document.hidden && audio.state !== 'running') audio.resume() }
function unlockAudio() {
if (!audio.ctx) audio.unlock()
else if (audio.state !== 'running') audio.resume()
if (!audioStateHooked && audio.ctx) {
audioStateHooked = true
try { if (typeof audio.ctx.addEventListener === 'function') audio.ctx.addEventListener('statechange', onAudioState) } catch {   }
}
}
const GESTURES = ['pointerup', 'touchend', 'click', 'keydown']
for (const ev of GESTURES) window.addEventListener(ev, unlockAudio, true)
document.addEventListener('visibilitychange', () => {
if (document.hidden) audio.suspend()
else {
if (audio.ctx) audio.resume()
if (phase === 'MENU' && menuDay && currentDay() !== menuDay) showMenu(false)
}
})
uiRoot.addEventListener('click', (e) => { if (e.target && e.target.closest && e.target.closest('button')) audio.play('ui') })
a11y.trapFocus(() => screens.element)
async function afterFirstRender() {
const t0 = performance.now()
try {
const { runGolden } = await import('./sim/golden.mjs')
const expected = debugOn && new URLSearchParams(location.search).get('badgolden') === '1' ? 'badgolden' : GOLDEN_HASH
const ok = runSelfCheck({ runGolden, expected })
net.setSelfCheck(ok)
metrics.selfCheck = ok ? 'ok' : 'fail'
} catch { net.setSelfCheck(false); metrics.selfCheck = 'fail' }
metrics.selfCheckMs = performance.now() - t0
if (flags.api) {
const r = await net.fetchDaily()
metrics.api = r.ok ? 'on' : 'off'
if (r.ok && isDayKey(r.data.key)) {
if (r.data.rules !== RULES_VERSION) apiRulesMismatch = true
const first = !apiDay
setApiDay(r.data.key)
if (first && r.data.key !== dayKey() && phase === 'MENU') showMenu(false)
flushPending()
}
} else metrics.api = 'off'
schedulePrewarm()
registerSW({ protocol: location.protocol, swFlag: flags.sw, onUpdate: () => { reloadPending = true; if (phase === 'MENU' || phase === 'DEAD') maybeReload() } })
.then((reg) => { metrics.sw = reg ? 'registered' : 'none' })
}
requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(afterFirstRender, 0)))
let sizeKey = ''
function onSize() {
const r = canvas.getBoundingClientRect()
const key = r.width + 'x' + r.height + '@' + (window.devicePixelRatio || 1)
if (key === sizeKey) return
sizeKey = key
renderer.resize()
syncHudMask()
if (state) renderer.draw(prev, state, 1, fx)
}
if (typeof ResizeObserver === 'function') new ResizeObserver(onSize).observe(canvas)
window.addEventListener('resize', onSize)
let dbg = null
if (debugOn) {
dbg = createDebug(() => ({
fps: loop.stats.fps, fps10: loop.stats.fps10, tps: loop.stats.tps, frameMsP95: loop.stats.frameMsP95, workMsP95: loop.stats.workMsP95, workMsMean: loop.stats.workMsMean, degraded: juice.degraded,
tick: state.tick, difficulty: state.difficulty, distance: state.distance,
count: state.count, lightR: state.lightR, score: state.score, combo: state.combo, nearMisses: state.nearMisses,
flares: state.flares, flareCd: state.flareCd, picked: state.picked,
seed: seedId, phase, paused: loop.stats.paused, invincible: state.invincible,
particles: particles.active, particlesMax: particles.maxActive, budget: particles.budget,
shakePx: Math.max(Math.abs(juice.shake.x), Math.abs(juice.shake.y)), eventsDropped: state.eventsDropped,
...metrics,
}))
const dbg2 = document.createElement('pre')
dbg2.id = 'debug-j2b'
dbg2.setAttribute('aria-hidden', 'true')
document.body.appendChild(dbg2)
setInterval(() => {
const f = (v) => (typeof v === 'number' && isFinite(v) ? v.toFixed(0) : '-')
dbg2.textContent = 'firstTickMs ' + f(metrics.firstTickMs) + '  menuFirstTickMs ' + f(metrics.menuFirstTickMs) + '  menuReadyMs ' + f(metrics.menuReadyMs) + '\n' +
'son ' + audio.state + (audio.muted ? ' (coupé)' : '') + '  joués ' + audio.stats.played + ' voix ' + audio.voices + '\n' +
'coût JS/image p95 ' + (loop.stats.workMsP95).toFixed(2) + ' ms  moy ' + (loop.stats.workMsMean).toFixed(2) + ' ms  dégradé ' + (juice.degraded ? 'oui' : 'non')
}, 250)
window.__gloam = {
audio, net, a11y, renderer, music, haptics,
get ghost() { return ghost },
get skinKey() { return skinKey },
get runBiome() { return runBiome },
get apiDay() { return apiDay },
get state() { return state },
get phase() { return phase },
get seedKey() { return seedKey },
get paused() { return loop.stats.paused },
get save() { return sv },
get saveOk() { return saveOk },
get result() { return lastResult },
screens,
input: inp,
metrics,
stats: loop.stats,
flags,
particles,
juice,
step(n = 1) { let k = 0; while (k < n && phase === 'PLAYING') { doTick(); k++ } return k },
summary: () => summary(state),
restart: requestRestart,
start: (mode) => startFromMenu(mode === 'daily' ? 'daily' : 'free'),
pause: enterPause,
resume: resumeGame,
firstWall: () => state.chunkLog[0] || null,
exportReplay: () => (lastReplay ? JSON.parse(JSON.stringify(lastReplay)) : null),
}
}
if (skipMenu) startRun(flags.mode === 'daily' ? 'daily' : 'free')
else showMenu()
loop.start()
