import {
SWARM_R_BASE, SWARM_R_PER, HAZARD_POOL, T_BRAMBLE, T_GATE, T_BAT, T_MOTH, T_BOLT, HITBOX_SHRINK, LANTERN_START, FLARE_R,
FIREFLY_R, BOLT_HW, BOLT_WARN_T, FOLLOW_K, LANTERN_ZONE,
} from './params.mjs'
import { sinT } from './trig.mjs'
import { BAT_CHASE, BOLT_WARNING, BOLT_STRIKE } from './hazards.mjs'
const NEAR_MARGIN = 8
const BOT_BOLT_LEAD = 34
const BOLT_MARGIN = 14
export function botInput(state, input, skill = 1, risk = 0) {
const rs = SWARM_R_BASE + SWARM_R_PER * state.count
const bottomLimit = state.lantern.y + rs + 8
let best = null
let bolt = null
let flare = false
const fr2 = FLARE_R * FLARE_R
for (let k = 0; k < HAZARD_POOL; k++) {
const h = state.hazards[k]
if (!h.active) continue
if (h.type === T_BAT || h.type === T_MOTH) {
if (h.type === T_BAT && h.st !== BAT_CHASE) continue
const dx = h.x - state.lantern.x
const dy = h.y - state.lantern.y
if (dx * dx + dy * dy < fr2) flare = true
continue
}
if (h.type === T_BOLT) {
if (h.st === BOLT_STRIKE || (h.st === BOLT_WARNING && h.c >= BOLT_WARN_T - BOT_BOLT_LEAD)) bolt = h
continue
}
if ((h.type !== T_BRAMBLE && h.type !== T_GATE) || h.y > bottomLimit) continue
if (best === null || h.y > best.y) best = h
}
let tx = 180
if (best !== null) {
tx = best.x
if (risk > 0 && best.type === T_BRAMBLE) {
const halfOpen = best.w / 2 + HITBOX_SHRINK
const room = halfOpen - rs - NEAR_MARGIN
if (room > 0) tx += (state.lantern.x >= best.x ? 1 : -1) * room * risk
}
}
if (bolt !== null) {
const clear = BOLT_HW + FIREFLY_R + rs + BOLT_MARGIN
const d = state.lantern.x + state.windF / FOLLOW_K - bolt.x
if (d < clear && d > -clear) {
let side = d > 0 ? 1 : d < 0 ? -1 : (bolt.x < 180 ? 1 : -1)
let t = bolt.x + side * clear
if (t < LANTERN_ZONE.x0 || t > LANTERN_ZONE.x1) { side = -side; t = bolt.x + side * clear }
tx = t
} else if ((tx - bolt.x) * d <= 0 || (tx - bolt.x < clear && tx - bolt.x > -clear)) {
tx = bolt.x + (d > 0 ? clear : -clear)
}
}
tx -= state.windF / FOLLOW_K
if (skill < 1) tx += (1 - skill) * 70 * sinT((state.tick * 3) & 255)
input.hasTarget = true
input.tx = tx
input.ty = LANTERN_START.y
input.dx = 0
input.dy = 0
input.flare = flare
return input
}
