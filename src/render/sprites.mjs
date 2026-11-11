import { rgba } from './palette.mjs'
import { BRAMBLE_H, GATE_H, VIEW_W, VIEW_H } from '../sim/params.mjs'
import { mixHex, fireflyHues, HUE_SLOTS } from '../shared/skins.mjs'
export { mixHex }
const TAU = Math.PI * 2
function makeCanvas(size) {
const c = document.createElement('canvas')
c.width = c.height = size
return c
}
function radial(size, stops) {
const c = makeCanvas(size)
const g = c.getContext('2d')
const r = size / 2
const grad = g.createRadialGradient(r, r, 0, r, r, r)
for (const [p, col] of stops) grad.addColorStop(p, col)
g.fillStyle = grad
g.fillRect(0, 0, size, size)
return c
}
const PX = 4
const batEyeColor = (pal) => (pal.dashed ? pal.danger : '#ff3b4e')
function batFrame(pal, t) {
const c = makeCanvas(48 * PX)
c.height = 36 * PX
const g = c.getContext('2d')
g.translate(24 * PX, 18 * PX)
g.scale(PX, PX)
g.lineJoin = 'round'
g.lineCap = 'round'
g.shadowColor = pal.danger
g.shadowBlur = 5
const wing = (m) => {
g.save()
g.scale(m, 1)
g.beginPath()
g.moveTo(2.5, -2)
g.lineTo(10, -7 + t * 6)
g.lineTo(20, -2 + t * 7)
g.lineTo(16, 3.5 + t * 4)
g.lineTo(13, 1.5 + t * 3)
g.lineTo(10, 7 + t * 2)
g.lineTo(7, 4.5 + t)
g.lineTo(4.5, 8)
g.lineTo(2.5, 5)
g.closePath()
g.fillStyle = '#17092b'
g.fill()
g.strokeStyle = pal.danger
g.lineWidth = 1.2
g.stroke()
g.restore()
}
wing(1)
wing(-1)
g.fillStyle = '#17092b'
g.strokeStyle = pal.danger
g.lineWidth = 1.2
g.beginPath(); g.moveTo(-3.4, -6); g.lineTo(-3, -11.5); g.lineTo(-0.8, -7.4); g.lineTo(0.8, -7.4); g.lineTo(3, -11.5); g.lineTo(3.4, -6); g.closePath(); g.fill(); g.stroke()
g.beginPath(); g.ellipse(0, 1, 4.6, 6.4, 0, 0, Math.PI * 2); g.fill(); g.stroke()
g.beginPath(); g.arc(0, -4.6, 3.8, 0, Math.PI * 2); g.fill(); g.stroke()
g.shadowBlur = 0
const eye = batEyeColor(pal)
for (const ex of [-1.7, 1.7]) {
const gl = g.createRadialGradient(ex, -5.2, 0, ex, -5.2, 3.4)
gl.addColorStop(0, rgba(eye, 0.75)); gl.addColorStop(1, rgba(eye, 0))
g.fillStyle = gl
g.fillRect(ex - 3.4, -8.6, 6.8, 6.8)
}
g.fillStyle = eye
g.beginPath(); g.arc(-1.7, -5.2, 1.05, 0, Math.PI * 2); g.arc(1.7, -5.2, 1.05, 0, Math.PI * 2); g.fill()
g.fillStyle = '#fff1f4'
g.beginPath(); g.arc(-1.9, -5.45, 0.36, 0, Math.PI * 2); g.arc(1.5, -5.45, 0.36, 0, Math.PI * 2); g.fill()
g.fillStyle = '#ffe2f0'
g.beginPath(); g.moveTo(-1.5, -2.4); g.lineTo(-0.9, -0.6); g.lineTo(-0.3, -2.4); g.moveTo(0.3, -2.4); g.lineTo(0.9, -0.6); g.lineTo(1.5, -2.4); g.fill()
return c
}
function mothFrame(pal, m) {
const c = makeCanvas(40 * PX)
c.height = 32 * PX
const g = c.getContext('2d')
g.translate(20 * PX, 16 * PX)
g.scale(PX, PX)
g.lineJoin = 'round'
g.lineCap = 'round'
g.shadowColor = pal.moth
g.shadowBlur = 6
const wings = (side) => {
g.save()
g.scale(side * m, 1)
const grad = g.createLinearGradient(0, 0, 17, 0)
grad.addColorStop(0, rgba(pal.text, 0.95))
grad.addColorStop(1, rgba(pal.moth, 0.8))
g.fillStyle = grad
g.strokeStyle = rgba(pal.text, 0.9)
g.lineWidth = 0.7
g.beginPath(); g.moveTo(1, -1); g.quadraticCurveTo(9, -16, 17.5, -8); g.quadraticCurveTo(15, 0, 1, 1.2); g.closePath(); g.fill(); g.stroke()
g.beginPath(); g.moveTo(1, 1.2); g.quadraticCurveTo(13, 1, 13, 9.5); g.quadraticCurveTo(6, 10, 1, 3.5); g.closePath(); g.fill(); g.stroke()
g.shadowBlur = 0
g.strokeStyle = rgba(pal.moth, 0.55)
g.lineWidth = 1.5
g.beginPath(); g.moveTo(3.2, -9.2); g.quadraticCurveTo(12.8, -15, 17, -7.4); g.stroke()
g.strokeStyle = 'rgba(70,40,130,0.5)'
g.lineWidth = 0.55
g.beginPath()
g.moveTo(1.4, -0.4); g.lineTo(11, -9.5); g.moveTo(1.4, -0.4); g.lineTo(15, -4.4); g.moveTo(1.4, 0.8); g.lineTo(11.4, 6.4)
g.stroke()
g.fillStyle = 'rgba(70,40,130,0.78)'
g.beginPath(); g.arc(10.2, -5.8, 3.1, 0, Math.PI * 2); g.fill()
g.fillStyle = rgba(pal.moth, 0.95)
g.beginPath(); g.arc(10.2, -5.8, 2, 0, Math.PI * 2); g.fill()
g.fillStyle = 'rgba(30,14,70,0.95)'
g.beginPath(); g.arc(10.2, -5.8, 0.95, 0, Math.PI * 2); g.fill()
g.fillStyle = rgba(pal.moth, 0.8)
g.beginPath(); g.arc(8.4, 5, 1.4, 0, Math.PI * 2); g.fill()
g.shadowBlur = 6
g.restore()
}
wings(1)
wings(-1)
g.shadowBlur = 0
g.fillStyle = '#f6efff'
g.beginPath(); g.ellipse(0, 0.8, 1.7, 5.4, 0, 0, Math.PI * 2); g.fill()
g.strokeStyle = rgba(pal.text, 0.9)
g.lineWidth = 0.7
g.beginPath(); g.moveTo(-0.7, -4.2); g.quadraticCurveTo(-2, -8, -4.5, -9.5); g.moveTo(0.7, -4.2); g.quadraticCurveTo(2, -8, 4.5, -9.5); g.stroke()
return c
}
function batEyes(pal) {
const c = makeCanvas(12 * PX)
c.height = 6 * PX
const g = c.getContext('2d')
const eye = batEyeColor(pal)
for (const ex of [-1.7, 1.7]) {
const cx = (6 + ex) * PX, cy = 3 * PX, r = 3 * PX
const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r)
grad.addColorStop(0, rgba(eye, 0.9)); grad.addColorStop(0.45, rgba(eye, 0.35)); grad.addColorStop(1, rgba(eye, 0))
g.fillStyle = grad
g.fillRect(cx - r, cy - r, 2 * r, 2 * r)
}
return c
}
function warnSign(pal) {
const c = makeCanvas(72)
const g = c.getContext('2d')
g.lineJoin = 'round'
g.shadowColor = pal.danger
g.shadowBlur = 8
g.beginPath(); g.moveTo(36, 8); g.lineTo(65, 61); g.lineTo(7, 61); g.closePath()
g.fillStyle = 'rgba(23,9,43,0.92)'
g.fill()
g.strokeStyle = pal.danger
g.lineWidth = 5
g.stroke()
g.shadowBlur = 0
g.fillStyle = '#fff1f7'
g.font = '800 38px system-ui, -apple-system, "Segoe UI", sans-serif'
g.textAlign = 'center'
g.textBaseline = 'alphabetic'
g.fillText('!', 36, 54)
return c
}
export const FF_HUES = HUE_SLOTS
export const FF_WING_FRAMES = 3
function fireflyFrame(pal, hv, wing, hues) {
const t = hv / (FF_HUES - 1)
const core = hues ? hues[hv].core : mixHex(pal.fireCore, pal.fireHalo, 0.7 * t)
const halo = hues ? hues[hv].halo : mixHex(pal.fireCore, pal.fireHalo, 0.35 + 0.65 * t)
const c = radial(96, [
[0, rgba(core, 1)],
[0.1, rgba(core, 1)],
[0.17, rgba(core, 0.85)],
[0.34, rgba(halo, 0.38)],
[0.7, rgba(halo, 0.08)],
[1, rgba(halo, 0)],
])
const g = c.getContext('2d')
const th = [0.4, -0.3, -1.0][wing]
g.lineWidth = 0.9
g.fillStyle = rgba(mixHex(core, '#ffffff', 0.55), 0.62)
g.strokeStyle = rgba(core, 0.75)
for (const side of [1, -1]) {
g.beginPath()
g.ellipse(48 + side * (2 + Math.cos(th) * 6.5), 47 + Math.sin(th) * 6.5, 6.5, 2.7, side * th, 0, TAU)
g.fill(); g.stroke()
}
g.fillStyle = rgba(core, 1)
g.beginPath(); g.arc(48, 48, 4, 0, TAU); g.fill()
return c
}
function lanternFlame(pal) {
const c = radial(96, [
[0, rgba(pal.lanternCore, 0.9)],
[0.28, rgba(pal.fireCore, 0.5)],
[0.55, rgba(pal.fireHalo, 0.16)],
[1, rgba(pal.fireHalo, 0)],
])
const g = c.getContext('2d')
const body = g.createLinearGradient(0, 28, 0, 66)
body.addColorStop(0, rgba(pal.lanternCore, 0.95))
body.addColorStop(0.45, rgba(pal.fireCore, 1))
body.addColorStop(1, rgba(pal.fireHalo, 1))
g.fillStyle = body
g.beginPath()
g.moveTo(48, 27)
g.bezierCurveTo(55, 37, 62, 45, 59, 55)
g.bezierCurveTo(57, 66, 39, 66, 37, 55)
g.bezierCurveTo(34, 45, 42, 38, 48, 27)
g.closePath(); g.fill()
g.fillStyle = rgba(pal.lanternCore, 1)
g.beginPath(); g.ellipse(48, 55, 5.5, 8.5, 0, 0, TAU); g.fill()
g.fillStyle = 'rgba(255,255,255,0.92)'
g.beginPath(); g.ellipse(44.5, 49, 2, 3.8, -0.25, 0, TAU); g.fill()
return c
}
function lanternCage(pal) {
const c = makeCanvas(96)
const g = c.getContext('2d')
g.translate(48, 48)
g.lineCap = 'round'
g.shadowColor = pal.lanternRing
g.shadowBlur = 5
g.strokeStyle = pal.lanternRing
g.lineWidth = 4.2
g.beginPath(); g.arc(0, 0, 33, 0, TAU); g.stroke()
g.shadowBlur = 0
g.strokeStyle = mixHex(pal.lanternRing, '#ffffff', 0.55)
g.lineWidth = 5.4
g.beginPath()
for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2 + 0.3; g.moveTo(Math.cos(a) * 26, Math.sin(a) * 26); g.lineTo(Math.cos(a) * 40, Math.sin(a) * 40) }
g.stroke()
return c
}
function strayOrb(pal) {
const c = radial(96, [
[0, 'rgba(255,255,255,1)'],
[0.08, 'rgba(255,255,255,1)'],
[0.17, rgba(mixHex(pal.accent, '#ffffff', 0.55), 0.85)],
[0.34, rgba(pal.accent, 0.42)],
[0.55, rgba(pal.accent, 0.1)],
[1, rgba(pal.accent, 0)],
])
const g = c.getContext('2d')
g.lineCap = 'round'
g.strokeStyle = 'rgba(255,255,255,0.8)'
g.lineWidth = 2.2
g.beginPath(); g.moveTo(48, 12); g.lineTo(48, 84); g.moveTo(12, 48); g.lineTo(84, 48); g.stroke()
g.strokeStyle = rgba(pal.accent, 0.6)
g.lineWidth = 1.4
g.beginPath()
for (const a of [Math.PI / 4, (3 * Math.PI) / 4]) { g.moveTo(48 + Math.cos(a) * 9, 48 + Math.sin(a) * 9); g.lineTo(48 + Math.cos(a) * 26, 48 + Math.sin(a) * 26) ; g.moveTo(48 - Math.cos(a) * 9, 48 - Math.sin(a) * 9); g.lineTo(48 - Math.cos(a) * 26, 48 - Math.sin(a) * 26) }
g.stroke()
return c
}
function lanternPalette(pal, def) {
const ls = def && def.flame ? def.flame : null
return ls ? { ...pal, lanternCore: ls.core, fireCore: ls.mid, fireHalo: ls.halo } : pal
}
export function lanternSprites(pal, def) {
const lpal = lanternPalette(pal, def)
return { flame: lanternFlame(lpal), glow: lanternGlowSprite(lpal), halo: lanternHaloSprite(lpal) }
}
export function fireflySprites(pal, def) {
const fs = def && (def.a || def.hues) ? fireflyHues(def, pal) : null
const rows = []
for (let hv = 0; hv < FF_HUES; hv++) { const row = []; for (let w = 0; w < FF_WING_FRAMES; w++) row.push(fireflyFrame(pal, hv, w, fs)); rows.push(row) }
return rows
}
function lanternHaloSprite(lpal) {
return radial(128, [
[0, rgba(lpal.fireCore, 0.5)],
[0.14, rgba(lpal.fireCore, 0.34)],
[0.3, rgba(lpal.fireHalo, 0.2)],
[0.5, rgba(lpal.fireHalo, 0.09)],
[0.75, rgba(lpal.fireHalo, 0.025)],
[1, rgba(lpal.fireHalo, 0)],
])
}
function lanternGlowSprite(lpal) {
return radial(64, [
[0, rgba(lpal.lanternCore, 0.55)],
[0.3, rgba(lpal.fireCore, 0.32)],
[0.65, rgba(lpal.fireHalo, 0.1)],
[1, rgba(lpal.fireHalo, 0)],
])
}
const pearlOf = (pal) => mixHex(pal.text, pal.lanternRing, 0.3)
function cocoonSprite(pal) {
const c = makeCanvas(96), g = c.getContext('2d')
const pearl = pearlOf(pal)
g.fillStyle = (() => { const h = g.createRadialGradient(48, 48, 0, 48, 48, 48); h.addColorStop(0, rgba(pearl, 0.34)); h.addColorStop(0.5, rgba(pearl, 0.12)); h.addColorStop(1, rgba(pearl, 0)); return h })()
g.fillRect(0, 0, 96, 96)
g.lineCap = 'round'
g.strokeStyle = rgba(pearl, 0.75); g.lineWidth = 1.8
g.beginPath(); g.moveTo(48, 4); g.lineTo(48, 19); g.moveTo(48, 77); g.lineTo(48, 92); g.stroke()
g.beginPath(); g.ellipse(48, 48, 17, 29, 0, 0, TAU)
g.fillStyle = rgba(pearl, 0.22); g.fill()
g.strokeStyle = rgba(pearl, 0.96); g.lineWidth = 2.8; g.stroke()
g.strokeStyle = rgba(pearl, 0.62); g.lineWidth = 1.3
g.beginPath()
for (const y of [-15, 0, 15]) { const w = 17 * Math.sqrt(1 - (y / 29) * (y / 29)); g.moveTo(48 - w, 48 + y); g.quadraticCurveTo(48, 48 + y + 5, 48 + w, 48 + y) }
g.stroke()
g.beginPath(); g.ellipse(48, 48, 8, 29, 0, 0, TAU); g.stroke()
const core = g.createRadialGradient(48, 48, 0, 48, 48, 11)
core.addColorStop(0, 'rgba(255,255,255,0.9)'); core.addColorStop(1, rgba(pearl, 0))
g.fillStyle = core; g.fillRect(36, 36, 24, 24)
g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.6
g.beginPath(); g.arc(48, 48, 22, Math.PI * 1.08, Math.PI * 1.36); g.stroke()
return c
}
function emberSprite(pal) {
const c = makeCanvas(96), g = c.getContext('2d')
const hot = mixHex(pal.fireCore, '#ffffff', 0.5)
const mid = pal.dashed ? pal.fireHalo : '#ff8a3a'
const deep = pal.dashed ? mixHex(pal.fireHalo, '#000000', 0.25) : '#e0401f'
const gl = g.createRadialGradient(48, 50, 0, 48, 50, 48)
gl.addColorStop(0, rgba(mid, 0.5)); gl.addColorStop(0.45, rgba(deep, 0.2)); gl.addColorStop(1, rgba(deep, 0))
g.fillStyle = gl; g.fillRect(0, 0, 96, 96)
const body = g.createLinearGradient(0, 8, 0, 90)
body.addColorStop(0, rgba(hot, 1)); body.addColorStop(0.5, rgba(mid, 1)); body.addColorStop(1, rgba(deep, 1))
g.fillStyle = body
g.beginPath()
g.moveTo(48, 8); g.quadraticCurveTo(50, 40, 68, 49); g.quadraticCurveTo(52, 58, 48, 90); g.quadraticCurveTo(44, 58, 28, 49); g.quadraticCurveTo(46, 40, 48, 8)
g.closePath(); g.fill()
g.strokeStyle = rgba(hot, 0.9); g.lineWidth = 1.2; g.stroke()
const core = g.createRadialGradient(48, 49, 0, 48, 49, 9)
core.addColorStop(0, 'rgba(255,255,255,1)'); core.addColorStop(0.5, rgba(hot, 0.85)); core.addColorStop(1, rgba(hot, 0))
g.fillStyle = core; g.fillRect(36, 37, 24, 24)
return c
}
function shellSprite(pal) {
const c = makeCanvas(128), g = c.getContext('2d')
const pearl = pearlOf(pal)
const fill = g.createRadialGradient(64, 64, 0, 64, 64, 62)
fill.addColorStop(0, rgba(pearl, 0.03)); fill.addColorStop(0.7, rgba(pearl, 0.1)); fill.addColorStop(1, rgba(pearl, 0.3))
g.fillStyle = fill; g.beginPath(); g.arc(64, 64, 62, 0, TAU); g.fill()
g.lineCap = 'round'
g.strokeStyle = rgba(pearl, 0.95); g.lineWidth = 2.6
g.beginPath(); g.arc(64, 64, 60, 0, TAU); g.stroke()
g.strokeStyle = rgba(pearl, 0.3); g.lineWidth = 1.2
g.beginPath(); g.arc(64, 64, 55, 0, TAU); g.stroke()
g.strokeStyle = rgba(pearl, 0.34); g.lineWidth = 1.2
g.beginPath(); g.ellipse(64, 64, 24, 60, 0, 0, TAU); g.stroke()
g.beginPath(); g.ellipse(64, 64, 60, 22, 0, 0, TAU); g.stroke()
g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3.4
g.beginPath(); g.arc(64, 64, 50, Math.PI * 1.12, Math.PI * 1.38); g.stroke()
return c
}
function windStreak(pal, dir) {
const c = makeCanvas(64); c.height = 6
const g = c.getContext('2d')
const gr = g.createLinearGradient(dir > 0 ? 0 : 64, 0, dir > 0 ? 64 : 0, 0)
gr.addColorStop(0, rgba(pal.text, 0)); gr.addColorStop(0.7, rgba(pal.text, 0.55)); gr.addColorStop(1, rgba(pal.text, 0.95))
g.fillStyle = gr
g.beginPath(); g.moveTo(dir > 0 ? 0 : 64, 3); g.lineTo(dir > 0 ? 58 : 6, 0.6); g.lineTo(dir > 0 ? 64 : 0, 3); g.lineTo(dir > 0 ? 58 : 6, 5.4); g.closePath(); g.fill()
return c
}
function windEdge(pal, dir) {
const c = makeCanvas(48); c.height = 4
const g = c.getContext('2d')
const gr = g.createLinearGradient(dir > 0 ? 0 : 48, 0, dir > 0 ? 48 : 0, 0)
gr.addColorStop(0, rgba(pal.text, 0.5)); gr.addColorStop(1, rgba(pal.text, 0))
g.fillStyle = gr; g.fillRect(0, 0, 48, 4)
return c
}
function windLeaf(pal, k) {
const c = makeCanvas(20), g = c.getContext('2d')
g.translate(10, 10); g.rotate(k * (Math.PI / 4) + 0.3)
const col = mixHex(pal.fireHalo, '#5a3a1a', 0.5)
g.fillStyle = rgba(col, 0.95)
g.beginPath(); g.moveTo(-8, 0); g.quadraticCurveTo(0, -5.5, 8, 0); g.quadraticCurveTo(0, 5.5, -8, 0); g.closePath(); g.fill()
g.strokeStyle = rgba(pal.fireCore, 0.7); g.lineWidth = 0.9
g.beginPath(); g.moveTo(-7, 0); g.lineTo(7, 0); g.stroke()
return c
}
function dotSprite(pal, col) {
return radial(16, [[0, 'rgba(255,255,255,1)'], [0.3, rgba(col, 0.85)], [1, rgba(col, 0)]])
}
export function createSprites(pal, skins = null) {
const lpal = lanternPalette(pal, skins && skins.lantern)
const fs = skins && skins.fireflies && (skins.fireflies.a || skins.fireflies.hues) ? fireflyHues(skins.fireflies, pal) : null
const fireflies = fireflySprites(pal, skins && skins.fireflies)
return {
batFrames: [batFrame(pal, -1), batFrame(pal, -0.5), batFrame(pal, 0), batFrame(pal, 0.5), batFrame(pal, 1)],
batEyes: batEyes(pal),
mothDust: radial(16, [
[0, rgba(pal.text, 0.95)],
[0.35, rgba(pal.moth, 0.55)],
[1, rgba(pal.moth, 0)],
]),
mothFrames: [mothFrame(pal, 1), mothFrame(pal, 0.62), mothFrame(pal, 0.28)],
warn: warnSign(pal),
mothGlow: radial(64, [
[0, rgba(pal.moth, 0.5)],
[0.4, rgba(pal.moth, 0.18)],
[1, rgba(pal.moth, 0)],
]),
fireflies,
firefly: fireflies[0][1],
trail: radial(32, [
[0, rgba(fs ? fs[0].core : pal.fireCore, 0.9)],
[0.4, rgba(fs ? fs[1].halo : pal.fireHalo, 0.4)],
[1, rgba(fs ? fs[1].halo : pal.fireHalo, 0)],
]),
halo: lanternHaloSprite(lpal),
lanternGlow: lanternGlowSprite(lpal),
danger: radial(64, [
[0, rgba(pal.danger, 0.6)],
[0.4, rgba(pal.danger, 0.2)],
[1, rgba(pal.danger, 0)],
]),
lantern: lanternFlame(lpal),
cage: lanternCage(pal),
nebula: radial(128, [
[0, 'rgba(110,80,200,0.30)'],
[0.5, 'rgba(90,60,170,0.12)'],
[1, 'rgba(90,60,170,0)'],
]),
stray: strayOrb(pal),
cocoon: cocoonSprite(pal),
ember: emberSprite(pal),
shell: shellSprite(pal),
streakR: windStreak(pal, 1), streakL: windStreak(pal, -1),
edgeR: windEdge(pal, 1), edgeL: windEdge(pal, -1),
leaves: [windLeaf(pal, 0), windLeaf(pal, 1), windLeaf(pal, 2), windLeaf(pal, 3)],
pearlDot: dotSprite(pal, pearlOf(pal)),
emberDot: radial(16, [[0, 'rgba(255,255,255,0.95)'], [0.3, rgba(pal.dashed ? pal.fireHalo : '#ff8a3a', 0.8)], [1, rgba(pal.dashed ? pal.fireHalo : '#e0401f', 0)]]),
}
}
export let ART_S = 2
function artScaleFor(px, prev = ART_S) { return prev >= 3 ? (px < 2.2 ? 2 : 3) : (px > 2.4 ? 3 : 2) }
export function setArtScale(px) { const n = artScaleFor(px); const ch = n !== ART_S; ART_S = n; return ch }
export const WALL_M = 12
export const JAW_M = 6
export const JAW_L = 380
export const FLOW_P = [56, 88]
const DASH = [5, 4]
function hash(n) {
const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
return x - Math.floor(x)
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
function art(wu, hu) {
const c = document.createElement('canvas')
c.width = Math.max(1, Math.ceil(wu * ART_S))
c.height = Math.max(1, Math.ceil(hu * ART_S))
c.artS = ART_S
const g = c.getContext('2d')
g.scale(ART_S, ART_S)
g.lineJoin = 'round'
g.lineCap = 'round'
return { c, g }
}
function createCache(max) {
const m = new Map()
let hits = 0, misses = 0, clock = 0
return {
get(key, build, a, b, c, d) {
let e = m.get(key)
if (e !== undefined) { hits++; e.t = ++clock; return e.v }
misses++
e = { v: build(a, b, c, d), t: ++clock }
m.set(key, e)
if (m.size > max) {
let oldK, oldT = Infinity
m.forEach((x, k) => { if (x.t < oldT) { oldT = x.t; oldK = k } })
m.delete(oldK)
}
return e.v
},
stats: () => ({ hits, misses, size: m.size }),
get misses() { return misses },
}
}
function buildWallSide(pal, w, seed, rimRight, lowFx) {
const H = BRAMBLE_H + 2 * WALL_M
const { c, g } = art(w, H)
const y0 = WALL_M, h = BRAMBLE_H
const rimX = rimRight ? w : 0
const body = g.createLinearGradient(0, y0, 0, y0 + h)
body.addColorStop(0, pal.bramble); body.addColorStop(0.34, pal.brambleDark)
body.addColorStop(0.66, pal.brambleDark); body.addColorStop(1, pal.bramble)
g.fillStyle = body
g.fillRect(0, y0, w, h)
const stems = lowFx ? 0 : 3
const stemY = (k, x) => {
const ph = hash(seed * 7.3 + k * 1.9) * TAU
const fr = 0.055 + hash(seed * 3.1 + k * 5.7) * 0.06
const am = 3.6 + hash(seed + k * 2.3) * 2.4
return y0 + h / 2 + (k - 1) * 2.4 + Math.sin(x * fr + ph) * am
}
for (let k = 0; k < stems; k++) {
g.beginPath(); for (let x = -4; x <= w + 4; x += 4) { if (x < 0) g.moveTo(x, stemY(k, x)); else g.lineTo(x, stemY(k, x)) }
g.strokeStyle = 'rgba(2,0,8,0.55)'; g.lineWidth = 4.4; g.stroke()
g.strokeStyle = rgba(pal.text, 0.2); g.lineWidth = 2.4; g.stroke()
g.strokeStyle = rgba(pal.danger, 0.38); g.lineWidth = 0.8; g.stroke()
}
g.fillStyle = pal.danger
g.strokeStyle = 'rgba(0,0,0,0.3)'
g.lineWidth = 0.6
g.beginPath()
const guard = (x) => Math.abs(x - rimX) > 4 && x > 1 && x < w - 1
for (let k = 0; k < stems; k++) {
let i = 0
for (let x = 2 + hash(seed + k * 9) * 6; x < w - 3; x += 7 + hash(seed * 1.3 + k * 4 + i) * 9, i++) {
if (!guard(x)) continue
const y = stemY(k, x)
const dir = (i + k) & 1 ? -1 : 1
const ang = (hash(seed * 2.7 + k * 31 + i) - 0.5) * 0.9
const len = 4.5 + hash(seed * 4.1 + k * 17 + i) * 6
const bw = 1.5 + hash(seed * 5.3 + i) * 1.3
const tx = clamp(x + Math.sin(ang) * len, 0.5, w - 0.5)
const ty = clamp(y + dir * Math.cos(ang) * len, WALL_M - 9.5, WALL_M + h + 9.5)
g.moveTo(x - bw, y); g.lineTo(tx, ty); g.lineTo(x + bw, y)
}
}
for (let side = 0; side < 2; side++) {
const yEdge = side ? y0 + h - 1 : y0 + 1
const dir = side ? 1 : -1
let i = 0
for (let x = 3 + hash(seed + side * 5) * 5; x < w - 3; x += 8 + hash(seed * 1.9 + side * 40 + i) * 7, i++) {
if (!guard(x)) continue
const len = 4 + hash(seed * 3.3 + side * 13 + i) * 6
const ang = (hash(seed * 6.1 + side * 7 + i) - 0.5) * 1.0
const bw = 1.3 + hash(seed * 2.1 + side * 3 + i) * 1.4
g.moveTo(x - bw, yEdge); g.lineTo(clamp(x + Math.sin(ang) * len, 0.5, w - 0.5), yEdge + dir * Math.cos(ang) * len); g.lineTo(x + bw, yEdge)
}
}
g.fill()
g.stroke()
g.strokeStyle = rgba(pal.danger, 0.55)
g.lineWidth = 1.1
g.beginPath(); g.moveTo(0, y0 + 0.6); g.lineTo(w, y0 + 0.6); g.moveTo(0, y0 + h - 0.6); g.lineTo(w, y0 + h - 0.6); g.stroke()
if (pal.dashed) {
g.save()
g.setLineDash(DASH)
g.strokeStyle = pal.danger
g.lineWidth = 3
g.beginPath(); g.moveTo(rimRight ? w - 1.5 : 1.5, y0 - 1); g.lineTo(rimRight ? w - 1.5 : 1.5, y0 + h + 1); g.stroke()
g.restore()
} else {
g.fillStyle = pal.danger
g.fillRect(rimRight ? w - 2 : 0, y0 - 1, 2, h + 2)
}
return c
}
function buildJaw(pal, dir, vi, lowFx) {
const H = GATE_H + 2 * JAW_M
const { c, g } = art(JAW_L, H)
if (dir < 0) { g.translate(JAW_L, 0); g.scale(-1, 1) }
const L = JAW_L, y0 = JAW_M, h = GATE_H
const bodyG = g.createLinearGradient(0, y0, 0, y0 + h)
bodyG.addColorStop(0, pal.bramble); bodyG.addColorStop(0.5, pal.brambleDark); bodyG.addColorStop(1, pal.bramble)
g.fillStyle = bodyG
g.fillRect(0, y0, L, h)
g.save()
g.beginPath(); g.rect(0, y0, L, h); g.clip()
g.fillStyle = rgba(pal.danger, 0.55)
g.beginPath()
for (let bx = L - 24 * Math.ceil(L / 24) - 24; bx < L + 24; bx += 24) {
g.moveTo(bx, y0 + h); g.lineTo(bx + 12, y0 + h); g.lineTo(bx + 12 + h, y0); g.lineTo(bx + h, y0)
}
g.fill()
g.restore()
g.fillStyle = pal.brambleDark
g.fillRect(0, y0 + 7, L, h - 14)
if (!lowFx) {
for (let k = 0; k < 3; k++) {
const ph = hash(vi * 11 + k * 3.7) * TAU, fr = 0.05 + hash(vi * 5 + k) * 0.05
const yc = y0 + h / 2 + (k - 1) * 3
g.beginPath()
for (let x = 0; x <= L; x += 5) { const y = yc + Math.sin(x * fr + ph) * 2.2; if (x === 0) g.moveTo(x, y); else g.lineTo(x, y) }
g.strokeStyle = 'rgba(2,0,8,0.5)'; g.lineWidth = 2.6; g.stroke()
g.strokeStyle = rgba(pal.text, 0.2); g.lineWidth = 1.2; g.stroke()
}
g.strokeStyle = rgba(pal.text, 0.16)
g.lineWidth = 0.9
g.beginPath()
for (let x = 14 + hash(vi) * 6, i = 0; x < L - 14; x += 13 + hash(vi * 3 + i) * 9, i++) {
const up = i & 1 ? -1 : 1
g.moveTo(x, y0 + h / 2); g.quadraticCurveTo(x + 2, y0 + h / 2 + up * 5, x + 4 + hash(vi + i * 2) * 3, y0 + h / 2 + up * (8 + hash(vi * 2 + i) * 2))
}
g.stroke()
}
g.fillStyle = pal.danger
g.beginPath()
for (let x = 10 + hash(vi * 2) * 6, i = 0; x < L - 12; x += 11 + hash(vi * 7 + i) * 6, i++) {
const len = 3 + hash(vi * 4 + i) * 3
g.moveTo(x - 2, y0 + 0.5); g.lineTo(x + (hash(vi + i * 5) - 0.5) * 3, y0 - len); g.lineTo(x + 2, y0 + 0.5)
g.moveTo(x + 4 - 2, y0 + h - 0.5); g.lineTo(x + 4 + (hash(vi + i * 9) - 0.5) * 3, y0 + h + len * 0.9); g.lineTo(x + 4 + 2, y0 + h - 0.5)
}
g.fill()
g.strokeStyle = pal.danger
g.lineWidth = 1.5
if (pal.dashed) { g.save(); g.setLineDash(DASH); g.lineWidth = 2.5; g.strokeRect(0, y0 + 0.75, L, h - 1.5); g.restore() } else g.strokeRect(0, y0 + 0.75, L, h - 1.5)
g.fillStyle = pal.danger
g.fillRect(L - 2, y0, 2, h)
g.fillStyle = pal.text
g.strokeStyle = pal.danger
g.lineWidth = 0.7
for (let k = 0; k < 4; k++) {
const by = y0 + k * (h / 4)
const len = 6.5 + hash(vi * 13 + k * 2.1) * 3.2
const x0 = L - 10
const j = (hash(vi * 17 + k) - 0.5) * 1.6
g.beginPath()
g.moveTo(x0, by + 0.5)
g.quadraticCurveTo(x0 + len * 0.55, by + 0.9, x0 + len, by + 3 + j)
g.quadraticCurveTo(x0 + len * 0.5, by + 4.9, x0, by + h / 4 - 0.5)
g.closePath()
g.fill(); g.stroke()
}
return c
}
function fadeV(g, w, h, edge) {
const m = g.createLinearGradient(0, 0, 0, h)
m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(edge, 'rgba(0,0,0,1)'); m.addColorStop(1 - edge, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)')
g.globalCompositeOperation = 'destination-in'
g.fillStyle = m
g.fillRect(0, 0, w, h)
g.globalCompositeOperation = 'source-over'
}
function buildCurrentParts(pal, w, h, lowFx) {
const B = art(w, h)
const bg = B.g.createLinearGradient(0, 0, w, 0)
bg.addColorStop(0, rgba(pal.current, 0.5)); bg.addColorStop(0.2, 'rgba(12,6,34,0.58)')
bg.addColorStop(0.5, 'rgba(12,6,34,0.52)'); bg.addColorStop(0.8, 'rgba(12,6,34,0.58)'); bg.addColorStop(1, rgba(pal.current, 0.5))
B.g.fillStyle = bg
B.g.fillRect(0, 0, w, h)
B.g.fillStyle = rgba(pal.current, lowFx ? 0.12 : 0.1)
B.g.fillRect(w * 0.18, 0, w * 0.64, h)
fadeV(B.g, w, h, 0.12)
const V = art(w, h)
const dk = V.g.createLinearGradient(0, 0, w, 0)
dk.addColorStop(0, 'rgba(8,4,24,0.85)'); dk.addColorStop(0.2, 'rgba(8,4,24,0)'); dk.addColorStop(0.8, 'rgba(8,4,24,0)'); dk.addColorStop(1, 'rgba(8,4,24,0.85)')
V.g.fillStyle = dk
V.g.fillRect(0, 0, w, h)
const lt = V.g.createLinearGradient(0, 0, w, 0)
lt.addColorStop(0, rgba(pal.current, 0.62)); lt.addColorStop(0.09, rgba(pal.current, 0.1)); lt.addColorStop(0.91, rgba(pal.current, 0.1)); lt.addColorStop(1, rgba(pal.current, 0.62))
V.g.fillStyle = lt
V.g.fillRect(0, 0, w, h)
fadeV(V.g, w, h, 0.12)
return { body: B.c, veil: V.c }
}
function buildFlow(pal, sens, layer, h, variant) {
const P = FLOW_P[layer]
const { c, g } = art(P, h)
const wrap = (fn) => { fn(-P); fn(0); fn(P) }
if (layer === 0) {
const rows = 4
for (let r = 0; r < rows; r++) {
const ry = (r + 0.5) * (h / rows) + (hash(variant * 7 + r) - 0.5) * 10
const cx = P * ((r * 0.37 + variant * 0.29 + 0.15) % 1)
wrap((o) => {
const x = cx + o
g.beginPath(); g.moveTo(x - sens * 8, ry - 10); g.lineTo(x, ry); g.lineTo(x - sens * 8, ry + 10)
g.strokeStyle = 'rgba(6,2,20,0.85)'; g.lineWidth = 6.4; g.stroke()
g.strokeStyle = rgba(pal.text, 0.92); g.lineWidth = 3.2; g.stroke()
g.strokeStyle = rgba(pal.current, 0.9); g.lineWidth = 1; g.stroke()
})
for (let s = 0; s < 2; s++) {
const yy = ry + (s ? 1 : -1) * (10 + hash(variant * 5 + r * 3 + s) * 9)
const len = 16 + hash(variant * 3 + r * 5 + s) * 16
const hx = P * hash(variant * 11 + r * 2 + s)
wrap((o) => {
const head = hx + o, tail = head - sens * len
const gr = g.createLinearGradient(tail, 0, head, 0)
gr.addColorStop(0, rgba(pal.text, 0)); gr.addColorStop(1, rgba(pal.text, 0.5))
g.strokeStyle = gr; g.lineWidth = 1.8
g.beginPath(); g.moveTo(tail, yy); g.lineTo(head, yy); g.stroke()
})
}
}
} else {
for (let i = 0; i < 3; i++) {
const y = h * (0.1 + 0.8 * ((i * 0.37 + variant * 0.21 + 0.1) % 1))
const len = 44 + hash(variant * 9 + i) * 26
const hx = P * hash(variant * 4 + i * 7)
wrap((o) => {
for (let j = 0; j < 7; j++) {
const t = j / 6
const x = hx + o - sens * t * len
const yy = y + Math.sin(t * 3 + i * 2 + variant) * 3.5
g.fillStyle = rgba(j & 1 ? pal.text : pal.current, 0.2 * (1 - t) + 0.02)
g.beginPath(); g.ellipse(x, yy, 6 + 5 * t, 3.4 + 2.6 * t, 0, 0, TAU); g.fill()
}
})
}
}
fadeV(g, P, h, 0.14)
return c
}
function buildPulseSide(pal, w, seed, rimRight, lowFx) {
const H = BRAMBLE_H + 2 * WALL_M
const { c, g } = art(2 * w, H)
for (let half = 0; half < 2; half++) {
g.save(); g.translate(half * w, 0)
g.beginPath(); g.rect(0, 0, w, H); g.clip()
paintPulse(g, pal, w, seed, rimRight, lowFx, half === 1)
g.restore()
}
return c
}
function paintPulse(g, pal, w, seed, rimRight, lowFx, off) {
const y0 = WALL_M, h = BRAMBLE_H
const rimX = rimRight ? w : 0
const T = 8, TH = 8.5
const phase = 2 + hash(seed * 1.7) * 3
const guard = (x) => Math.abs(x - rimX) > 4 && x > 2 && x < w - 2
if (!off) {
const body = g.createLinearGradient(0, y0, 0, y0 + h)
body.addColorStop(0, pal.bramble); body.addColorStop(0.5, pal.brambleDark); body.addColorStop(1, pal.bramble)
g.fillStyle = body
g.fillRect(0, y0, w, h)
g.fillStyle = pal.danger
g.strokeStyle = 'rgba(0,0,0,0.35)'
g.lineWidth = 0.6
g.beginPath()
for (let x = phase; x < w - 2; x += T) {
if (guard(x)) { g.moveTo(x - 3.6, y0 + 0.8); g.lineTo(x, y0 - TH); g.lineTo(x + 3.6, y0 + 0.8) }
if (guard(x + T / 2)) { g.moveTo(x + T / 2 - 3.6, y0 + h - 0.8); g.lineTo(x + T / 2, y0 + h + TH); g.lineTo(x + T / 2 + 3.6, y0 + h - 0.8) }
}
g.fill(); g.stroke()
if (!lowFx) {
g.beginPath()
let up = 1
for (let x = 0; x <= w + T; x += T / 2, up = -up) { const y = y0 + h / 2 + up * 4.2; if (x === 0) g.moveTo(x, y); else g.lineTo(Math.min(x, w), y) }
g.strokeStyle = 'rgba(2,0,8,0.6)'; g.lineWidth = 3.4; g.stroke()
g.strokeStyle = rgba(pal.text, 0.88); g.lineWidth = 1.5; g.stroke()
}
g.strokeStyle = rgba(pal.danger, 0.7); g.lineWidth = 1.2
g.beginPath(); g.moveTo(0, y0 + 0.6); g.lineTo(w, y0 + 0.6); g.moveTo(0, y0 + h - 0.6); g.lineTo(w, y0 + h - 0.6); g.stroke()
if (pal.dashed) {
g.save(); g.setLineDash(DASH); g.strokeStyle = pal.danger; g.lineWidth = 3
g.beginPath(); g.moveTo(rimRight ? w - 1.5 : 1.5, y0 - 1); g.lineTo(rimRight ? w - 1.5 : 1.5, y0 + h + 1); g.stroke(); g.restore()
} else { g.fillStyle = pal.danger; g.fillRect(rimRight ? w - 2 : 0, y0 - 1, 2, h + 2) }
return
}
g.fillStyle = rgba(pal.brambleDark, 0.28)
g.fillRect(0, y0, w, h)
const trace = (stroke, lw, dash) => {
g.save(); g.setLineDash(dash); g.strokeStyle = stroke; g.lineWidth = lw
g.strokeRect(rimRight ? 0.5 : 1, y0 + 0.5, w - 1.5, h - 1)
g.restore()
}
trace('rgba(5,6,16,0.85)', 3.6, [3, 4])
trace(pal.danger, 1.4, [3, 4])
g.beginPath()
for (let x = phase; x < w - 2; x += T) {
if (guard(x)) { g.moveTo(x - 3.6, y0); g.lineTo(x, y0 - TH * 0.7); g.lineTo(x + 3.6, y0) }
if (guard(x + T / 2)) { g.moveTo(x + T / 2 - 3.6, y0 + h); g.lineTo(x + T / 2, y0 + h + TH * 0.7); g.lineTo(x + T / 2 + 3.6, y0 + h) }
}
g.strokeStyle = rgba(pal.danger, 0.5); g.lineWidth = 1
g.stroke()
g.fillStyle = rgba(pal.danger, 0.45)
g.fillRect(rimRight ? w - 1.5 : 0, y0, 1.5, h)
}
const BOLT_W = 48, BOLT_HT = VIEW_H + 40
function buildBolt(pal, v) {
const c = document.createElement('canvas')
c.width = BOLT_W * 2; c.height = BOLT_HT
const g = c.getContext('2d')
g.lineJoin = 'round'; g.lineCap = 'round'
const col = mixHex(pal.text, '#9fb7ff', 0.5)
const cx = BOLT_W
const pts = []
let x = cx
for (let y = 0, i = 0; y <= BOLT_HT + 40; y += 34 + hash(v * 13 + i) * 30, i++) {
x = cx + (hash(v * 29 + i * 3.1) - 0.5) * 30 - (x - cx) * 0.35
pts.push(x, Math.min(y, BOLT_HT))
}
const path = () => { g.beginPath(); for (let i = 0; i < pts.length; i += 2) { if (i === 0) g.moveTo(pts[0], 0); else g.lineTo(pts[i], pts[i + 1]) } }
const branch = (from, dir) => {
const i = from * 2, bx = pts[i], by = pts[i + 1]
g.beginPath(); g.moveTo(bx, by)
g.lineTo(bx + dir * (14 + hash(v * 7 + from) * 10), by + 26 + hash(v * 5 + from) * 14)
g.lineTo(bx + dir * (22 + hash(v * 3 + from) * 12), by + 58 + hash(v * 11 + from) * 20)
}
const strokeAll = (lw, style) => {
g.lineWidth = lw; g.strokeStyle = style
path(); g.stroke()
branch(2 + v, 1); g.stroke(); branch(7 + v, -1); g.stroke()
}
strokeAll(18, rgba(col, 0.2))
strokeAll(7, rgba(col, 0.55))
strokeAll(2.8, 'rgba(255,255,255,0.98)')
return c
}
function boltGlowSprite(pal) {
const c = makeCanvas(64); c.height = 4
const g = c.getContext('2d')
const col = mixHex(pal.text, '#9fb7ff', 0.5)
const gr = g.createLinearGradient(0, 0, 64, 0)
gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.32, rgba(col, 0.28)); gr.addColorStop(0.5, rgba(col, 0.75)); gr.addColorStop(0.68, rgba(col, 0.28)); gr.addColorStop(1, rgba(col, 0))
g.fillStyle = gr; g.fillRect(0, 0, 64, 4)
return c
}
const BOLT_VARIANTS = 3
const KR = 4096
const inR = (v) => Number.isInteger(v) && v >= 0 && v < KR
export function createDangerArt(pal) {
const walls = createCache(24)
const hi = ART_S >= 3
const currents = createCache(hi ? 8 : 12)
const flows = createCache(16)
const jaws = createCache(8)
const pulses = createCache(hi ? 16 : 24)
const all = [walls, currents, flows, jaws, pulses]
const bWall = (w, seed, rimRight, lowFx) => buildWallSide(pal, w, seed, rimRight, lowFx)
const bJaw = (dir, vi, lowFx) => buildJaw(pal, dir, vi, lowFx)
const bCur = (w, h, lowFx) => buildCurrentParts(pal, w, h, lowFx)
const bFlow = (sens, layer, h, variant) => buildFlow(pal, sens, layer, h, variant)
const bPulse = (w, seed, rimRight, lowFx) => buildPulseSide(pal, w, seed, rimRight, lowFx)
const bolts = []
for (let v = 0; v < BOLT_VARIANTS; v++) bolts.push(buildBolt(pal, v))
const boltGlow = boltGlowSprite(pal)
return {
bolts, boltGlow,
wall: (w, seed, rimRight, lowFx) => walls.get(inR(w) && inR(seed) ? ((w * KR + seed) * 2 + (rimRight ? 1 : 0)) * 2 + (lowFx ? 1 : 0) : 'w' + w + '|' + seed + '|' + (rimRight ? 1 : 0) + '|' + (lowFx ? 1 : 0), bWall, w, seed, rimRight, lowFx),
pulse: (w, seed, rimRight, lowFx) => pulses.get(inR(w) && inR(seed) ? ((w * KR + seed) * 2 + (rimRight ? 1 : 0)) * 2 + (lowFx ? 1 : 0) : 'p' + w + '|' + seed + '|' + (rimRight ? 1 : 0) + '|' + (lowFx ? 1 : 0), bPulse, w, seed, rimRight, lowFx),
jaw: (dir, vi, lowFx) => jaws.get(inR(vi) && (dir === 1 || dir === -1) ? ((vi * 2 + (dir > 0 ? 1 : 0)) * 2 + (lowFx ? 1 : 0)) : 'j' + dir + '|' + vi + '|' + (lowFx ? 1 : 0), bJaw, dir, vi, lowFx),
current: (w, h, lowFx) => currents.get(inR(w) && inR(h) ? (w * KR + h) * 2 + (lowFx ? 1 : 0) : 'c' + w + '|' + h + '|' + (lowFx ? 1 : 0), bCur, w, h, lowFx),
flow: (sens, layer, h, variant) => flows.get(inR(h) && inR(variant) && (sens === 1 || sens === -1) && (layer === 0 || layer === 1) ? (((h * KR + variant) * 2 + layer) * 2 + (sens > 0 ? 1 : 0)) : 'f' + sens + '|' + layer + '|' + h + '|' + variant, bFlow, sens, layer, h, variant),
built: () => walls.misses + currents.misses + flows.misses + jaws.misses + pulses.misses,
stats() {
let hits = 0, misses = 0, size = 0
for (const c of all) { const s = c.stats(); hits += s.hits; misses += s.misses; size += s.size }
return { hits, misses, size }
},
}
}
const TREE_K = 1.6
const FOG_PX = 256
export const BIOMES = [
(pal) => ({
name: 'forêt de nuit',
fog: [
{ color: '#6a5bd0', alpha: 0.17, speed: 0.05, drift: 3, seed: 3 },
{ color: '#3f86a6', alpha: 0.12, speed: 0.11, drift: 5, seed: 11 },
],
trees: {
color: '#04050d', rim: 'rgba(150,140,235,0.32)',
far: { w: 34, speed: 0.07, alpha: 0.55, n: 7, kind: 'leaf', seed: 21 },
near: { w: 52, speed: 0.16, alpha: 0.92, n: 6, kind: 'leaf', seed: 5 },
},
moon: { x: 0.78, y: 0.12, size: 1.0, color: '#dfe6ff', alpha: 0.55 },
farFlies: { n: 12, color: pal.fireHalo, alpha: 0.8 },
}),
() => ({
name: 'marais',
sky: { top: '#031210', bottom: '#0a2321' },
nebula: { rgb: '40,150,115', a: 0.14 },
fog: [
{ color: '#1f7a68', alpha: 0.15, speed: 0.05, drift: 4, seed: 31 },
{ color: '#5c8a3e', alpha: 0.08, speed: 0.11, drift: 7, seed: 37 },
],
trees: {
color: '#020d0b', rim: 'rgba(120,230,185,0.30)',
far: { w: 36, speed: 0.07, alpha: 0.55, n: 6, kind: 'reed', seed: 41 },
near: { w: 54, speed: 0.16, alpha: 0.92, n: 5, kind: 'frond', seed: 45 },
},
moon: { x: 0.24, y: 0.16, size: 1.25, color: '#bfe8d2', alpha: 0.26 },
farFlies: { n: 0, color: '#9fe8c0', alpha: 0.6 },
ambient: { kind: 'spore', n: 16, color: '#b9f2a0', alpha: 0.7 },
}),
() => ({
name: 'cimes',
sky: { top: '#040820', bottom: '#0c1540' },
nebula: { rgb: '70,90,210', a: 0.12 },
fog: [
{ color: '#2e3c92', alpha: 0.12, speed: 0.05, drift: 3, seed: 51 },
{ color: '#4d68ad', alpha: 0.06, speed: 0.11, drift: 5, seed: 57 },
],
trees: {
color: '#03040e', rim: 'rgba(175,205,255,0.34)',
far: { w: 34, speed: 0.07, alpha: 0.55, n: 6, kind: 'bare', seed: 61 },
near: { w: 52, speed: 0.16, alpha: 0.92, n: 5, kind: 'bare', seed: 65 },
},
moon: { x: 0.7, y: 0.1, size: 0.8, color: '#e6f0ff', alpha: 0.4 },
farFlies: { n: 0, color: '#bcd4ff', alpha: 0.6 },
ambient: { kind: 'snow', n: 26, color: '#e8f1ff', alpha: 0.85 },
aurora: { colors: ['#3ad9a0', '#6a90f0', '#a47cf0'], alpha: 0.3 },
}),
]
export const NIGHT = BIOMES.length
export const BD_COUNT = BIOMES.length + 1
export const NIGHT_BIOME = () => ({
name: 'nuit profonde',
sky: { top: '#05020d', bottom: '#150822' },
nebula: { rgb: '150,40,110', a: 0.1 },
fog: [
{ color: '#6a1f58', alpha: 0.11, speed: 0.05, drift: 3, seed: 71 },
{ color: '#321a66', alpha: 0.07, speed: 0.11, drift: 5, seed: 77 },
],
trees: {
color: '#020108', rim: 'rgba(230,120,170,0.30)',
far: { w: 36, speed: 0.07, alpha: 0.6, n: 6, kind: 'bare', seed: 81 },
near: { w: 54, speed: 0.16, alpha: 0.95, n: 5, kind: 'bare', seed: 85 },
},
moon: { x: 0.3, y: 0.14, size: 1.05, color: '#f0b6d4', alpha: 0.32 },
farFlies: { n: 0, color: '#ff9ac0', alpha: 0.5 },
ambient: { kind: 'spore', n: 14, color: '#ff7aa8', alpha: 0.6 },
aurora: { colors: ['#d03a78', '#8a3ad0', '#ff5c8a'], alpha: 0.3 },
stars: 0.45,
vignette: 0.55,
})
function resolveBiome(b, pal) {
if (typeof b === 'function') return b(pal)
if (b && typeof b === 'object') return b
if (b === NIGHT) return NIGHT_BIOME(pal)
const i = Number.isFinite(b) ? Math.abs(Math.floor(b)) % BIOMES.length : 0
return BIOMES[i](pal)
}
function paintReeds(g, seed, w, y, tw) {
const n = 3 + Math.floor(hash(seed) * 2)
for (let k = 0; k < n; k++) {
const x0 = tw * 0.5 + hash(seed + k * 3 + 1) * w * 0.5
const len = 70 + hash(seed + k * 3 + 2) * 100
const lean = (0.15 + hash(seed + k * 3 + 3) * 0.5) * w * (k % 2 ? 0.8 : 1)
g.lineWidth = 1.1 + hash(seed + k) * 0.9
g.beginPath(); g.moveTo(x0, y + len * 0.5); g.quadraticCurveTo(x0 + lean * 0.3, y, x0 + lean, y - len * 0.5); g.stroke()
if (hash(seed + k * 7 + 5) > 0.35) {
const t = 0.86
const cx = x0 + lean * (t * t + 0.3 * t * (1 - t)), cy = y + len * 0.5 - len * t
g.beginPath(); g.ellipse(cx, cy, 1.9, 7, lean / len, 0, TAU); g.fill()
}
g.lineWidth = 0.8
g.beginPath(); g.moveTo(x0 + 1, y + len * 0.5); g.quadraticCurveTo(x0 + w * 0.3, y + len * 0.1, x0 + w * 0.45 + lean * 0.2, y - len * 0.1); g.stroke()
}
}
function paintFrond(g, seed, w, y, tw) {
const len = w * (0.8 + hash(seed) * 0.4)
const dyb = (hash(seed + 1) - 0.35) * 70
const sx = tw * 0.6, sy = y
const cxp = len * 0.55, cyp = y - 22
const ex = len, ey = y + dyb
g.lineWidth = 1.6
g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(cxp, cyp, ex, ey); g.stroke()
const m = 9
for (let k = 1; k <= m; k++) {
const t = k / (m + 1)
const u = 1 - t
const px = u * u * sx + 2 * u * t * cxp + t * t * ex
const py = u * u * sy + 2 * u * t * cyp + t * t * ey
const tx = 2 * u * (cxp - sx) + 2 * t * (ex - cxp), ty = 2 * u * (cyp - sy) + 2 * t * (ey - cyp)
const a = Math.atan2(ty, tx)
const L = (1 - t * 0.8) * (6.5 + hash(seed + k) * 2.5)
for (const sd of [-1, 1]) {
g.beginPath(); g.ellipse(px + Math.cos(a + sd * 1.15) * L * 0.5, py + Math.sin(a + sd * 1.15) * L * 0.5, L * 0.5, 1.5, a + sd * 1.15, 0, TAU); g.fill()
}
}
}
function paintBare(g, seed, w, y, tw) {
const len = w * (0.7 + hash(seed) * 0.5)
const dyb = (hash(seed + 1) - 0.55) * 60
g.lineWidth = 2.2
g.beginPath(); g.moveTo(tw * 0.5, y); g.quadraticCurveTo(len * 0.5, y + dyb * 0.15 - 5, len, y + dyb); g.stroke()
const nb = 2 + Math.floor(hash(seed + 2) * 2)
for (let k = 0; k < nb; k++) {
const t = 0.3 + (k / nb) * 0.6 + hash(seed + 3 + k) * 0.1
const bx = len * t, by = y + dyb * t * t - 3 * (1 - t)
const up = k % 2 ? 1 : -1
const l2 = 10 + hash(seed + 5 + k) * 14
const ex = bx + l2 * 0.8, ey = by + up * l2 * (0.6 + hash(seed + 7 + k) * 0.6)
g.lineWidth = 1.3
g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + l2 * 0.2, by + up * l2 * 0.5, ex, ey); g.stroke()
g.lineWidth = 0.8
g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + 5, ey + up * 6); g.moveTo(ex, ey); g.lineTo(ex + 6.5, ey - up * 1.5); g.stroke()
}
g.lineWidth = 0.9
g.beginPath(); g.moveTo(len, y + dyb); g.lineTo(len + 6, y + dyb + 3); g.moveTo(len, y + dyb); g.lineTo(len + 5, y + dyb - 5); g.stroke()
}
function treeStrip(spec, depth, side) {
const w = depth.w, H = VIEW_H
const { c, g } = (() => {
const cv = document.createElement('canvas')
cv.width = Math.max(1, Math.ceil(w * TREE_K)); cv.height = Math.ceil(H * TREE_K)
const ctx = cv.getContext('2d')
ctx.scale(TREE_K, TREE_K)
ctx.lineJoin = 'round'; ctx.lineCap = 'round'
return { c: cv, g: ctx }
})()
if (side) { g.translate(w, 0); g.scale(-1, 1) }
const seed = depth.seed + side * 50
const paint = (col, dx) => {
g.fillStyle = col; g.strokeStyle = col
for (const dy of [-H, 0, H]) {
g.save(); g.translate(dx, dy)
const tw = 4 + hash(seed) * 3
g.beginPath(); g.moveTo(-6, -10)
for (let y = -10; y <= H + 10; y += 14) g.lineTo(tw + Math.sin(y * 0.021 + seed) * 2.2, y)
g.lineTo(-6, H + 10); g.closePath(); g.fill()
if (depth.kind === 'reed' || depth.kind === 'frond' || depth.kind === 'bare') {
for (let i = 0; i < depth.n; i++) {
const y = (i + 0.3 + hash(seed + i * 3) * 0.5) * (H / depth.n)
if (depth.kind === 'reed') paintReeds(g, seed + i * 41, w, y, tw)
else if (depth.kind === 'frond') paintFrond(g, seed + i * 43, w, y, tw)
else paintBare(g, seed + i * 47, w, y, tw)
}
g.restore()
continue
}
for (let i = 0; i < depth.n; i++) {
const y = (i + 0.3 + hash(seed + i * 3) * 0.5) * (H / depth.n)
const len = w * (0.45 + hash(seed + i * 5 + 1) * 0.5)
const dyb = (hash(seed + i * 7 + 2) - 0.6) * 46
g.lineWidth = 1.8 + hash(seed + i) * 1.6
g.beginPath(); g.moveTo(tw * 0.6, y); g.quadraticCurveTo(len * 0.5, y + dyb * 0.2 - 6, len, y + dyb); g.stroke()
for (let k = 0; k < 7; k++) {
const t = k < 3 ? 0.45 + k * 0.2 : 1
const lx = len * t + (hash(seed + i * 11 + k) - 0.4) * 9
const ly = y + dyb * t + (hash(seed + i * 13 + k) - 0.5) * 11
const rx = 2.4 + hash(seed + i * 17 + k) * 3.4
const ry = 1.5 + hash(seed + i * 19 + k) * 2.2
const rot = (hash(seed + i * 23 + k) - 0.5) * 2.4
g.beginPath()
if (depth.kind === 'needle') { g.moveTo(lx, ly - rx); g.lineTo(lx + ry * 1.4, ly + rx * 0.4); g.lineTo(lx - ry * 1.4, ly + rx * 0.4); g.closePath() } else g.ellipse(lx, ly, rx, ry, rot, 0, TAU)
g.fill()
}
if (hash(seed + i * 29) > 0.4) {
const vx = len * (0.5 + hash(seed + i * 31) * 0.5)
g.lineWidth = 0.8
g.beginPath(); g.moveTo(vx, y + dyb * 0.6); g.quadraticCurveTo(vx + 2, y + dyb * 0.6 + 8, vx - 1, y + dyb * 0.6 + 12 + hash(seed + i * 37) * 18); g.stroke()
}
}
g.restore()
}
}
paint(spec.trees.rim, 1.3)
paint(spec.trees.color, 0)
return c
}
function fogTile(layer) {
const c = document.createElement('canvas')
c.width = c.height = FOG_PX
const g = c.getContext('2d')
for (let i = 0; i < 7; i++) {
const x = hash(layer.seed + i * 3) * FOG_PX, y = hash(layer.seed + i * 3 + 1) * FOG_PX
const r = 52 + hash(layer.seed + i * 3 + 2) * 46
for (const ox of [-FOG_PX, 0, FOG_PX]) for (const oy of [-FOG_PX, 0, FOG_PX]) {
const cx = x + ox, cy = y + oy
if (cx + r < 0 || cx - r > FOG_PX || cy + r < 0 || cy - r > FOG_PX) continue
const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r)
gr.addColorStop(0, rgba(layer.color, layer.alpha * 2.2)); gr.addColorStop(0.5, rgba(layer.color, layer.alpha)); gr.addColorStop(1, rgba(layer.color, 0))
g.fillStyle = gr
g.fillRect(cx - r, cy - r, 2 * r, 2 * r)
}
}
return c
}
function moonSprite(m) {
const c = document.createElement('canvas')
c.width = c.height = 192
const g = c.getContext('2d')
const gl = g.createRadialGradient(96, 96, 0, 96, 96, 96)
gl.addColorStop(0, rgba(m.color, m.alpha)); gl.addColorStop(0.1, rgba(m.color, m.alpha * 0.7)); gl.addColorStop(0.3, rgba(m.color, m.alpha * 0.22))
gl.addColorStop(0.6, rgba(m.color, m.alpha * 0.06)); gl.addColorStop(1, rgba(m.color, 0))
g.fillStyle = gl
g.fillRect(0, 0, 192, 192)
const d = g.createRadialGradient(92, 92, 2, 96, 96, 14)
d.addColorStop(0, 'rgba(255,255,255,0.95)'); d.addColorStop(0.85, rgba(m.color, 0.9)); d.addColorStop(1, rgba(m.color, 0))
g.fillStyle = d
g.beginPath(); g.arc(96, 96, 14, 0, TAU); g.fill()
g.fillStyle = 'rgba(120,130,190,0.16)'
g.beginPath(); g.arc(101, 92, 3.2, 0, TAU); g.arc(92, 101, 2.4, 0, TAU); g.fill()
return c
}
function nebulaSprite(n) {
const c = document.createElement('canvas')
c.width = c.height = 128
const g = c.getContext('2d')
const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
gr.addColorStop(0, 'rgba(' + n.rgb + ',' + n.a + ')'); gr.addColorStop(0.5, 'rgba(' + n.rgb + ',' + (n.a * 0.4) + ')'); gr.addColorStop(1, 'rgba(' + n.rgb + ',0)')
g.fillStyle = gr
g.fillRect(0, 0, 128, 128)
return c
}
function auroraSprite(a) {
const W = 256, Hh = 128
const c = document.createElement('canvas')
c.width = W; c.height = Hh
const g = c.getContext('2d')
a.colors.forEach((col, k) => {
const base = 30 + k * 26
const amp = 10 + k * 3
for (let x = 0; x < W; x += 2) {
const cy = base + Math.sin(x * 0.03 + k * 2.1) * amp + Math.sin(x * 0.011 + k) * 7
const gr = g.createLinearGradient(0, cy - 34, 0, cy + 26)
gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.55, rgba(col, a.alpha * 0.34)); gr.addColorStop(0.8, rgba(col, a.alpha * 0.2)); gr.addColorStop(1, rgba(col, 0))
g.fillStyle = gr
g.fillRect(x, cy - 34, 2, 60)
}
})
return c
}
export function createBackdrop(pal, biome = 0) {
const it = backdropSteps(pal, biome)
let r = it.next()
while (!r.done) r = it.next()
return r.value
}
export function* backdropSteps(pal, biome = 0) {
const spec = resolveBiome(biome, pal)
const fogs = spec.fog.map(fogTile)
yield 'fog'
const far = [treeStrip(spec, spec.trees.far, 0)]
yield 'far0'
far.push(treeStrip(spec, spec.trees.far, 1))
yield 'far1'
const near = [treeStrip(spec, spec.trees.near, 0)]
yield 'near0'
near.push(treeStrip(spec, spec.trees.near, 1))
yield 'near1'
const moon = moonSprite(spec.moon)
const dot = radial(16, [[0, rgba(spec.farFlies.color, 1)], [0.35, rgba(spec.farFlies.color, 0.4)], [1, rgba(spec.farFlies.color, 0)]])
const nebula = spec.nebula ? nebulaSprite(spec.nebula) : null
const amb = spec.ambient || null
const ambDot = amb ? radial(16, [[0, rgba(amb.color, 1)], [amb.kind === 'snow' ? 0.5 : 0.3, rgba(amb.color, amb.kind === 'snow' ? 0.9 : 0.45)], [1, rgba(amb.color, 0)]]) : null
yield 'sprites'
const aurora = spec.aurora ? auroraSprite(spec.aurora) : null
yield 'aurora'
let calls = 0
function trees(ctx, v, strips, depth, dist, mul) {
const Hs = VIEW_H * v.scale, wpx = depth.w * v.scale
const off = (((dist * depth.speed * v.scale) % Hs) + Hs) % Hs
ctx.globalAlpha = depth.alpha * mul
for (let y = off - Hs; y < v.cssH; y += Hs) {
ctx.drawImage(strips[0], v.ox, y, wpx, Hs + 1)
ctx.drawImage(strips[1], v.ox + VIEW_W * v.scale - wpx, y, wpx, Hs + 1)
calls += 2
}
if (v.ox > wpx * 0.6) {
ctx.globalAlpha = depth.alpha * mul * 0.75
for (let y = off - Hs; y < v.cssH; y += Hs) {
ctx.drawImage(strips[1], 0, y, wpx, Hs + 1)
ctx.drawImage(strips[0], v.cssW - wpx, y, wpx, Hs + 1)
calls += 2
}
}
ctx.globalAlpha = 1
}
function fog(ctx, v, i, dist, time, mul) {
const L = spec.fog[i]
const tw = v.cssW * 1.25, th = Math.max(v.cssH * 0.75, 280)
const off = (((dist * L.speed * v.scale + time * L.drift) % th) + th) % th
const x = -v.cssW * 0.12 + Math.sin(time * 0.12 + i * 2) * v.cssW * 0.04
ctx.globalAlpha = mul
for (let y = off - th; y < v.cssH; y += th) { ctx.drawImage(fogs[i], x, y, tw, th + 1); calls++ }
ctx.globalAlpha = 1
}
function ambient(ctx, v, dist, t, mul) {
const snow = amb.kind === 'snow'
ctx.globalCompositeOperation = snow ? 'source-over' : 'lighter'
for (let i = 0; i < amb.n; i++) {
const sp = snow ? 14 + hash(i * 3 + 80) * 26 : 5 + hash(i * 3 + 80) * 9
const par = snow ? 0.06 + hash(i * 3 + 81) * 0.1 : 0.03 + hash(i * 3 + 81) * 0.05
const sway = Math.sin(t * (0.4 + hash(i + 90) * 0.6) + i * 1.7) * (snow ? 9 : 14)
let y = (hash(i * 3 + 6) * v.cssH + (snow ? 1 : -1) * t * sp + dist * par * v.scale) % v.cssH
if (y < 0) y += v.cssH
const x = hash(i * 3 + 5) * v.cssW + sway
const sz = (snow ? 2.2 + hash(i * 3 + 7) * 3 : 3 + hash(i * 3 + 7) * 4.5) * Math.max(0.6, v.scale)
const a = snow ? 0.45 + 0.4 * hash(i + 120) : 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(t * (0.6 + hash(i + 60)) + i * 1.9))
ctx.globalAlpha = amb.alpha * a * mul
ctx.drawImage(ambDot, x - sz / 2, y - sz / 2, sz, sz)
calls++
}
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
}
function auroraDraw(ctx, v, t, mul) {
const w = v.cssW * 1.2, h = Math.max(v.cssH * 0.42, 200)
ctx.globalCompositeOperation = 'lighter'
for (let k = 0; k < 2; k++) {
ctx.globalAlpha = (0.55 + 0.45 * Math.sin(t * 0.22 + k * 2.4)) * mul * (k ? 0.7 : 1)
const x = -v.cssW * 0.1 + Math.sin(t * 0.07 + k * 3) * v.cssW * 0.06
ctx.drawImage(aurora, x, k * h * 0.12, w, h)
calls++
}
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
}
return {
spec,
nebula,
stats: () => ({ calls }),
moon(ctx, v, time, reduced, mul = 1) {
const m = spec.moon
const sz = VIEW_W * v.scale * m.size * 1.15
ctx.globalAlpha = (reduced ? 1 : 0.92 + 0.08 * Math.sin(time * 0.35)) * mul
ctx.drawImage(moon, v.cssW * m.x - sz / 2, v.cssH * m.y - sz / 2, sz, sz)
ctx.globalAlpha = 1
calls++
},
layers(ctx, v, dist, time, lowFx, reduced, only, mul = 1) {
const t = reduced ? 0 : time
const wantFlies = !only || only === 'flies'
if (!lowFx) {
if (aurora && (!only || only === 'aurora')) auroraDraw(ctx, v, t, mul)
if (!only || only === 'trees') trees(ctx, v, far, spec.trees.far, dist, mul)
if (!only || only === 'fog') fog(ctx, v, 0, dist, t, mul)
const ff = spec.farFlies
ctx.globalCompositeOperation = 'lighter'
for (let i = 0; wantFlies && i < ff.n; i++) {
const x = hash(i * 3 + 5) * v.cssW
let y = (hash(i * 3 + 6) * v.cssH + dist * 0.035 * v.scale + Math.sin(t * 0.6 + i) * 3) % v.cssH
if (y < 0) y += v.cssH
const sz = (3 + hash(i * 3 + 7) * 3.5) * Math.max(0.6, v.scale)
ctx.globalAlpha = ff.alpha * (0.14 + 0.3 * (0.5 + 0.5 * Math.sin(t * (0.7 + hash(i + 60)) + i * 1.9))) * mul
ctx.drawImage(dot, x - sz / 2, y - sz / 2, sz, sz)
calls++
}
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
if (amb && (!only || only === 'ambient')) ambient(ctx, v, dist, t, mul)
if (!only || only === 'fog') fog(ctx, v, 1, dist, t, mul)
}
if (!only || only === 'trees') trees(ctx, v, near, spec.trees.near, dist, mul)
},
}
}
