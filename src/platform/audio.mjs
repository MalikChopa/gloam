export const MAX_VOICES = 12
export const MASTER_GAIN = 0.8
export const CHIME_P = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]
const FLOOR = 0.001
export const ECHO_S = 0.12
export const ECHO_FEEDBACK = 0.28
export const ECHO_OUT = 0.45
export const LIMIT_KNEE = 0.5
export const LIMIT_HEAD = 0.39
export function limiterCurve(n = 4097) {
const c = new Float32Array(n)
for (let i = 0; i < n; i++) {
const x = (2 * i) / (n - 1) - 1, a = Math.abs(x)
c[i] = a <= LIMIT_KNEE ? x : Math.sign(x) * (LIMIT_KNEE + LIMIT_HEAD * Math.tanh((a - LIMIT_KNEE) / LIMIT_HEAD))
}
return c
}
const MIN_GAP_S = 0.03
export function chimeFreq(n) {
const i = Math.max(0, Math.min(10, Math.floor(Number.isFinite(n) ? n : 0)))
return 523.25 * Math.pow(2, CHIME_P[i] / 12)
}
export function createAudio({ ctor = (typeof globalThis !== 'undefined' ? (globalThis.AudioContext || globalThis.webkitAudioContext) : null) || null, volume = 0.8, muted = false, context = null } = {}) {
let ctx = null
let master = null
let noiseBuf = null
let echoIn = null
let vol = clamp01(volume)
let mute = !!muted
let failed = false
const voices = []
const lastAt = Object.create(null)
const stats = { played: 0, ignoredVoices: 0, ignoredLocked: 0, ignoredMuted: 0, ignoredGap: 0, errors: 0, byName: Object.create(null) }
function clamp01(v) { return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0 }
function applyGain() { if (master) master.gain.value = mute ? 0 : MASTER_GAIN * vol }
function build() {
if (ctx || failed || (!ctor && !context)) return
try {
ctx = context || new ctor()
master = ctx.createGain()
let tail = master
try {
if (typeof ctx.createWaveShaper === 'function') {
const sh = ctx.createWaveShaper()
sh.curve = limiterCurve()
try { sh.oversample = '2x' } catch {   }
master.connect(sh)
tail = sh
}
} catch { tail = master; stats.errors++ }
tail.connect(ctx.destination)
applyGain()
try {
if (typeof ctx.createDelay === 'function') {
const inG = ctx.createGain()
const dl = ctx.createDelay(0.5)
dl.delayTime.value = ECHO_S
const lp = ctx.createBiquadFilter()
lp.type = 'lowpass'; lp.frequency.value = 2600
const fb = ctx.createGain(); fb.gain.value = ECHO_FEEDBACK
const out = ctx.createGain(); out.gain.value = ECHO_OUT
inG.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(out); out.connect(master)
echoIn = inG
}
} catch { echoIn = null; stats.errors++ }
const n = Math.max(1, Math.floor(ctx.sampleRate || 44100))
noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate || 44100)
const d = noiseBuf.getChannelData(0)
let s = 0x9e3779b9
for (let i = 0; i < n; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = (s / 2147483648) - 1 }
} catch {
failed = true; ctx = null; master = null; stats.errors++
}
}
function unlock() {
build()
return resume()
}
function resume() {
if (!ctx) return false
try { if (ctx.state !== 'running' && typeof ctx.resume === 'function') { const p = ctx.resume(); if (p && p.catch) p.catch(() => { stats.errors++ }) } } catch { stats.errors++ }
return true
}
function suspend() {
if (!ctx) return
try { if (ctx.state === 'running' && typeof ctx.suspend === 'function') { const p = ctx.suspend(); if (p && p.catch) p.catch(() => { stats.errors++ }) } } catch { stats.errors++ }
}
function env(g, t, dur, peak, attack = 0) {
if (attack > 0) {
g.gain.setValueAtTime(FLOOR, t)
g.gain.linearRampToValueAtTime(peak, t + attack)
} else {
g.gain.setValueAtTime(peak, t)
}
g.gain.exponentialRampToValueAtTime(FLOOR, t + dur)
}
function sweep(param, t, dur, f0, f1) {
param.setValueAtTime(f0, t)
if (f1 !== f0) param.exponentialRampToValueAtTime(f1, t + dur)
}
function osc(type, f0, f1, dur, peak, t, { lp = null, attack = 0, send = 0 } = {}) {
const o = ctx.createOscillator()
o.type = type
sweep(o.frequency, t, dur, f0, f1)
const g = ctx.createGain()
env(g, t, dur, peak, attack)
let node = o
if (lp) {
const f = ctx.createBiquadFilter()
f.type = 'lowpass'
sweep(f.frequency, t, dur, lp[0], lp[1])
o.connect(f); node = f
}
node.connect(g); g.connect(master)
if (send > 0 && echoIn) { const sg = ctx.createGain(); sg.gain.value = send; g.connect(sg); sg.connect(echoIn) }
o.start(t); o.stop(t + dur + 0.02)
return t + dur + 0.02
}
function noise(ftype, f0, f1, dur, peak, t, send = 0, attack = 0) {
const s = ctx.createBufferSource()
s.buffer = noiseBuf
if (dur > 0.95) s.loop = true
const f = ctx.createBiquadFilter()
f.type = ftype
sweep(f.frequency, t, dur, f0, f1)
if (ftype === 'bandpass') f.Q.value = 1.2
const g = ctx.createGain()
env(g, t, dur, peak, attack)
s.connect(f); f.connect(g); g.connect(master)
if (send > 0 && echoIn) { const sg = ctx.createGain(); sg.gain.value = send; g.connect(sg); sg.connect(echoIn) }
s.start(t); s.stop(t + dur + 0.02)
return t + dur + 0.02
}
const RECIPES = {
pop: (t) => osc('square', 660, 220, 0.06, 0.44, t),
chime: (t, n) => { const f = chimeFreq(n); const e = osc('triangle', f, f, 0.12, 0.30, t, { send: 0.3 }); return Math.max(e, osc('sine', f * 2, f * 2, 0.08, 0.13, t)) },
coin: (t) => {
let e = 0
for (const [f, d] of [[988, 0], [1319, 0.06]]) e = Math.max(e, osc('triangle', f, f, 0.06, 0.32, t + d, { send: 0.3 }), osc('sine', f * 2, f * 2, 0.05, 0.13, t + d))
return e
},
flare: (t) => Math.max(noise('bandpass', 800, 3000, 0.25, 0.38, t, 0.25), osc('sine', 300, 1200, 0.20, 0.25, t, { send: 0.25 }), osc('triangle', 150, 500, 0.20, 0.17, t), noise('bandpass', 4000, 8000, 0.18, 0.10, t)),
zap: (t) => osc('sawtooth', 1200, 300, 0.09, 0.38, t, { lp: [2000, 2000] }),
bite: (t) => Math.max(osc('square', 220, 80, 0.08, 0.40, t), noise('bandpass', 1500, 1500, 0.04, 0.40, t)),
warn: (t) => { osc('sine', 440, 440, 0.05, 0.31, t); return osc('sine', 440, 440, 0.05, 0.31, t + 0.11) },
rumble: (t) => noise('lowpass', 200, 200, 0.30, 0.95, t),
death: (t) => Math.max(osc('sawtooth', 300, 40, 0.60, 0.32, t, { lp: [2000, 200], send: 0.2 }), osc('sine', 110, 35, 0.60, 0.21, t), noise('bandpass', 2500, 400, 0.35, 0.09, t)),
fanfare: (t) => { let e = t; for (let i = 0; i < 4; i++) e = osc('triangle', [523, 659, 784, 1047][i], [523, 659, 784, 1047][i], 0.08, 0.49, t + i * 0.08, { send: 0.25 }); return e },
swell: (t) => osc('sine', 220, 330, 0.40, 0.26, t, { attack: 0.15 }),
ui: (t) => osc('sine', 600, 600, 0.03, 0.29, t),
boltwarn: (t) => Math.max(osc('sine', 520, 1560, 0.75, 0.26, t, { attack: 0.45 }), osc('triangle', 260, 780, 0.75, 0.12, t, { attack: 0.45 })),
thunder: (t) => Math.max(noise('bandpass', 3000, 500, 0.25, 0.52, t, 0.2), osc('sawtooth', 200, 40, 0.35, 0.40, t, { lp: [1800, 120] }), noise('lowpass', 260, 70, 0.45, 0.32, t)),
relight: (t) => Math.max(osc('square', 700, 350, 0.06, 0.16, t, { lp: [2200, 900] }), noise('bandpass', 2400, 2400, 0.04, 0.14, t)),
gust: (t) => noise('bandpass', 240, 800, 1.8, 0.85, t, 0, 0.7),
shield: (t) => { let e = 0; for (const [f, d] of [[784, 0], [1047, 0.08], [1568, 0.16]]) e = Math.max(e, osc('triangle', f, f, 0.14, 0.26, t + d, { send: 0.3 }), osc('sine', f * 2, f * 2, 0.08, 0.10, t + d)); return e },
shieldbreak: (t, p) => (p === 0
? osc('sine', 660, 330, 0.25, 0.28, t, { send: 0.2 })
: Math.max(noise('bandpass', 5000, 1500, 0.12, 0.37, t, 0.2), osc('triangle', 1319, 330, 0.18, 0.31, t, { send: 0.25 }))),
ember: (t) => Math.max(osc('triangle', 440, 880, 0.18, 0.39, t, { send: 0.25 }), noise('bandpass', 1800, 4500, 0.15, 0.22, t), osc('sine', 1760, 1760, 0.10, 0.14, t + 0.05)),
act: (t) => Math.max(osc('triangle', 220, 220, 0.9, 0.13, t, { attack: 0.12, send: 0.3 }), osc('triangle', 330, 330, 0.9, 0.10, t, { attack: 0.12 }), osc('sine', 440, 440, 0.9, 0.07, t, { attack: 0.12 })),
gauntwarn: (t) => {
let e = 0
for (const [f, d, dur] of [[294, 0, 0.07], [294, 0.11, 0.07], [392, 0.22, 0.16]]) e = Math.max(e, osc('triangle', f, f, dur, 0.26, t + d, { send: 0.25 }), osc('sine', f * 2, f * 2, dur, 0.09, t + d))
return e
},
gauntstart: (t) => Math.max(osc('sine', 520, 130, 0.30, 0.36, t, { send: 0.2 }), noise('bandpass', 1200, 300, 0.12, 0.20, t)),
}
const NAMES = Object.keys(RECIPES)
function play(name, p) {
const fn = RECIPES[name]
if (!fn) return false
if (mute || vol <= 0) { stats.ignoredMuted++; return false }
if (!ctx || ctx.state !== 'running') { stats.ignoredLocked++; return false }
try {
const now = ctx.currentTime
if (lastAt[name] !== undefined && now - lastAt[name] < MIN_GAP_S) { stats.ignoredGap++; return false }
let k = 0
for (let i = 0; i < voices.length; i++) if (voices[i] > now) voices[k++] = voices[i]
voices.length = k
if (voices.length >= MAX_VOICES) { stats.ignoredVoices++; return false }
const end = fn(now + 0.005, p)
voices.push(end)
lastAt[name] = now
stats.played++
stats.byName[name] = (stats.byName[name] || 0) + 1
return true
} catch {
stats.errors++
return false
}
}
return {
unlock, resume, suspend, play,
setMuted(b) { mute = !!b; applyGain() },
setVolume(v) { vol = clamp01(v); applyGain() },
get muted() { return mute },
get volume() { return vol },
get ctx() { return ctx },
get state() { return ctx ? ctx.state : 'none' },
get voices() { return voices.length },
graph() { return ctx && master ? { ctx, out: master } : null },
names: NAMES,
stats,
}
}
