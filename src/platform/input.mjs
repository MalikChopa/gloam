import { TOUCH_OFFSET_Y } from '../sim/params.mjs'
const KEYS = {
ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd',
}
export const GAMEPAD_DEADZONE = 0.25
const TAP_MS = 180
const TAP_PX = 12
const FLARE_LOCK_MS = 250
export function padToInput(pad, deadzone = GAMEPAD_DEADZONE, out = { dx: 0, dy: 0, a: false }) {
out.dx = 0; out.dy = 0; out.a = false
if (!pad) return out
const ax = pad.axes || [], bt = pad.buttons || []
const pressed = (i) => !!(bt[i] && (bt[i].pressed || bt[i].value > 0.5))
const x = Number(ax[0]) || 0, y = Number(ax[1]) || 0
out.dx = Math.abs(x) > deadzone ? (x > 0 ? 1 : -1) : 0
out.dy = Math.abs(y) > deadzone ? (y > 0 ? 1 : -1) : 0
if (pressed(14)) out.dx = -1
else if (pressed(15)) out.dx = 1
if (pressed(12)) out.dy = -1
else if (pressed(13)) out.dy = 1
out.a = pressed(0)
return out
}
export function createInput(canvas, view, { touchOffset: touchOffsetInit = true, flareButton = null, getPads = null } = {}) {
const padsFn = getPads || (() => (typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []))
let padA = false
const padOut = { dx: 0, dy: 0, a: false }
let padDx = 0, padDy = 0
let touchOffset = touchOffsetInit
let hasTarget = false
let tx = 0, ty = 0
let usePointer = false
const held = { l: false, r: false, u: false, d: false }
const latched = { l: false, r: false, u: false, d: false }
let flare = false
let flareCb = null
let flareLockUntil = 0
const ctrl = new AbortController()
const opt = { signal: ctrl.signal }
let primary = -1
let pending = false
let t0 = 0, x0 = 0, y0 = 0
let lastE = { clientX: 0, clientY: 0 }
const fingers = new Set()
function setTargetFrom(e) {
const p = view.toLogical(e.clientX, e.clientY)
tx = p.x
ty = p.y - (e.pointerType === 'touch' && touchOffset ? TOUCH_OFFSET_Y : 0)
hasTarget = true
usePointer = true
}
function raiseFlare() {
if (performance.now() >= flareLockUntil) flare = true
if (flareCb) flareCb()
}
canvas.addEventListener('pointermove', (e) => {
if (e.pointerType === 'touch') {
if (e.pointerId !== primary) return
lastE = e
if (pending) {
const dx = e.clientX - x0, dy = e.clientY - y0
if (dx * dx + dy * dy < TAP_PX * TAP_PX) return
pending = false
}
setTargetFrom(e)
} else setTargetFrom(e)
}, opt)
canvas.addEventListener('pointerdown', (e) => {
if (e.pointerType === 'touch') {
try { canvas.setPointerCapture(e.pointerId) } catch {   }
fingers.add(e.pointerId)
if (primary < 0) {
primary = e.pointerId
pending = true
t0 = performance.now(); x0 = e.clientX; y0 = e.clientY; lastE = e
} else if (fingers.size === 2) {
raiseFlare()
}
return
}
setTargetFrom(e)
if (e.pointerType === 'mouse' && e.button !== 0) return
try { canvas.setPointerCapture(e.pointerId) } catch {   }
raiseFlare()
}, opt)
function release(e, cancelled) {
if (e.pointerType !== 'touch') return
fingers.delete(e.pointerId)
if (e.pointerId !== primary) return
if (pending && !cancelled && performance.now() - t0 < TAP_MS) raiseFlare()
primary = -1
pending = false
}
canvas.addEventListener('pointerup', (e) => release(e, false), opt)
canvas.addEventListener('pointercancel', (e) => release(e, true), opt)
canvas.addEventListener('contextmenu', (e) => e.preventDefault(), opt)
if (flareButton) {
flareButton.addEventListener('pointerdown', (e) => { e.preventDefault(); raiseFlare() }, opt)
flareButton.addEventListener('contextmenu', (e) => e.preventDefault(), opt)
}
const isControl = (e) => { const tg = e.target && e.target.tagName; return tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || tg === 'BUTTON' }
window.addEventListener('keydown', (e) => {
if (isControl(e) || e.ctrlKey || e.metaKey || e.altKey) return
const d = KEYS[e.code]
if (d) {
e.preventDefault()
if (e.repeat) return
held[d] = true
latched[d] = true
usePointer = false
} else if (e.code === 'Space') {
e.preventDefault()
if (!e.repeat) raiseFlare()
}
}, opt)
window.addEventListener('keyup', (e) => {
const d = KEYS[e.code]
if (d) held[d] = false
}, opt)
window.addEventListener('blur', () => { held.l = held.r = held.u = held.d = false }, opt)
function poll() {
let pad = null
try { const list = padsFn(); for (let i = 0; list && i < list.length; i++) if (list[i] && list[i].connected !== false) { pad = list[i]; break } } catch { pad = null }
const p = padToInput(pad, GAMEPAD_DEADZONE, padOut)
padDx = p.dx; padDy = p.dy
if (p.a && !padA) raiseFlare()
padA = p.a
if (padDx !== 0 || padDy !== 0) usePointer = false
}
function sample(input) {
poll()
if (pending && performance.now() - t0 >= TAP_MS) { pending = false; setTargetFrom(lastE) }
const l = held.l || latched.l || padDx < 0, r = held.r || latched.r || padDx > 0
const u = held.u || latched.u || padDy < 0, d = held.d || latched.d || padDy > 0
latched.l = latched.r = latched.u = latched.d = false
if (usePointer && hasTarget) {
input.hasTarget = true
input.tx = tx
input.ty = ty
input.dx = 0
input.dy = 0
} else {
input.hasTarget = false
input.tx = 0
input.ty = 0
input.dx = (r ? 1 : 0) - (l ? 1 : 0)
input.dy = (d ? 1 : 0) - (u ? 1 : 0)
}
input.flare = flare
flare = false
return input
}
return {
sample, poll,
onFlare(cb) { flareCb = cb },
setTouchOffset(b) { touchOffset = !!b },
reset() {
flare = false
flareLockUntil = performance.now() + FLARE_LOCK_MS
latched.l = latched.r = latched.u = latched.d = false
},
dispose() { ctrl.abort() },
}
}
