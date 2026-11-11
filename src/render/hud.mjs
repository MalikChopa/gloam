import { SWARM_MAX, COMBO_CAP, FLARE_CD } from '../sim/params.mjs'
import { rgba } from './palette.mjs'
import { t, getLang } from '../platform/i18n.mjs'
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif'
const NEAR_MS = 900
const TAU = Math.PI * 2
const HUD_UNDER = 'rgba(5,6,16,0.7)'
const FONT_SCORE = '800 26px ' + FONT, FONT_MULT = '700 15px ' + FONT, FONT_NEAR = '800 24px ' + FONT
const MULT = [[], []]
const MULT_MAX = ['', '']
export function multText(combo) {
const lang = getLang() === 'fr' ? 0 : 1
const c = combo > COMBO_CAP ? COMBO_CAP : combo
const ok = Number.isInteger(c) && c >= 0
let out = ok ? MULT[lang][c] : undefined
if (out !== undefined) return out
const m = 1 + c / 2
out = 'x' + (lang === 0 ? String(m).replace('.', ',') : String(m))
if (ok) MULT[lang][c] = out
return out
}
function multLabel(combo, atCap) {
if (!atCap) return multText(combo)
const lang = getLang() === 'fr' ? 0 : 1
return MULT_MAX[lang] || (MULT_MAX[lang] = multText(COMBO_CAP) + ' MAX')
}
const haloCols = new WeakMap()
const scoreMemo = { n: -1, s: '' }
const nearMemo = { combo: -1, lang: '', s: '' }
const POP = { k: 0, up: true }
function glowText(ctx, text, x, y, col, blur) {
ctx.shadowColor = col
ctx.shadowBlur = blur
ctx.fillText(text, x, y)
ctx.shadowBlur = 0
}
export const POP_MS = 240
const popState = new WeakMap()
export function resetHud(ctx) { popState.delete(ctx) }
function popOf(ctx, mult, fx) {
const time = fx.time || 0
if (fx.popAge !== undefined) {
const k = 1 - fx.popAge / POP_MS
if (!(fx.popAge >= 0 && fx.popAge < POP_MS)) return null
POP.k = k * k; POP.up = true
return POP
}
if (fx.noPop) return null
let st = popState.get(ctx)
if (!st) { st = { mult, at: -1e9 }; popState.set(ctx, st) }
if (st.mult !== mult) { st.up = mult > st.mult; st.mult = mult; st.at = time }
const age = (time - st.at) * 1000
if (age < 0 || age >= POP_MS) { if (age < 0) st.at = -1e9; return null }
const k = 1 - age / POP_MS
POP.k = k * k; POP.up = st.up
return POP
}
export function drawHud(ctx, cur, fx, pal, opts) {
const reduced = !!(opts && opts.reduced)
ctx.globalAlpha = 1
ctx.textBaseline = 'alphabetic'
ctx.textAlign = 'left'
ctx.font = FONT_SCORE
ctx.fillStyle = pal.text
if (scoreMemo.n !== cur.score) { scoreMemo.n = cur.score; scoreMemo.s = String(cur.score) }
const sc = scoreMemo.s
let halo = haloCols.get(pal)
if (halo === undefined) { halo = { src: '', col: '' }; haloCols.set(pal, halo) }
if (halo.src !== pal.fireHalo) { halo.src = pal.fireHalo; halo.col = rgba(pal.fireHalo, 0.5) }
ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = HUD_UNDER; ctx.strokeText(sc, 14, 36)
glowText(ctx, sc, 14, 36, halo.col, 8)
const sw = ctx.measureText(sc).width
ctx.font = FONT_MULT
const txt = pal.accentText || pal.accent
ctx.fillStyle = txt
const atCap = cur.combo >= COMBO_CAP
const pop = popOf(ctx, Math.min(cur.combo, COMBO_CAP), fx)
const mt = multLabel(cur.combo, atCap)
if (pop) {
ctx.save()
ctx.translate(14 + sw + 8, 36)
const ps = reduced ? 1 : pop.up ? 1 + 0.3 * pop.k : 1 - 0.1 * pop.k
ctx.scale(ps, ps)
ctx.strokeText(mt, 0, 0)
ctx.fillStyle = pop.up ? pal.fireCore : txt
glowText(ctx, mt, 0, 0, pop.up ? pal.fireHalo : pal.accent, 6 + 10 * pop.k)
ctx.restore()
} else { ctx.strokeText(mt, 14 + sw + 8, 36); ctx.fillText(mt, 14 + sw + 8, 36) }
ctx.fillStyle = 'rgba(154,163,199,0.25)'
ctx.fillRect(14, 45, 84, 4)
ctx.fillStyle = pal.accent
ctx.fillRect(14, 45, 84 * (cur.count / SWARM_MAX), 4)
if (!fx.coarse) {
const cx = 332, cy = 34, r = 13
const ready = cur.flareCd <= 0
const frac = 1 - cur.flareCd / (cur.flareCdMax || FLARE_CD)
if (ready && opts && opts.glow) {
ctx.globalCompositeOperation = 'lighter'
ctx.globalAlpha = reduced ? 0.4 : 0.32 + 0.12 * Math.sin(fx.time * 4)
ctx.drawImage(opts.glow, cx - 30, cy - 30, 60, 60)
ctx.globalAlpha = 1
ctx.globalCompositeOperation = 'source-over'
}
ctx.lineWidth = 3
ctx.strokeStyle = 'rgba(154,163,199,0.28)'
ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke()
ctx.strokeStyle = ready ? pal.fireCore : pal.accent
ctx.globalAlpha = ready ? 0.8 + 0.2 * Math.sin(fx.time * 6) : 0.9
ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke()
ctx.globalAlpha = 1
ctx.fillStyle = ready ? pal.fireCore : 'rgba(154,163,199,0.5)'
ctx.beginPath()
ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 2, cy - 2); ctx.lineTo(cx + 6, cy); ctx.lineTo(cx + 2, cy + 2)
ctx.lineTo(cx, cy + 6); ctx.lineTo(cx - 2, cy + 2); ctx.lineTo(cx - 6, cy); ctx.lineTo(cx - 2, cy - 2)
ctx.closePath(); ctx.fill()
}
const near = fx.near
if (near && near.at > 0) {
const age = (fx.time - near.at) * 1000
if (age >= 0 && age < NEAR_MS) {
const pop = age < 130 ? 1 + 0.25 * (1 - age / 130) : 1
const fade = age > NEAR_MS - 300 ? (NEAR_MS - age) / 300 : 1
const rise = (age / NEAR_MS) * 14
ctx.save()
ctx.translate(180, 186 - rise)
ctx.scale(pop, pop)
ctx.globalAlpha = fade
ctx.textAlign = 'center'
ctx.font = FONT_NEAR
ctx.fillStyle = txt
const lang = getLang()
if (nearMemo.combo !== near.combo || nearMemo.lang !== lang) { nearMemo.combo = near.combo; nearMemo.lang = lang; nearMemo.s = 'x' + near.combo + ' ' + t('hud.near') }
ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = HUD_UNDER; ctx.strokeText(nearMemo.s, 0, 0)
glowText(ctx, nearMemo.s, 0, 0, pal.accent, 14)
ctx.restore()
}
}
}
