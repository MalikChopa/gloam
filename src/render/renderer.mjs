import {
VIEW_W, VIEW_H, FIREFLY_R, HITBOX_SHRINK, SWARM_MAX, HAZARD_POOL, STRAY_POOL, T_BRAMBLE, T_CURRENT, T_BAT, T_MOTH, T_GATE,
BRAMBLE_H, GATE_H, BAT_R, MOTH_R, BAT_ENTRY_X, BAT_WARN_TICKS, LANTERN_ZONE, FLARE_R, FLARE_FX_TICKS, FLARE_CD, STRAY_R,
GATE_PERIOD, GATE_OPEN_T, GATE_CLOSE_T, GATE_SHUT_T,
T_PULSE, T_BOLT, T_COCOON, ITEM_POOL, SHIELD_TTL, WIND_F, WIND_WARN_T, BOLT_HW, SWARM_R_BASE, SWARM_R_PER, PULSE_PERIOD, PULSE_WARN,
GAUNTLET_KINDS, START_SHIELD,
} from '../sim/params.mjs'
import { rgba } from './palette.mjs'
import { createSprites, createDangerArt, createBackdrop, backdropSteps, WALL_M, JAW_M, JAW_L, setArtScale, FLOW_P, FF_HUES, BD_COUNT, NIGHT } from './sprites.mjs'
import { drawHud, resetHud } from './hud.mjs'
import { createGhostSprites, drawGhost } from './ghost.mjs'
import { fadeProgress } from '../shared/biomes.mjs'
const TAU = Math.PI * 2
const DPR_MAX = 2
const PX_MAX = 8e6
const BAT_SEQ = [0, 1, 2, 3, 4, 3, 2, 1]
const BAT_STEPS_PER_S = 26
const BAT_STEPS_FLEE = 44
const MOTH_DUST_N = 5
const WING_SEQ = [0, 1, 2, 1]
const WING_HZ = 13
const MOTH_SEQ = [0, 1, 2, 1]
const FLOW_DASH = [6, 7]
const BOLT_DASH = [12, 7]
const PEARL_FALLBACK = 'rgba(214,226,255,1)'
const TELE_UNDER = 'rgba(5,6,16,0.5)'
const PULSE_WARN_O = 1 - PULSE_WARN / PULSE_PERIOD
const SHIELD_LOW = 240
const BREAK_S = 0.5
const ECHO_S = 0.4
const PUFF_N = 6, PUFF_S = 0.3
const NEAR_RING_S = 0.42
const G_PIP_W = 22, G_PIP_H = 16, G_PIP_GAP = 8, G_Y = 26, G_X0 = 205
const G_FADE_IN = 0.25, G_FADE_OUT = 0.7
const G_DASH = [3, 3]
const G_UNDER = 'rgba(5,6,16,0.6)'
const DEATH_COL = { bolt: '#cfe0ff' }
const FF_HUE = new Uint8Array(SWARM_MAX), FF_PH = new Float32Array(SWARM_MAX), FF_SP = new Float32Array(SWARM_MAX), FF_WPH = new Uint8Array(SWARM_MAX)
const flicker = (time) => 1 + 0.035 * Math.sin(time * 13.1) + 0.025 * Math.sin(time * 21.7 + 1.3)
function domReduced() {
try { return !!(document.documentElement && document.documentElement.classList && document.documentElement.classList.contains('reduce')) } catch { return false }
}
const NO_DASH = []
const e01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const starsOf = (bd) => (bd.spec.stars === undefined ? 1 : bd.spec.stars)
const vigOf = (bd) => (bd.spec.vignette === undefined ? 0 : bd.spec.vignette)
function hash(n) {
const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
return x - Math.floor(x)
}
for (let i = 0; i < SWARM_MAX; i++) {
FF_HUE[i] = Math.min(FF_HUES - 1, Math.floor(hash(i * 5 + 17) * FF_HUES))
FF_PH[i] = hash(i * 5 + 18) * TAU
FF_SP[i] = 3.6 + hash(i * 5 + 19) * 2.6
FF_WPH[i] = Math.floor(hash(i * 5 + 20) * 4)
}
export function createRenderer(canvas, { palette, biome = 0, skins = null }) {
const ctx = canvas.getContext('2d', { alpha: false })
let pal = palette
let skinSel = skins
let sprites = createSprites(pal, skinSel)
let art = createDangerArt(pal)
const CUSTOM = -1
const bds = []
let custom = null
let bFrom = typeof biome === 'number' ? clampBiome(biome) : CUSTOM
let bTo = bFrom
let bT0 = 0
let curBiomeArg = biome
let lastCur = null, lastTick = 0
const skyGrads = []
const skyOf = (i) => backdropOf(i).spec.sky || null
function clampBiome(b) { return Number.isFinite(b) ? Math.min(NIGHT - 1, Math.max(0, Math.floor(b))) : 0 }
const building = []
function backdropOf(i) {
if (i === CUSTOM) return custom || (custom = createBackdrop(pal, curBiomeArg))
if (bds[i]) return bds[i]
const it = building[i]
if (it) {
let r = it.next()
while (!r.done) r = it.next()
building[i] = null
return (bds[i] = r.value)
}
return (bds[i] = createBackdrop(pal, i))
}
const view = { cssW: 1, cssH: 1, ox: 0, oy: 0, scale: 1 }
let lowFx = false, reduced = false
let artLow
let ghostSprites = null
let cssW = 1, cssH = 1, dpr = 1, scale = 1, ox = 0, oy = 0
let skyGrad = null, vignette = null
const logical = { x: 0, y: 0 }
let rsCur = null, rsTick = 0
let echoX = 0, echoT = -1e9, echoV = 0
let shOn = false, shX = 0, shY = 0, shR = 0
let brkT = -1e9, brkX = 0, brkY = 0, brkR = 0, brkAbs = false
const puffX = new Float32Array(PUFF_N), puffY = new Float32Array(PUFF_N), puffT = new Float64Array(PUFF_N).fill(-1e9)
let puffNext = 0, lossTick = -1
let vignette2 = null, vigNow = 0, strikingNow = false
let gSt = 0, gT0 = -1e9, gDur = 1, gC0 = -1, gPassMem = 0, gClean = 0, gEndT = -1e9, gEndOk = false
const gPass = { n: 0, len: 3 }
const deathGrads = new Map()
function resetFx(cur) {
echoT = -1e9; shOn = false; brkT = -1e9; puffT.fill(-1e9); puffNext = 0; lossTick = cur.tick
gSt = 0; gT0 = -1e9; gC0 = -1; gPassMem = 0; gEndT = -1e9; gEndOk = false; gClean = cur.gauntClean | 0
resetHud(ctx)
}
let flowEdgeCol = rgba(pal.current, 0.8), batChevCol = rgba(pal.danger, 0.9), batBandCol0 = rgba(pal.danger, 0.55), batBandCol1 = rgba(pal.danger, 0)
let batBandGradL = null, batBandGradR = null
let batUnderGradL = null, batUnderGradR = null
const stars = []
for (let i = 0; i < 96; i++) {
const layer = i % 3
stars.push({
x: hash(i * 3 + 1), y: hash(i * 3 + 2), layer,
r: 0.5 + layer * 0.45 + hash(i + 400) * 0.5,
ph: hash(i + 900) * TAU, sp: 0.6 + hash(i + 1300) * 1.6,
})
}
const STAR_SPEED = [0.05, 0.11, 0.22]
function resize() {
const r = canvas.getBoundingClientRect()
cssW = Math.max(1, r.width)
cssH = Math.max(1, r.height)
dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX)
if (cssW * cssH * dpr * dpr > PX_MAX) dpr = Math.sqrt(PX_MAX / (cssW * cssH))
canvas.width = Math.round(cssW * dpr)
canvas.height = Math.round(cssH * dpr)
scale = Math.min(cssW / VIEW_W, cssH / VIEW_H)
ox = (cssW - VIEW_W * scale) / 2
oy = (cssH - VIEW_H * scale) / 2
view.cssW = cssW; view.cssH = cssH; view.ox = ox; view.oy = oy; view.scale = scale
if (setArtScale(dpr * scale)) { art = createDangerArt(pal); artLow = undefined }
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
skyGrad = ctx.createLinearGradient(0, 0, 0, cssH)
skyGrad.addColorStop(0, pal.nightTop)
skyGrad.addColorStop(1, pal.nightBottom)
skyGrads.length = 0
batBandGradL = batBandGradR = null
batUnderGradL = batUnderGradR = null
const m = Math.min(cssW, cssH)
vignette = ctx.createRadialGradient(cssW / 2, cssH / 2, m * 0.55, cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.78)
vignette.addColorStop(0, 'rgba(5,6,16,0)')
vignette.addColorStop(1, 'rgba(5,6,16,0.5)')
vignette2 = ctx.createRadialGradient(cssW / 2, cssH / 2, m * 0.4, cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.72)
vignette2.addColorStop(0, 'rgba(3,1,10,0)')
vignette2.addColorStop(1, 'rgba(3,1,10,1)')
deathGrads.clear()
}
function setPalette(p) {
pal = p
sprites = createSprites(pal, skinSel)
art = createDangerArt(pal)
artLow = undefined
flowEdgeCol = rgba(pal.current, 0.8); batChevCol = rgba(pal.danger, 0.9); batBandCol0 = rgba(pal.danger, 0.55); batBandCol1 = rgba(pal.danger, 0)
const keep = [bFrom, bTo]
bds.length = 0
building.length = 0
custom = null
for (const i of keep) backdropOf(i)
resize()
}
function setSkins(sel) {
skinSel = sel || null
sprites = createSprites(pal, skinSel)
}
function setBiome(b) {
if (b === curBiomeArg) return
curBiomeArg = b
custom = null
if (typeof b === 'number') { bFrom = bTo = clampBiome(b) } else { bFrom = bTo = CUSTOM }
skyGrads.length = 0
backdropOf(bTo)
}
function stepBuild(i) {
const it = building[i] || (building[i] = backdropSteps(pal, i))
const r = it.next()
if (r.done) { bds[i] = r.value; building[i] = null }
}
function prewarm() {
let i = 0
while (i < NIGHT && bds[i]) i++
if (i < NIGHT) {
stepBuild(i)
let more = false
for (let j = i + 1; j < NIGHT; j++) if (!bds[j]) more = true
if (!more && !bds[NIGHT]) stepBuild(NIGHT)
}
let left = 0
for (let j = 0; j < NIGHT; j++) if (!bds[j]) left++
return left
}
function skyFor(i) {
const sky = skyOf(i)
if (!sky) return skyGrad
const k = i === CUSTOM ? BD_COUNT : i
if (!skyGrads[k]) {
const g = ctx.createLinearGradient(0, 0, 0, cssH)
g.addColorStop(0, sky.top)
g.addColorStop(1, sky.bottom)
skyGrads[k] = g
}
return skyGrads[k]
}
function toLogical(px, py) {
logical.x = (px - ox) / scale
logical.y = (py - oy) / scale
return logical
}
function useScreen() { ctx.setTransform(dpr, 0, 0, dpr, 0, 0) }
function useLogical(sx = 0, sy = 0) { ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (ox + sx), dpr * (oy + sy)) }
function drawBackground(dist, time, lowFx, k, menu) {
useScreen()
ctx.globalCompositeOperation = 'source-over'
ctx.globalAlpha = 1
const fading = bFrom !== bTo && k < 1
const A = backdropOf(bFrom), B = fading ? backdropOf(bTo) : null
const main = fading ? A : backdropOf(bTo)
if (fading) {
ctx.fillStyle = skyFor(bFrom)
ctx.fillRect(0, 0, cssW, cssH)
ctx.globalAlpha = k
ctx.fillStyle = skyFor(bTo)
ctx.fillRect(0, 0, cssW, cssH)
ctx.globalAlpha = 1
} else {
ctx.fillStyle = skyFor(bTo)
ctx.fillRect(0, 0, cssW, cssH)
}
ctx.globalCompositeOperation = 'lighter'
if (!lowFx) {
const nb = Math.max(cssW, cssH)
if (fading) {
nebulaPair(A, nb, 1 - k)
nebulaPair(B, nb, k)
} else nebulaPair(main, nb, 1)
}
if (fading) { A.moon(ctx, view, time, reduced, 1 - k); B.moon(ctx, view, time, reduced, k) } else main.moon(ctx, view, time, reduced)
const sf = fading ? starsOf(A) + (starsOf(B) - starsOf(A)) * k : starsOf(main)
vigNow = fading ? vigOf(A) + (vigOf(B) - vigOf(A)) * k : vigOf(main)
const nStars = Math.round(stars.length * sf)
ctx.fillStyle = pal.text
for (let i = 0; i < nStars; i++) {
const st = stars[i]
let y = (st.y + (dist * STAR_SPEED[st.layer] * scale) / cssH) % 1
if (y < 0) y += 1
const tw = 0.5 + 0.5 * Math.sin(time * st.sp + st.ph)
ctx.globalAlpha = (0.18 + 0.12 * st.layer) + 0.3 * tw
const sz = st.r
ctx.fillRect(st.x * cssW - sz / 2, y * cssH - sz / 2, sz, sz)
}
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
if (fading) { A.layers(ctx, view, dist, time, lowFx, reduced, undefined, 1 - k); B.layers(ctx, view, dist, time, lowFx, reduced, undefined, k) }
else main.layers(ctx, view, dist, time, lowFx, reduced)
if (menu && !lowFx) drawMenuLife(time)
}
function drawMenuLife(time) {
const t = reduced ? 0 : time
ctx.globalCompositeOperation = 'lighter'
const bx = cssW * (0.5 + 0.3 * Math.sin(t * 0.21)), by = cssH * (0.45 + 0.2 * Math.sin(t * 0.17 + 1.3))
ctx.globalAlpha = 0.1
const hr = Math.max(cssW, cssH) * 0.34
ctx.drawImage(sprites.halo, bx - hr, by - hr, hr * 2, hr * 2)
for (let i = 0; i < 8; i++) {
const sp = 7 + hash(i * 3 + 4) * 9
let y = (cssH * hash(i * 3 + 3) - t * sp) % cssH
if (y < 0) y += cssH
const x = cssW * (0.08 + 0.84 * hash(i * 3 + 2)) + Math.sin(t * (0.3 + 0.4 * hash(i)) + i * 2) * 14
const sz = (6 + hash(i * 3 + 5) * 7) * Math.max(0.8, scale)
ctx.globalAlpha = 0.16 + 0.3 * (0.5 + 0.5 * Math.sin(t * (0.6 + hash(i + 60)) + i * 1.9))
ctx.drawImage(sprites.trail, x - sz / 2, y - sz / 2, sz, sz)
}
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
}
function nebulaPair(bd, nb, mul) {
const img = bd.nebula || sprites.nebula
ctx.globalAlpha = mul
ctx.drawImage(img, -nb * 0.2, -nb * 0.1, nb * 0.9, nb * 0.9)
ctx.drawImage(img, cssW - nb * 0.6, cssH - nb * 0.7, nb * 0.9, nb * 0.9)
ctx.globalAlpha = 1
}
function drawWallSide(x0, x1, y, seed, rimX, left, time) {
if (x1 - x0 < 2) return
const W = Math.ceil(x1 - x0)
ctx.drawImage(art.wall(W, seed, left, artLow), left ? x1 - W : x0, y - WALL_M, W, BRAMBLE_H + 2 * WALL_M)
ctx.globalCompositeOperation = 'lighter'
ctx.globalAlpha = lowFx || reduced ? 0.85 : 0.78 + 0.22 * Math.sin(time * 2.4 + seed)
ctx.drawImage(sprites.danger, rimX - 26, y + BRAMBLE_H / 2 - 26, 52, 52)
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
}
const ipos = { x: 0, y: 0 }
function interp(hz, alpha) {
const dx = hz.x - hz.px
const dy = hz.y - hz.py
if (dx * dx + dy * dy > 3600) { ipos.x = hz.x; ipos.y = hz.y } else { ipos.x = hz.px + dx * alpha; ipos.y = hz.py + dy * alpha }
return ipos
}
function drawFlowLayer(layer, x0, w, y, h, sens, variant, t, speed) {
const P = FLOW_P[layer]
const off = (((t * speed * sens) % P) + P) % P
const img = art.flow(sens, layer, h, variant)
for (let x = x0 - P + off; x < x0 + w; x += P) ctx.drawImage(img, x, y, P, h)
}
function drawCurrent(hz, y, time) {
const w = hz.w, h = hz.h, x0 = hz.x - w / 2, sens = hz.sens
const parts = art.current(Math.round(w), Math.round(h), artLow)
ctx.drawImage(parts.body, x0, y, w, h)
const t = reduced ? 0 : time
const variant = hz.chunk % 3
ctx.save()
ctx.beginPath(); ctx.rect(x0, y, w, h); ctx.clip()
if (!artLow) drawFlowLayer(1, x0, w, y, h, sens, variant, t, 36)
drawFlowLayer(0, x0, w, y, h, sens, variant, t, 62)
ctx.restore()
ctx.drawImage(parts.veil, x0, y, w, h)
ctx.save()
ctx.setLineDash(FLOW_DASH)
ctx.lineDashOffset = -t * 30 * sens
ctx.strokeStyle = flowEdgeCol
ctx.lineWidth = 1.5
ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0, y + h); ctx.moveTo(x0 + w, y); ctx.lineTo(x0 + w, y + h); ctx.stroke()
ctx.restore()
}
function drawJaw(x0, x1, y, inner, dir, vi) {
let w = x1 - x0
if (w < 1) return
if (w > JAW_L) w = JAW_L
const img = art.jaw(dir, vi, artLow)
const hu = GATE_H + 2 * JAW_M
const k = img.artS || 2
if (dir > 0) ctx.drawImage(img, (JAW_L - w) * k, 0, w * k, hu * k, inner - w, y - JAW_M, w, hu)
else ctx.drawImage(img, 0, 0, w * k, hu * k, inner, y - JAW_M, w, hu)
}
function drawGate(hz, y, time) {
const phase = (hz.ph + hz.age) % GATE_PERIOD
const warn = !!hz.tr
const closing = phase >= GATE_OPEN_T && phase < GATE_OPEN_T + GATE_CLOSE_T
const shut = phase >= GATE_OPEN_T + GATE_CLOSE_T && phase < GATE_OPEN_T + GATE_CLOSE_T + GATE_SHUT_T
const pulse = 0.5 + 0.5 * Math.sin(time * (reduced ? 6 : 14))
const sh = warn && !reduced ? Math.sin(time * 40) * 1.8 : 0
const half = hz.o / 2
const gl = hz.x - half
const gr = hz.x + half
const vl = hz.chunk & 1, vr = (hz.chunk + 1) & 1
drawJaw(-12 + sh, gl + sh, y, gl + sh, 1, vl)
drawJaw(gr + sh, VIEW_W + 12 + sh, y, gr + sh, -1, vr)
if (warn) {
ctx.globalAlpha = 0.1 + 0.22 * pulse
ctx.fillStyle = pal.danger
ctx.fillRect(-12 + sh, y, gl + 12, GATE_H)
ctx.fillRect(gr + sh, y, VIEW_W + 12 - gr, GATE_H)
ctx.globalAlpha = 1
}
if (shut || hz.o < 1.5) {
ctx.fillStyle = pal.danger
ctx.fillRect(hz.x - 2 + sh, y - 1, 4, GATE_H + 2)
}
const ga = closing ? 1 : warn ? 0.65 + 0.35 * pulse : shut ? 0.3 : hz.o < 138 ? 0.45 : 0.6
ctx.globalCompositeOperation = 'lighter'
ctx.globalAlpha = ga
ctx.drawImage(sprites.danger, gl + sh - 24, y + GATE_H / 2 - 24, 48, 48)
ctx.drawImage(sprites.danger, gr + sh - 24, y + GATE_H / 2 - 24, 48, 48)
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
if (warn && (reduced || lowFx || Math.floor(time * 5) % 2 === 0)) ctx.drawImage(sprites.warn, hz.x - 14, y - 34, 28, 28)
}
function drawBatWarn(hz, time) {
const left = hz.sens < 0
const ex = left ? BAT_ENTRY_X : VIEW_W - BAT_ENTRY_X
const k = Math.min(1, hz.age / BAT_WARN_TICKS)
const pulse = reduced ? 1 : 0.5 + 0.5 * Math.sin(time * (8 + 9 * k))
const edgeX = left ? 0 : VIEW_W
let g = left ? batBandGradL : batBandGradR
if (!g) {
g = ctx.createLinearGradient(edgeX, 0, left ? 46 : VIEW_W - 46, 0)
g.addColorStop(0, batBandCol0)
g.addColorStop(1, batBandCol1)
if (left) batBandGradL = g; else batBandGradR = g
}
let u = left ? batUnderGradL : batUnderGradR
if (!u) {
u = ctx.createLinearGradient(edgeX, 0, left ? 46 : VIEW_W - 46, 0)
u.addColorStop(0, TELE_UNDER)
u.addColorStop(1, 'rgba(5,6,16,0)')
if (left) batUnderGradL = u; else batUnderGradR = u
}
ctx.fillStyle = u
ctx.fillRect(left ? 0 : VIEW_W - 46, hz.y - 42, 46, 84)
ctx.globalAlpha = ctx.globalAlpha * (0.4 + 0.6 * pulse)
ctx.fillStyle = g
ctx.fillRect(left ? 0 : VIEW_W - 46, hz.y - 42, 46, 84)
const sz = 34 + 8 * pulse
ctx.globalAlpha = 0.65 + 0.35 * pulse
ctx.drawImage(sprites.warn, ex - sz / 2, hz.y - sz / 2 - 2, sz, sz)
ctx.globalAlpha = 1
const dir = left ? 1 : -1
ctx.lineCap = 'round'
const cx = ex + dir * (22 + 4 * pulse)
ctx.beginPath(); ctx.moveTo(cx - dir * 5, hz.y - 7); ctx.lineTo(cx, hz.y); ctx.lineTo(cx - dir * 5, hz.y + 7)
ctx.strokeStyle = TELE_UNDER; ctx.lineWidth = 5.5; ctx.stroke()
ctx.strokeStyle = batChevCol; ctx.lineWidth = 2.5; ctx.stroke()
ctx.lineCap = 'butt'
}
function drawBat(hz, alpha, time) {
if (hz.st === 0) { drawBatWarn(hz, time); return }
const p = interp(hz, alpha)
const fleeing = hz.st === 2
const chewing = hz.st === 1 && hz.d > 0
const step = Math.floor(time * (fleeing ? BAT_STEPS_FLEE : BAT_STEPS_PER_S) + hz.chunk * 3)
const fi = BAT_SEQ[step & 7]
const sc = chewing ? (reduced ? 1.12 : 1.12 + 0.06 * Math.sin(time * 16)) : 1
ctx.globalCompositeOperation = 'lighter'
ctx.globalAlpha = 0.8
ctx.drawImage(sprites.danger, p.x - 30, p.y - 30, 60, 60)
ctx.globalCompositeOperation = 'source-over'
ctx.save()
ctx.translate(p.x, p.y)
let tilt = hz.vx * 0.09
if (tilt > 0.4) tilt = 0.4; else if (tilt < -0.4) tilt = -0.4
ctx.rotate(tilt)
const fade = fleeing ? (reduced || lowFx ? 0.7 : 0.55 + 0.25 * Math.sin(time * 16)) : 1
if (!lowFx && !reduced) {
let gx = hz.px - hz.x, gy = hz.py - hz.y
const gd = gx * gx + gy * gy
if (gd > 0.5 && gd < 3600) {
const gl = Math.sqrt(gd) * 1.3
const k = gl > 7 ? 7 / Math.sqrt(gd) : 1.3
gx *= k; gy *= k
ctx.globalAlpha = 0.22 * fade
ctx.drawImage(sprites.batFrames[BAT_SEQ[(step + 7) & 7]], -24 * sc + gx, -18 * sc + gy, 48 * sc, 36 * sc)
}
}
ctx.globalAlpha = fade
ctx.drawImage(sprites.batFrames[fi], -24 * sc, -18 * sc, 48 * sc, 36 * sc)
if (!lowFx) {
ctx.globalCompositeOperation = 'lighter'
ctx.globalAlpha = fade * (reduced ? 0.8 : 0.65 + 0.35 * Math.sin(time * 9 + hz.chunk))
ctx.drawImage(sprites.batEyes, -6 * sc, -8.2 * sc, 12 * sc, 6 * sc)
}
ctx.restore()
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
}
function drawMoth(hz, alpha, time) {
const p = interp(hz, alpha)
const fi = MOTH_SEQ[Math.floor(time * 9 + hz.chunk) & 3]
const bob = Math.sin(time * 3 + hz.chunk) * 1.5
const eating = hz.st === 1
ctx.globalCompositeOperation = 'lighter'
ctx.globalAlpha = 0.9
ctx.drawImage(sprites.mothGlow, p.x - 34, p.y + bob - 34, 68, 68)
const n = lowFx ? 2 : MOTH_DUST_N
for (let i = 0; i < n; i++) {
const ph = reduced ? hash(i + hz.chunk * 7) : (time * 0.55 + hash(i * 3 + hz.chunk * 7)) % 1
const dx = (hash(i * 5 + hz.chunk * 11) - 0.5) * 34 + Math.sin(time * 1.7 + i * 2.3) * (reduced ? 0 : 2)
ctx.globalAlpha = (1 - ph) * (eating ? 0.5 : 0.8)
const sz = 3 + hash(i + 40 + hz.chunk) * 2.2
ctx.drawImage(sprites.mothDust, p.x + dx - sz / 2, p.y + bob + 4 + ph * 26 - sz / 2, sz, sz)
}
ctx.globalCompositeOperation = 'source-over'
ctx.globalAlpha = eating ? 0.7 : 1
if (reduced) ctx.drawImage(sprites.mothFrames[fi], p.x - 25, p.y + bob - 20, 50, 40)
else {
ctx.save()
ctx.translate(p.x, p.y + bob)
ctx.rotate(Math.sin(time * 5.5 + hz.chunk * 1.3) * 0.07)
ctx.drawImage(sprites.mothFrames[fi], -25, -20 * (1 + 0.025 * Math.sin(time * 9 + hz.chunk)), 50, 40)
ctx.restore()
}
ctx.globalAlpha = 1
}
function drawPulseSide(x0, x1, y, seed, rimX, left, time, e, ign) {
if (x1 - x0 < 2) return
const W = Math.ceil(x1 - x0), x = left ? x1 - W : x0
const img = art.pulse(W, seed, left, artLow), ak = img.artS || 2, sw = W * ak, sh = (BRAMBLE_H + 2 * WALL_M) * ak
if (e < 0.999) ctx.drawImage(img, sw, 0, sw, sh, x, y - WALL_M, W, BRAMBLE_H + 2 * WALL_M)
if (e > 0.01) {
ctx.globalAlpha = e
ctx.drawImage(img, 0, 0, sw, sh, x, y - WALL_M, W, BRAMBLE_H + 2 * WALL_M)
ctx.globalCompositeOperation = 'lighter'
ctx.globalAlpha = e * (lowFx || reduced ? 0.85 : 0.78 + 0.22 * Math.sin(time * 2.4 + seed))
ctx.drawImage(sprites.danger, rimX - 26, y + BRAMBLE_H / 2 - 26, 52, 52)
if (ign > 0) { ctx.globalAlpha = ign; ctx.drawImage(sprites.danger, rimX - 44, y + BRAMBLE_H / 2 - 44, 88, 88) }
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
}
}
function drawPulse(hz, y, k, time) {
const seed = (hz.chunk % 97) + k
const gl = hz.x - hz.w / 2, gr = hz.x + hz.w / 2
let e = hz.st === 1 ? 1 : 0, ign = 0
if (e === 1) { if (hz.o < 0.1 && !lowFx && !reduced) ign = 1 - hz.o * 10 }
else if (hz.tr) {
const tp = e01((hz.o - PULSE_WARN_O) / (1 - PULSE_WARN_O))
e = lowFx || reduced ? 0.25 + 0.5 * tp : 0.55 * (0.5 - 0.5 * Math.cos(tp * TAU)) + 0.45 * tp * tp
}
drawPulseSide(-12, gl, y, seed, gl, true, time, e, ign)
drawPulseSide(gr, VIEW_W + 12, y, seed + 5, gr, false, time, e, ign)
}
function drawBoltWarn(hz, time) {
const x = hz.x, o = e01(hz.o)
ctx.globalCompositeOperation = 'lighter'
ctx.globalAlpha = 0.05 + 0.22 * o * o
ctx.drawImage(art.boltGlow, x - 18, 0, 36, VIEW_H)
ctx.globalCompositeOperation = 'source-over'
ctx.save()
ctx.lineCap = 'butt'
ctx.globalAlpha = 1
ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VIEW_H)
ctx.strokeStyle = 'rgba(5,6,16,0.6)'; ctx.lineWidth = 4 + 3 * o; ctx.stroke()
if (!lowFx) { ctx.setLineDash(BOLT_DASH); ctx.lineDashOffset = reduced ? 0 : -time * 70 }
ctx.strokeStyle = pal.text; ctx.globalAlpha = 0.55 + 0.4 * o; ctx.lineWidth = 1 + 1.8 * o
ctx.stroke()
ctx.setLineDash(NO_DASH)
const n = lowFx ? 3 : 2 + ((o * 8) | 0), L = 5 + 9 * o
ctx.beginPath()
for (let j = 1; j <= n; j++) { const yy = (VIEW_H * j) / (n + 1); ctx.moveTo(x - L, yy); ctx.lineTo(x + L, yy) }
ctx.strokeStyle = 'rgba(5,6,16,0.6)'; ctx.globalAlpha = 1; ctx.lineWidth = 4.4; ctx.stroke()
ctx.strokeStyle = pal.text; ctx.globalAlpha = 0.5 + 0.45 * o; ctx.lineWidth = 1.6; ctx.stroke()
if (o > 0.45) {
const hw = BOLT_HW + FIREFLY_R
ctx.beginPath(); ctx.moveTo(x - hw, 0); ctx.lineTo(x - hw, VIEW_H); ctx.moveTo(x + hw, 0); ctx.lineTo(x + hw, VIEW_H)
ctx.globalAlpha = (o - 0.45) * 1.2; ctx.lineWidth = 1; ctx.strokeStyle = pal.text; ctx.stroke()
}
ctx.restore()
const sz = 14 + 22 * o
ctx.globalCompositeOperation = 'lighter'
ctx.globalAlpha = 0.9
ctx.drawImage(sprites.pearlDot, x - sz / 2, 10 - sz / 2, sz, sz)
ctx.drawImage(sprites.pearlDot, x - sz / 2, VIEW_H - 10 - sz / 2, sz, sz)
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
if (hz.gl) {
ctx.strokeStyle = pal.text; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.85
ctx.beginPath(); ctx.arc(x, 10, sz / 2 + 5, 0, TAU); ctx.moveTo(x + sz / 2 + 5, VIEW_H - 10); ctx.arc(x, VIEW_H - 10, sz / 2 + 5, 0, TAU); ctx.stroke()
ctx.globalAlpha = 1
}
}
function drawBoltColumn(bx, v, a) {
ctx.globalAlpha = a * 0.55; ctx.drawImage(art.boltGlow, bx - 30, 0, 60, VIEW_H)
ctx.globalAlpha = a * 0.95; ctx.drawImage(art.boltGlow, bx - 15, 0, 30, VIEW_H)
ctx.globalAlpha = a; ctx.drawImage(art.bolts[v], bx - 24, -20, 48, VIEW_H + 40)
}
function drawBoltStrike(hz, k, time, over) {
const x = hz.x, o = e01(hz.o), v = ((((hz.chunk | 0) + k) % 3) + 3) % 3
echoX = x; echoT = time; echoV = v; strikingNow = true
ctx.globalCompositeOperation = 'lighter'
if (!lowFx && !reduced && !over) {
const f = 0.16 * (1 - o * 2.5)
if (f > 0) { ctx.globalAlpha = f; ctx.fillStyle = PEARL_FALLBACK; ctx.fillRect(-12, 0, VIEW_W + 24, VIEW_H) }
}
drawBoltColumn(x, v, 1 - o * 0.35)
if (!lowFx) {
ctx.globalAlpha = 0.28 * (1 - o)
ctx.drawImage(art.bolts[(v + 1) % 3], x - 21, -20, 48, VIEW_H + 40)
const e = 1 - (1 - o) * (1 - o)
for (let i = 0; i < 6; i++) {
const a = -Math.PI * (0.08 + 0.84 * hash(i * 3 + 5)), d = (reduced ? 12 : 6 + 28 * e) * (0.5 + hash(i * 3 + 6))
const sz = 3 + 7 * (1 - o)
ctx.globalAlpha = (1 - o) * 0.95
ctx.drawImage(sprites.pearlDot, x + Math.cos(a) * d - sz / 2, VIEW_H - 6 + Math.sin(a) * d - sz / 2, sz, sz)
}
}
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
}
function drawBoltEcho(time) {
const len = lowFx || reduced ? ECHO_S * 0.5 : ECHO_S
const ea = time - echoT
if (strikingNow || !(ea > 0 && ea < len)) return
const p = ea / len, q = (1 - p) * (1 - p)
ctx.globalCompositeOperation = 'lighter'
drawBoltColumn(echoX, echoV, (lowFx || reduced ? 0.22 : 0.34) * q)
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
}
function drawItem(it, y, k, time) {
const bob = reduced ? 0 : Math.sin(time * 1.3 + k * 1.9) * 2.5
const x = it.x + (reduced ? 0 : Math.sin(time * 1.7 + k) * 2), yy = y + bob
ctx.globalCompositeOperation = 'lighter'
if (it.kind === T_COCOON) {
ctx.globalAlpha = 0.95
ctx.drawImage(sprites.cocoon, x - 23, yy - 23, 46, 46)
if (!lowFx && !reduced) {
const ph = (time * 0.7 + k * 0.31) % 1
ctx.globalAlpha = (1 - ph) * 0.4
ctx.strokeStyle = pal.text; ctx.lineWidth = 1.4
ctx.beginPath(); ctx.arc(x, yy, 14 + 12 * ph, 0, TAU); ctx.stroke()
}
} else {
const fl = reduced ? 1 : 1 + 0.1 * Math.sin(time * 14 + k * 3)
ctx.globalAlpha = 0.95
ctx.drawImage(sprites.ember, x - 20 * fl, yy - 20 * fl, 40 * fl, 40 * fl)
if (!lowFx) for (let i = 0; i < 3; i++) {
const ph = reduced ? i / 3 : (time * 0.9 + i / 3 + k * 0.17) % 1
const sz = 7 * (1 - ph) + 2
ctx.globalAlpha = (1 - ph) * 0.9
ctx.drawImage(sprites.emberDot, x + (hash(i * 5 + k) - 0.5) * 12 + (reduced ? 0 : Math.sin(ph * 6 + i) * 2) - sz / 2, yy - 10 - ph * 22 - sz / 2, sz, sz)
}
}
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
}
function drawShell(cx, cy, R, shield, time) {
let a = 0.62
if (shield < SHIELD_LOW) a *= lowFx || reduced ? 0.4 + 0.6 * (shield / SHIELD_LOW) : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 9)) * (0.5 + 0.5 * shield / SHIELD_LOW)
ctx.globalCompositeOperation = 'lighter'
ctx.globalAlpha = a
ctx.drawImage(sprites.shell, cx - R, cy - R, R * 2, R * 2)
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
}
function drawBreak(p) {
const R = brkR, q = reduced ? 0.5 : p
ctx.globalCompositeOperation = 'lighter'
if (brkAbs) {
const sz = R * (1 + 0.3 * q)
ctx.globalAlpha = (1 - p) * 0.9
ctx.drawImage(sprites.shell, brkX - sz, brkY - sz, sz * 2, sz * 2)
if (!lowFx) {
ctx.strokeStyle = pal.text; ctx.globalAlpha = 1 - p; ctx.lineWidth = 3 - 2 * p
ctx.beginPath(); ctx.arc(brkX, brkY, R * (1 + 0.7 * q), 0, TAU); ctx.stroke()
if (!reduced) {
ctx.lineWidth = 2.2; ctx.lineCap = 'round'
ctx.beginPath()
for (let i = 0; i < 8; i++) {
const a = i * (TAU / 8) + 0.3, r0 = R * (0.9 + 0.9 * p), r1 = r0 + 7 * (1 - p)
ctx.moveTo(brkX + Math.cos(a) * r0, brkY + Math.sin(a) * r0); ctx.lineTo(brkX + Math.cos(a) * r1, brkY + Math.sin(a) * r1)
}
ctx.stroke()
ctx.lineCap = 'butt'
}
}
} else {
const sz = R * (1 - 0.12 * q)
ctx.globalAlpha = (1 - p) * 0.5
ctx.drawImage(sprites.shell, brkX - sz, brkY - sz, sz * 2, sz * 2)
}
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
}
function drawWind(cur, time, cx, cy, R, hasSwarm) {
const st = cur.windSt | 0
if (st !== 1 && st !== 2) return
const dir = cur.windDir > 0 ? 1 : -1
const k = st === 1 ? e01((cur.windT | 0) / WIND_WARN_T) : e01(Math.abs(cur.windF) / WIND_F)
const t = reduced ? 0 : time
const span = VIEW_W + 160
const streak = dir > 0 ? sprites.streakR : sprites.streakL
const n = st === 1 ? 1 + (((lowFx ? 4 : 8) * k) | 0) : lowFx ? 7 : reduced ? 8 : 16
const am = st === 1 ? 0.7 : 1
for (let i = 0; i < n; i++) {
const sp = 240 + hash(i * 7 + 2) * 200, len = 24 + hash(i * 7 + 4) * 34
const px = (hash(i * 7 + 3) * span + t * sp) % span
ctx.globalAlpha = (0.2 + 0.5 * hash(i * 7 + 5)) * k * am
ctx.drawImage(streak, dir > 0 ? px - 80 : VIEW_W + 80 - px, hash(i * 7 + 1) * VIEW_H, len, 3)
}
if (st === 2 && !lowFx) {
for (let i = 0; i < 5; i++) {
const sp = 130 + hash(i * 5 + 41) * 90
const px = (hash(i * 5 + 42) * span + t * sp) % span
const fr = reduced ? i & 3 : (Math.floor(time * 5) + i) & 3
ctx.globalAlpha = 0.85 * k
ctx.drawImage(sprites.leaves[fr], dir > 0 ? px - 80 : VIEW_W + 80 - px, 20 + hash(i * 5 + 43) * (VIEW_H - 60) + (reduced ? 0 : Math.sin(time * 2.6 + i * 1.7) * 14), 11, 11)
}
}
if (st === 1) {
ctx.globalAlpha = 0.1 + 0.55 * k
ctx.drawImage(dir > 0 ? sprites.edgeR : sprites.edgeL, dir > 0 ? 0 : VIEW_W - 44, 0, 44, VIEW_H)
const ex = dir > 0 ? 16 : VIEW_W - 16
ctx.save()
ctx.beginPath()
for (let j = 0; j < 3; j++) {
const yy = VIEW_H * (0.4 + 0.1 * j), ox = reduced ? 0 : ((time * 40 + j * 8) % 12) * dir
ctx.moveTo(ex - dir * 6 + ox, yy - 8); ctx.lineTo(ex + ox, yy); ctx.lineTo(ex - dir * 6 + ox, yy + 8)
}
ctx.lineCap = 'round'; ctx.lineJoin = 'round'
ctx.strokeStyle = 'rgba(5,6,16,0.6)'; ctx.globalAlpha = 1; ctx.lineWidth = 5.4; ctx.stroke()
ctx.strokeStyle = pal.text; ctx.globalAlpha = 0.35 + 0.6 * k; ctx.lineWidth = 2.4; ctx.stroke()
ctx.restore()
} else if (hasSwarm) {
for (let i = 0; i < 3; i++) {
const len = 22 + 8 * i
ctx.globalAlpha = 0.6 * k
ctx.drawImage(streak, dir > 0 ? cx - (R + 16 + 14 * i) - len : cx + R + 16 + 14 * i, cy + (i - 1) * 15, len, 3)
}
}
ctx.globalAlpha = 1
}
function drawNearRing(lx, ly, age) {
const p = age / NEAR_RING_S, e = reduced ? 0.5 : 1 - (1 - p) * (1 - p)
const r = 16 + 26 * e
ctx.globalCompositeOperation = 'lighter'
ctx.strokeStyle = pal.accent
ctx.globalAlpha = (1 - p) * 0.8
ctx.lineWidth = 2 - 1.2 * p
ctx.beginPath(); ctx.arc(lx, ly, r, 0, TAU); ctx.stroke()
if (!lowFx) for (let i = 0; i < 8; i++) {
const a = i * (TAU / 8) + 0.4, rr = r + 4 * e, sz = 6 * (1 - p) + 2
ctx.globalAlpha = (1 - p) * 0.9
ctx.drawImage(sprites.pearlDot, lx + Math.cos(a) * rr - sz / 2, ly + Math.sin(a) * rr - sz / 2, sz, sz)
}
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
}
function addPuff(x, y, time) {
puffX[puffNext] = x; puffY[puffNext] = y; puffT[puffNext] = time
puffNext = (puffNext + 1) % PUFF_N
}
function drawPuffs(time) {
ctx.globalCompositeOperation = 'lighter'
ctx.strokeStyle = pal.fireHalo
ctx.lineWidth = 1.6
for (let i = 0; i < PUFF_N; i++) {
const a = time - puffT[i]
if (!(a >= 0 && a < PUFF_S)) continue
const p = a / PUFF_S, r = 3 + (reduced ? 4 : 9) * (1 - (1 - p) * (1 - p))
ctx.globalAlpha = (1 - p) * 0.8
ctx.beginPath(); ctx.arc(puffX[i], puffY[i], r, 0, TAU); ctx.stroke()
}
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
}
function deathColor(cause) {
if (cause === 'bolt') return DEATH_COL.bolt
if (cause === 'moth') return pal.moth
if (cause === 'current') return pal.current
return pal.danger
}
function drawDeathAccent(cause, deathT) {
if (cause === 'time' || !cause) return
let g = deathGrads.get(cause)
if (!g) {
const col = deathColor(cause)
g = ctx.createRadialGradient(cssW / 2, cssH / 2, Math.min(cssW, cssH) * 0.3, cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.75)
g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, 1))
deathGrads.set(cause, g)
}
ctx.globalAlpha = (lowFx ? 0.15 : 0.3) * e01(deathT * 2.2)
ctx.fillStyle = g
ctx.fillRect(0, 0, cssW, cssH)
ctx.globalAlpha = 1
}
function trackGauntlet(cur, time, fx) {
const st = cur.gauntSt | 0
if (st !== gSt) {
if (st === 1) { gT0 = time; gC0 = -1; gPassMem = 0; gDur = Math.max(1, (cur.gauntAt | 0) - cur.tick) }
else if (st === 0 && gSt !== 0) { gEndT = time; gEndOk = (cur.gauntClean | 0) > gClean }
gSt = st
}
if (st !== 0) gClean = cur.gauntClean | 0
if (fx.gauntAge !== undefined) { gT0 = time - fx.gauntAge; if (fx.gauntDur) gDur = fx.gauntDur }
if (fx.gauntEndAge !== undefined) { gEndT = time - fx.gauntEndAge; gEndOk = !!fx.gauntEndOk }
gPass.len = GAUNTLET_KINDS[(cur.gauntKind | 0) % GAUNTLET_KINDS.length].length
gPass.n = 0
if (st === 0) return
let minC = 1e9, maxC = -1, minAhead = 1e9
for (let k = 0; k < HAZARD_POOL; k++) {
const hz = cur.hazards[k]
if (!hz.active || !hz.gl) continue
if (hz.chunk < minC) minC = hz.chunk
if (hz.chunk > maxC) maxC = hz.chunk
if ((hz.type === T_BOLT || hz.y <= cur.lantern.y) && hz.chunk < minAhead) minAhead = hz.chunk
}
let n = gPassMem
if (minC === 1e9) { if (st === 2 && (cur.gauntEndAt | 0) > 0) n = gPass.len }
else {
if (gC0 < 0 || minC < gC0) gC0 = minC
n = (minAhead === 1e9 ? maxC + 1 : minAhead) - gC0
}
if (n > gPassMem) gPassMem = n
gPass.n = gPassMem < gPass.len ? gPassMem : gPass.len
}
function gaunGlyph(el, cx, cy) {
if (el === T_PULSE) { ctx.setLineDash(G_DASH); ctx.strokeRect(cx - 8, cy - 4, 16, 8); ctx.setLineDash(NO_DASH) }
else if (el === T_GATE) {
ctx.beginPath()
ctx.moveTo(cx - 9, cy - 5); ctx.lineTo(cx - 2, cy); ctx.lineTo(cx - 9, cy + 5); ctx.closePath()
ctx.moveTo(cx + 9, cy - 5); ctx.lineTo(cx + 2, cy); ctx.lineTo(cx + 9, cy + 5); ctx.closePath()
ctx.fill()
} else if (el === T_BOLT) {
ctx.beginPath()
ctx.moveTo(cx + 3, cy - 8); ctx.lineTo(cx - 4, cy + 1); ctx.lineTo(cx, cy + 1); ctx.lineTo(cx - 3, cy + 8); ctx.lineTo(cx + 5, cy - 2); ctx.lineTo(cx + 1, cy - 2); ctx.closePath()
ctx.fill()
} else {
ctx.beginPath()
ctx.rect(cx - 10, cy - 6, 11, 4); ctx.rect(cx + 5, cy - 6, 5, 4); ctx.rect(cx - 10, cy + 2, 5, 4); ctx.rect(cx + 1, cy + 2, 9, 4)
ctx.fill()
}
}
function drawGauntlet(cur, time) {
const st = gSt
const ending = st === 0 && time - gEndT < G_FADE_OUT && time - gEndT >= 0
if (st === 0 && !ending) return
const kind = GAUNTLET_KINDS[(cur.gauntKind | 0) % GAUNTLET_KINDS.length]
const n = kind.length
let a = 1
if (st === 1 && !reduced) a = e01((time - gT0) / G_FADE_IN)
else if (ending && !reduced) a = 1 - (time - gEndT) / G_FADE_OUT
const bw = n * G_PIP_W + (n - 1) * G_PIP_GAP, x0 = G_X0
ctx.globalCompositeOperation = 'source-over'
ctx.lineJoin = 'round'
if (st === 2 && !lowFx) {
ctx.globalAlpha = reduced ? 0.3 : 0.3 + 0.1 * Math.sin(time * 5)
ctx.strokeStyle = pal.text; ctx.lineWidth = 2
ctx.setLineDash(FLOW_DASH)
ctx.strokeRect(1.5, 1.5, VIEW_W - 3, VIEW_H - 3)
ctx.setLineDash(NO_DASH)
}
ctx.globalAlpha = a
ctx.fillStyle = G_UNDER
ctx.fillRect(x0 - 3, G_Y - G_PIP_H / 2, bw + 6, G_PIP_H)
const passed = ending ? n : gPass.n, perfect = ending && gEndOk
ctx.fillStyle = ctx.strokeStyle = perfect ? pal.fireCore : pal.text
ctx.lineWidth = 1.8
for (let i = 0; i < n; i++) {
const cx = x0 + i * (G_PIP_W + G_PIP_GAP) + G_PIP_W / 2
const curr = i === passed && st !== 0
ctx.globalAlpha = a * (curr ? 1 : i < passed ? 0.35 : 0.7)
if (perfect) {
ctx.beginPath(); ctx.moveTo(cx - 6, G_Y); ctx.lineTo(cx - 2, G_Y + 4); ctx.lineTo(cx + 6, G_Y - 5); ctx.stroke()
} else gaunGlyph(kind[i], cx, G_Y)
if (curr) { ctx.lineWidth = 1.4; ctx.strokeRect(cx - G_PIP_W / 2 - 1.5, G_Y - G_PIP_H / 2 - 1.5, G_PIP_W + 3, G_PIP_H + 3); ctx.lineWidth = 1.8 }
}
if (st === 1) {
ctx.globalAlpha = a
ctx.fillStyle = G_UNDER
ctx.fillRect(x0, G_Y + G_PIP_H / 2 + 3, bw, 3)
ctx.fillStyle = pal.text
ctx.fillRect(x0 + 0.5, G_Y + G_PIP_H / 2 + 3.5, (bw - 1) * e01(((cur.gauntAt | 0) - cur.tick) / gDur), 2)
}
ctx.globalAlpha = 1
}
function drawGauntRails(y, h, gl, gr) {
ctx.globalCompositeOperation = 'source-over'
ctx.globalAlpha = 0.6
ctx.strokeStyle = pal.text; ctx.lineWidth = 1.5
ctx.beginPath()
for (let e = 0; e < 2; e++) {
const yy = y + e * h
ctx.moveTo(-12, yy); ctx.lineTo(gl, yy); ctx.moveTo(gr, yy); ctx.lineTo(VIEW_W + 12, yy)
}
ctx.stroke()
ctx.globalAlpha = 1
}
function warmArt(cur, built0, v, all) {
if (art.built() !== built0) return false
for (let k = 0; k < HAZARD_POOL; k++) {
const hz = cur.hazards[k]
if (!hz.active || (!all && hz.y + hz.h >= -12)) continue
if (hz.type === T_BRAMBLE) {
const seed = (hz.chunk % 97) + k
const gl = hz.x - hz.w / 2, gr = hz.x + hz.w / 2
if (gl + 12 >= 2) art.wall(Math.ceil(gl + 12), seed, true, v)
if (art.built() !== built0) return false
if (VIEW_W + 12 - gr >= 2) art.wall(Math.ceil(VIEW_W + 12 - gr), seed + 5, false, v)
} else if (hz.type === T_CURRENT) {
art.current(Math.round(hz.w), Math.round(hz.h), v)
if (art.built() !== built0) return false
const variant = hz.chunk % 3
art.flow(hz.sens, 0, hz.h, variant)
if (art.built() !== built0) return false
if (!v) art.flow(hz.sens, 1, hz.h, variant)
} else if (hz.type === T_PULSE) {
const seed = (hz.chunk % 97) + k
const gl = hz.x - hz.w / 2, gr = hz.x + hz.w / 2
if (gl + 12 >= 2) art.pulse(Math.ceil(gl + 12), seed, true, v)
if (art.built() !== built0) return false
if (VIEW_W + 12 - gr >= 2) art.pulse(Math.ceil(VIEW_W + 12 - gr), seed + 5, false, v)
} else if (hz.type === T_GATE) {
art.jaw(1, hz.chunk & 1, v)
if (art.built() !== built0) return false
art.jaw(-1, (hz.chunk + 1) & 1, v)
}
if (art.built() !== built0) return false
}
return true
}
function draw(prev, cur, alpha, fx) {
const built0 = art.built()
const time = fx.time || 0
lowFx = !!fx.lowFx
if (artLow === undefined) artLow = lowFx
reduced = fx.reduced !== undefined ? !!fx.reduced : domReduced()
const scroll = cur.scroll
const dist = cur.distance - (1 - alpha) * scroll
if (cur !== rsCur || cur.tick < rsTick) resetFx(cur)
rsCur = cur; rsTick = cur.tick
strikingNow = false
if (typeof fx.biome === 'number' && typeof curBiomeArg !== 'number') { curBiomeArg = 0; custom = null; bFrom = bTo = 0 }
if (typeof fx.biome === 'number') {
let want = clampBiome(fx.biome)
if (cur.act === 3 && want === NIGHT - 1) want = NIGHT
if (cur !== lastCur || cur.tick < lastTick) { bFrom = bTo = want }
else if (want !== bTo) { bFrom = bTo; bTo = want; bT0 = time }
lastCur = cur; lastTick = cur.tick
}
let bk = 1
if (bFrom !== bTo) {
bk = fadeProgress(time - bT0, reduced)
if (bk >= 1) bFrom = bTo
}
drawBackground(dist, time, lowFx, bk, !!fx.hideHud)
useLogical(fx.shakeX || 0, fx.shakeY || 0)
ctx.save()
ctx.beginPath()
ctx.rect(0, 0, VIEW_W, VIEW_H)
ctx.clip()
for (let k = 0; k < HAZARD_POOL; k++) {
const hz = cur.hazards[k]
if (!hz.active || hz.type !== T_CURRENT) continue
const y = hz.py + (hz.y - hz.py) * alpha
if (y > VIEW_H + 12 || y + hz.h < -12) continue
drawCurrent(hz, y, time)
}
for (let k = 0; k < HAZARD_POOL; k++) {
const hz = cur.hazards[k]
if (!hz.active || (hz.type !== T_BRAMBLE && hz.type !== T_GATE && hz.type !== T_PULSE)) continue
const y = hz.py + (hz.y - hz.py) * alpha
if (y > VIEW_H + 12 || y + hz.h < -12) continue
if (hz.type === T_GATE) { drawGate(hz, y, time); if (hz.gl) drawGauntRails(y, hz.h, hz.x - hz.o / 2, hz.x + hz.o / 2); continue }
if (hz.type === T_PULSE) { drawPulse(hz, y, k, time); if (hz.gl) drawGauntRails(y, hz.h, hz.x - hz.w / 2, hz.x + hz.w / 2); continue }
const seed = (hz.chunk % 97) + k
const gl = hz.x - hz.w / 2
const gr = hz.x + hz.w / 2
drawWallSide(-12, gl, y, seed, gl, true, time)
drawWallSide(gr, VIEW_W + 12, y, seed + 5, gr, false, time)
if (hz.gl) drawGauntRails(y, hz.h, gl, gr)
}
ctx.globalCompositeOperation = 'lighter'
for (let k = 0; k < STRAY_POOL; k++) {
const st = cur.strays[k]
if (!st.active) continue
const y = st.y - (1 - alpha) * scroll
if (y > VIEW_H + 20 || y < -20) continue
const pulse = 0.75 + 0.25 * Math.sin(time * 4 + k * 2.1)
let on = 1
if (!reduced) {
const ph = (time * 2.4 + k * 0.37) % 1
on = ph < 0.6 ? 1 : ph < 0.68 ? 1 - ((ph - 0.6) / 0.08) * 0.8 : ph < 0.92 ? 0.2 : 0.2 + ((ph - 0.92) / 0.08) * 0.8
}
const sz = reduced ? 40 : 36 + 6 * pulse
ctx.globalAlpha = 0.95 * on
ctx.drawImage(sprites.stray, st.x - sz / 2, y - sz / 2, sz, sz)
}
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
const items = cur.items
if (items) {
for (let k = 0; k < ITEM_POOL; k++) {
const it = items[k]
if (!it.active) continue
const y = it.y - (1 - alpha) * scroll
if (y > VIEW_H + 24 || y < -24) continue
drawItem(it, y, k, time)
}
}
const dead = fx.deathT || 0
const lit = dead >= 1 ? 0 : 1 - dead
let lx = cur.lantern.x, ly = cur.lantern.y
if (prev.lx !== undefined) {
lx = prev.lx + (cur.lantern.x - prev.lx) * alpha
ly = prev.ly + (cur.lantern.y - prev.ly) * alpha
}
if (fx.ghost && !lowFx && !reduced && !fx.hideHud) {
if (!ghostSprites) ghostSprites = createGhostSprites()
drawGhost(ctx, ghostSprites, fx.ghost, alpha, time)
}
ctx.globalCompositeOperation = 'lighter'
const fl = reduced ? 1 : flicker(time)
if (lit > 0) {
const hr = cur.lightR * 1.12 * (reduced ? 1 : 1 + 0.025 * Math.sin(time * 1.9))
ctx.globalAlpha = 0.62 * lit * lit * fl
ctx.drawImage(sprites.halo, lx - hr, ly - hr, hr * 2, hr * 2)
}
const havePrev = prev.fx !== undefined
const scanLoss = havePrev && !lowFx && cur.tick !== lossTick && cur.tick === (prev.tick === undefined ? -1 : prev.tick) + 1
if (cur.tick !== lossTick) lossTick = cur.tick
const wantShell = (cur.shield | 0) > 0
let sX = 0, sY = 0, sN = 0
for (let i = 0; i < SWARM_MAX; i++) {
if (!cur.alive[i]) {
if (scanLoss && prev.alive[i]) addPuff(prev.fx[i], prev.fy[i], time)
continue
}
let x = cur.fx[i], y = cur.fy[i]
if (havePrev && prev.alive[i]) {
x = prev.fx[i] + (x - prev.fx[i]) * alpha
y = prev.fy[i] + (y - prev.fy[i]) * alpha
}
sN++
if (wantShell) { sX += x; sY += y }
const fa = 0.82 + 0.18 * Math.sin(time * FF_SP[i] + FF_PH[i])
if (!lowFx && !reduced && havePrev && prev.alive[i]) {
let vx = cur.fx[i] - prev.fx[i], vy = cur.fy[i] - prev.fy[i]
const vv = vx * vx + vy * vy
if (vv > 0.04 && vv < 400) {
const k = vv > 2.25 ? 1.5 / Math.sqrt(vv) : 1
vx *= k; vy *= k
ctx.globalAlpha = 0.4 * fa
ctx.drawImage(sprites.trail, x - vx * 2 - 3.5, y - vy * 2 - 3.5, 7, 7)
ctx.globalAlpha = 0.22 * fa
ctx.drawImage(sprites.trail, x - vx * 4.5 - 2.5, y - vy * 4.5 - 2.5, 5, 5)
}
}
ctx.globalAlpha = fa
ctx.drawImage(sprites.fireflies[FF_HUE[i]][reduced ? 1 : WING_SEQ[(Math.floor(time * WING_HZ) + FF_WPH[i]) & 3]], x - 12, y - 12, 24, 24)
}
const shield = cur.shield | 0
if (shield > 0 && sN > 0 && lit > 0) {
shX = sX / sN; shY = sY / sN
shR = (SWARM_R_BASE + SWARM_R_PER * cur.count + 14) * (reduced ? 1 : 1 + 0.02 * Math.sin(time * 2.2))
shOn = true
drawShell(shX, shY, shR, shield, time)
} else {
if (shOn && shield === 0) { brkT = time; brkX = shX; brkY = shY; brkR = shR; brkAbs = (cur.iframes | 0) > 0 }
shOn = false
}
if (fx.breakAge !== undefined) { brkT = time - fx.breakAge; brkAbs = !!fx.breakAbs; brkX = lx; brkY = ly; brkR = SWARM_R_BASE + SWARM_R_PER * cur.count + 14 }
const ba = time - brkT
if (ba >= 0 && ba < BREAK_S) drawBreak(ba / BREAK_S)
ctx.globalCompositeOperation = 'lighter'
if (lit > 0) {
ctx.globalAlpha = 0.6 * lit * fl
ctx.drawImage(sprites.lanternGlow, lx - 24, ly - 24, 48, 48)
const sx = reduced ? 1 : 1 + 0.045 * Math.sin(time * 11.3 + 1.1), sy = reduced ? 1 : 1 + 0.07 * Math.sin(time * 9.7)
ctx.globalAlpha = lit
ctx.drawImage(sprites.lantern, lx - 17 * sx, ly - 17 * sy - 1, 34 * sx, 34 * sy)
ctx.globalCompositeOperation = 'source-over'
const cs = 32 * (1 + (reduced ? 0 : 0.025 * Math.sin(time * 3)))
ctx.globalAlpha = 0.92 * lit
ctx.save()
ctx.translate(lx, ly)
ctx.rotate(reduced ? 0.3 : time * 0.45)
ctx.drawImage(sprites.cage, -cs / 2, -cs / 2, cs, cs)
ctx.restore()
}
ctx.globalCompositeOperation = 'source-over'
for (let k = 0; k < HAZARD_POOL; k++) {
const hz = cur.hazards[k]
if (!hz.active) continue
if (hz.type === T_BAT) drawBat(hz, alpha, time)
else if (hz.type === T_MOTH) drawMoth(hz, alpha, time)
}
ctx.globalAlpha = 1
if (fx.echoAge !== undefined) { echoX = fx.echoX || 180; echoT = time - fx.echoAge; echoV = 1 }
for (let k = 0; k < HAZARD_POOL; k++) {
const hz = cur.hazards[k]
if (!hz.active || hz.type !== T_BOLT) continue
if (hz.st === 1) drawBoltWarn(hz, time)
else if (hz.st === 2) drawBoltStrike(hz, k, time, cur.over)
}
drawBoltEcho(time)
if (cur.windSt) drawWind(cur, time, lx, ly, SWARM_R_BASE + SWARM_R_PER * cur.count, sN > 0)
ctx.globalAlpha = 1
if (lit > 0 && cur.flareCd > 0) {
ctx.globalAlpha = 0.65 * lit
ctx.strokeStyle = pal.accent
ctx.lineWidth = 2.5
ctx.beginPath()
ctx.arc(lx, ly, 17, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - cur.flareCd / (cur.flareCdMax || FLARE_CD)))
ctx.stroke()
}
if (lit > 0 && shield > 0) {
ctx.globalAlpha = 0.55 * lit
ctx.strokeStyle = pal.text
ctx.lineWidth = shield < SHIELD_LOW ? 1.2 : 2
ctx.beginPath()
ctx.arc(lx, ly, 21, -Math.PI / 2, -Math.PI / 2 + TAU * e01(shield / ((cur.shieldsGained | 0) === 0 && cur.tick <= START_SHIELD ? START_SHIELD : SHIELD_TTL)))
ctx.stroke()
}
if (cur.flareT > 0) {
const p = Math.min(1, (FLARE_FX_TICKS - cur.flareT + alpha) / FLARE_FX_TICKS)
const e = 1 - (1 - p) * (1 - p)
const rr = 14 + (FLARE_R - 14) * e
ctx.globalCompositeOperation = 'lighter'
ctx.globalAlpha = (1 - p) * 0.35
ctx.fillStyle = pal.fireCore
ctx.beginPath(); ctx.arc(lx, ly, rr, 0, TAU); ctx.fill()
ctx.globalAlpha = 1 - p * p
ctx.strokeStyle = pal.fireCore
ctx.lineWidth = 4 - 2.5 * p
ctx.beginPath(); ctx.arc(lx, ly, rr, 0, TAU); ctx.stroke()
ctx.globalAlpha = (1 - p) * 0.8
ctx.strokeStyle = pal.accent
ctx.lineWidth = 1.5
ctx.beginPath(); ctx.arc(lx, ly, rr * 0.82, 0, TAU); ctx.stroke()
}
if (fx.near && fx.near.at > 0 && lit > 0) {
const na = time - fx.near.at
if (na >= 0 && na < NEAR_RING_S) drawNearRing(lx, ly, na)
}
if (fx.puffAge !== undefined) addPuff(lx - 20, ly - 30, time - fx.puffAge)
if (!lowFx) drawPuffs(time)
if (fx.particles) fx.particles.draw(ctx)
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
if (fx.debug) {
ctx.lineWidth = 1 / scale
ctx.strokeStyle = 'rgba(80,255,120,0.9)'
const sh = HITBOX_SHRINK
for (let k = 0; k < HAZARD_POOL; k++) {
const hz = cur.hazards[k]
if (!hz.active) continue
if (hz.type === T_BOLT) { if (hz.st) ctx.strokeRect(hz.x - BOLT_HW - FIREFLY_R, 0, 2 * (BOLT_HW + FIREFLY_R), VIEW_H); continue }
if (hz.type === T_BAT || hz.type === T_MOTH) {
if (hz.type === T_BAT && hz.st === 0) continue
const p = interp(hz, alpha)
ctx.beginPath(); ctx.arc(p.x, p.y, (hz.type === T_BAT ? BAT_R : MOTH_R) + FIREFLY_R, 0, TAU); ctx.stroke()
continue
}
const y = hz.py + (hz.y - hz.py) * alpha
if (hz.type === T_CURRENT) { ctx.strokeRect(hz.x - hz.w / 2, y, hz.w, hz.h); continue }
const yy = y + sh
const hh = hz.h - 2 * sh
const le = hz.x - hz.w / 2 - sh
const re = hz.x + hz.w / 2 + sh
ctx.strokeRect(-12, yy, le + 12, hh)
ctx.strokeRect(re, yy, VIEW_W + 12 - re, hh)
}
for (let i = 0; i < SWARM_MAX; i++) {
if (!cur.alive[i]) continue
ctx.beginPath(); ctx.arc(cur.fx[i], cur.fy[i], FIREFLY_R, 0, TAU); ctx.stroke()
}
ctx.strokeStyle = 'rgba(255,233,168,0.7)'
for (let k = 0; k < STRAY_POOL; k++) {
const st = cur.strays[k]
if (!st.active) continue
ctx.beginPath(); ctx.arc(st.x, st.y - (1 - alpha) * scroll, STRAY_R, 0, TAU); ctx.stroke()
}
ctx.fillStyle = 'rgba(80,255,120,0.95)'
ctx.font = '600 11px ui-monospace, Menlo, monospace'
ctx.textAlign = 'right'
ctx.fillText('vus R' + cur.seen[T_BRAMBLE] + ' C' + cur.seen[T_CURRENT] + ' B' + cur.seen[T_BAT] + ' P' + cur.seen[T_MOTH] + ' G' + cur.seen[T_GATE], VIEW_W - 8, 78)
ctx.textAlign = 'left'
ctx.setLineDash([4 / scale, 4 / scale])
ctx.strokeStyle = 'rgba(77,227,208,0.5)'
ctx.strokeRect(LANTERN_ZONE.x0, LANTERN_ZONE.y0, LANTERN_ZONE.x1 - LANTERN_ZONE.x0, LANTERN_ZONE.y1 - LANTERN_ZONE.y0)
ctx.setLineDash([])
}
ctx.restore()
useScreen()
ctx.fillStyle = 'rgba(5,6,16,0.18)'
if (ox > 0.5) {
ctx.fillRect(0, 0, ox, cssH)
ctx.fillRect(cssW - ox, 0, ox, cssH)
}
if (oy > 0.5) {
ctx.fillRect(ox, 0, cssW - 2 * ox, oy)
ctx.fillRect(ox, cssH - oy, cssW - 2 * ox, oy)
}
ctx.strokeStyle = 'rgba(154,163,199,0.22)'
ctx.lineWidth = 1
ctx.strokeRect(ox + 0.5, oy + 0.5, VIEW_W * scale - 1, VIEW_H * scale - 1)
ctx.fillStyle = vignette
ctx.fillRect(0, 0, cssW, cssH)
if (vigNow > 0.01) { ctx.globalAlpha = vigNow; ctx.fillStyle = vignette2; ctx.fillRect(0, 0, cssW, cssH); ctx.globalAlpha = 1 }
if (dead > 0 && cur.over) drawDeathAccent(cur.cause, dead)
useLogical()
ctx.save()
ctx.beginPath(); ctx.rect(0, 0, VIEW_W, VIEW_H); ctx.clip()
trackGauntlet(cur, time, fx)
if (!fx.hideHud) { drawGauntlet(cur, time); drawHud(ctx, cur, fx, pal, { reduced, glow: sprites.halo }) }
ctx.restore()
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
if (artLow === lowFx) warmArt(cur, built0, lowFx, false)
else if (warmArt(cur, built0, artLow, false) && warmArt(cur, built0, lowFx, true)) artLow = lowFx
}
backdropOf(bTo)
resize()
return { resize, draw, setPalette, setSkins, setBiome, prewarm, toLogical, get biomeNow() { return bTo }, get fadeFrom() { return bFrom }, artStats: () => art.stats(), get scale() { return scale }, get dpr() { return dpr } }
}
