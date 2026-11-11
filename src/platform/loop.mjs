const STEP_MS = 1000 / 60
const MAX_STEPS = 5
const MAX_DT = 250
const RING = 2048
export function createLoop({ onTick, onRender, autoPause = true, onAutoPause = null }) {
let raf = 0
let running = false
let paused = false
let last = -1
let acc = 0
let hitUntil = 0
const frameTimes = new Float64Array(RING)
const tickTimes = new Float64Array(RING)
const dts = new Float32Array(240)
const works = new Float32Array(240)
let nFrames = 0, nTicks = 0, nDts = 0, nWorks = 0
let lastWork = 0
function countSince(buf, n, t0) {
let c = 0
const m = n < RING ? n : RING
for (let i = 0; i < m; i++) if (buf[(n - 1 - i) % RING] >= t0) c++; else break
return c
}
function over(buf, n, ms) {
if (n < 2) return 0
const now = buf[(n - 1) % RING]
const c = countSince(buf, n, now - ms)
const oldest = buf[(n - c) % RING]
const span = now - oldest
return span > 0 ? ((c - 1) * 1000) / span : 0
}
const stats = {
fpsOver(ms) { return over(frameTimes, nFrames, ms) },
tpsOver(ms) { return over(tickTimes, nTicks, ms) },
get fps() { return over(frameTimes, nFrames, 2000) },
get fps10() { return over(frameTimes, nFrames, 10000) },
get tps() { return over(tickTimes, nTicks, 2000) },
get frameMsP95() {
const m = nDts < dts.length ? nDts : dts.length
if (m === 0) return 0
const a = Array.from(dts.subarray(0, m)).sort((p, q) => p - q)
return a[Math.min(m - 1, Math.floor(m * 0.95))]
},
get workMsP95() {
const m = nWorks < works.length ? nWorks : works.length
if (m === 0) return 0
const a = Array.from(works.subarray(0, m)).sort((p, q) => p - q)
return a[Math.min(m - 1, Math.floor(m * 0.95))]
},
get workMsMean() {
const m = nWorks < works.length ? nWorks : works.length
if (m === 0) return 0
let sum = 0
for (let i = 0; i < m; i++) sum += works[i]
return sum / m
},
get frames() { return nFrames },
get ticks() { return nTicks },
get paused() { return paused },
}
function frame(t) {
raf = requestAnimationFrame(frame)
let dt = last < 0 ? 0 : t - last
last = t
if (dt < 0) dt = 0
const w0 = performance.now()
if (dt > 0 && !paused) {
dts[nDts % dts.length] = dt > 1000 ? 1000 : dt
nDts++
}
if (dt > MAX_DT) dt = MAX_DT
if (!paused) {
frameTimes[nFrames % RING] = t
nFrames++
}
if (paused) {
acc = 0
} else if (hitUntil > 0) {
acc = 0
if (t >= hitUntil) hitUntil = 0
} else {
acc += dt
let n = 0
while (acc >= STEP_MS && n < MAX_STEPS) {
if (onTick() === false) { acc = 0; break }
tickTimes[nTicks % RING] = t
nTicks++
acc -= STEP_MS
n++
}
if (n >= MAX_STEPS) acc = 0
}
onRender(acc / STEP_MS, dt, lastWork)
lastWork = performance.now() - w0
if (!paused && dt > 0 && lastWork >= 0 && lastWork < 1000) { works[nWorks % works.length] = lastWork; nWorks++ }
}
function pause() { paused = true; acc = 0 }
function resume() {
if (!paused) return
paused = false
acc = 0
last = -1
nFrames = 0; nTicks = 0; nDts = 0; nWorks = 0; lastWork = 0
}
const onVis = () => {
if (document.hidden) { if (onAutoPause) onAutoPause('hidden'); else pause() }
else if (!onAutoPause && document.hasFocus()) resume()
}
const onBlur = () => { if (onAutoPause) onAutoPause('blur'); else pause() }
const onFocus = () => { if (!onAutoPause && !document.hidden) resume() }
function start() {
if (running) return
running = true
last = -1
if (autoPause) {
document.addEventListener('visibilitychange', onVis)
window.addEventListener('blur', onBlur)
window.addEventListener('focus', onFocus)
if (!onAutoPause && (document.hidden || !document.hasFocus())) paused = true
}
raf = requestAnimationFrame(frame)
}
function stop() {
running = false
cancelAnimationFrame(raf)
document.removeEventListener('visibilitychange', onVis)
window.removeEventListener('blur', onBlur)
window.removeEventListener('focus', onFocus)
}
function hitstop(ms) { if (ms > 0) hitUntil = performance.now() + ms }
return { start, stop, pause, resume, hitstop, stats }
}
