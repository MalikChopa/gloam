import { EV } from '../sim/params.mjs'
import { PK } from '../render/particles.mjs'
export function createJuice({ particles, audio = null, loop, settings = {} }) {
const shake = { x: 0, y: 0, amp: 0, t0: 0, dur: 1 }
const near = { combo: 0, at: 0 }
let freezeUntil = 0
let degraded = false
let perfAcc = 0, perfWork = 0, perfN = 0, perfT0 = 0
const stats = { hitstops: 0, shakes: 0, lastHitstopMs: 0 }
const queue = []
let relightAt = -1e9
const reduced = () => !!settings.reducedFx
function emit(kind, x, y, n) {
particles.emit(kind, x, y, reduced() ? n * 0.3 : n)
}
function addShake(now, amp, ms) {
if (reduced() || amp <= 0) return
const left = shake.amp * (1 - (now - shake.t0) / shake.dur)
if (amp >= left) { shake.amp = amp; shake.t0 = now; shake.dur = ms }
stats.shakes++
}
function hitstop(now, ms) {
if (ms <= 0) return
if (reduced()) ms *= 0.5
if (now + ms <= freezeUntil) return
freezeUntil = now + ms
stats.hitstops++
stats.lastHitstopMs = ms
if (loop) loop.hitstop(ms)
}
function play(name, p) { if (audio) audio.play(name, p) }
function dispatch(events, count, ambient = false) {
const now = performance.now()
if (ambient) {
for (let i = 0; i < count; i++) {
const e = events[i]
if (e.type === EV.LOST) emit(PK.LOST, e.x, e.y, 5)
else if (e.type === EV.NEAR_MISS) emit(PK.NEAR, e.x, e.y, 5)
else if (e.type === EV.FLARE) emit(PK.PALE, e.x, e.y, 12)
}
return
}
for (let i = 0; i < count; i++) {
const e = events[i]
switch (e.type) {
case EV.LOST:
emit(PK.LOST, e.x, e.y, 10); addShake(now, 2, 120); play('pop'); break
case EV.NEAR_MISS:
emit(PK.NEAR, e.x, e.y, 8); near.combo = e.a; near.at = now / 1000; play('chime', e.a); break
case EV.PICKUP:
emit(PK.GOLD, e.x, e.y, 6); play('coin'); break
case EV.FLARE:
emit(PK.PALE, e.x, e.y, 24); hitstop(now, 30); addShake(now, 3, 150); play('flare'); break
case EV.FLARE_HIT:
case EV.MOTH_BURN:
emit(PK.PALE, e.x, e.y, 12); hitstop(now, 40); addShake(now, 2, 100); play('zap'); break
case EV.BAT_WARN:
play('warn'); break
case EV.GATE_WARN:
emit(PK.DUST, e.x, e.y, 6); addShake(now, 1, 100); play('rumble'); break
case EV.BAT_BITE:
emit(PK.LOST, e.x, e.y, 10); hitstop(now, 50); addShake(now, 4, 180); play('bite'); break
case EV.DEATH:
emit(PK.DEATH, e.x, e.y, 40); hitstop(now, 160); addShake(now, 6, 300); play('death'); break
case EV.DIFFICULTY_UP:
play('swell'); break
case EV.BOLT_WARN:
play('boltwarn'); break
case EV.BOLT_HIT:
emit(PK.PALE, e.x, e.y, 10); hitstop(now, 25); addShake(now, 3, 140); play('thunder'); break
case EV.PULSE_ON:
if (e.y > 150 && e.y < 640 && now - relightAt >= 350) { relightAt = now; emit(PK.DUST, e.x, e.y, 3); play('relight') }
break
case EV.WIND_WARN:
play('gust'); break
case EV.SHIELD_GAIN:
emit(PK.PALE, e.x, e.y, 14); play('shield'); break
case EV.SHIELD_BREAK:
if (e.a > 0) { emit(PK.PALE, e.x, e.y, 14); hitstop(now, 30); addShake(now, 2, 100); play('shieldbreak', 1) } else play('shieldbreak', 0)
break
case EV.EMBER_GAIN:
emit(PK.GOLD, e.x, e.y, 10); play('ember'); break
case EV.ACT_START:
play('act'); break
case EV.GAUNTLET_WARN:
play('gauntwarn', e.a); break
case EV.GAUNTLET_START:
addShake(now, 1, 120); play('gauntstart', e.a); break
case EV.GAUNTLET_END:
if (e.x === 0) play('ember')
break
default: break
}
}
}
function celebrate() {
const now = performance.now()
for (let i = 0; i < 5; i++) queue.push({ at: now + i * 200, n: 12 })
play('fanfare')
}
function update(now, dtMs, workMs = dtMs) {
for (let i = queue.length - 1; i >= 0; i--) {
if (now >= queue[i].at) {
const n = queue[i].n
queue.splice(i, 1)
for (let k = 0; k < 3; k++) emit(PK.CONFETTI, 60 + Math.random() * 240, 20 + Math.random() * 40, n / 3)
}
}
const k = shake.amp > 0 ? 1 - (now - shake.t0) / shake.dur : 0
if (k > 0) {
const a = shake.amp * k
shake.x = (Math.random() * 2 - 1) * a
shake.y = (Math.random() * 2 - 1) * a
} else { shake.x = 0; shake.y = 0; shake.amp = 0 }
if (dtMs > 0 && dtMs < 1000 && !(now < freezeUntil)) {
if (perfT0 === 0) perfT0 = now
perfAcc += dtMs; perfWork += workMs; perfN++
if (now - perfT0 >= 2000) {
const work = perfWork / perfN, gap = perfAcc / perfN
if (work > 14 || gap > 25) degraded = true
else if (work < 12 && gap < 20) degraded = false
particles.setBudget(degraded ? 0.5 : 1)
perfAcc = 0; perfWork = 0; perfN = 0; perfT0 = now
}
}
}
return {
dispatch, update, celebrate, play, shake, near, stats,
frozen(now) { return now < freezeUntil },
get degraded() { return degraded },
reset() { near.at = 0; shake.amp = 0; shake.x = 0; shake.y = 0; freezeUntil = 0; queue.length = 0; relightAt = -1e9 },
}
}
