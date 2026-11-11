import { EVENTS_MAX, EV, COMBO_CAP, NEAR_RAW, SHIELD_IFRAMES } from './params.mjs'
export function pushEvent(s, type, x, y, a) {
if (s.eventCount >= EVENTS_MAX) { s.eventsDropped++; return }
const e = s.events[s.eventCount++]
e.type = type
e.x = x
e.y = y
e.a = a
}
export function nearMiss(s, x, y) {
s.raw += NEAR_RAW * (2 + (s.combo < COMBO_CAP ? s.combo : COMBO_CAP))
s.combo++
s.nearMisses++
pushEvent(s, EV.NEAR_MISS, x, y, s.combo)
}
export function loseFirefly(s, i, killer) {
if (s.iframes > 0) return false
if (s.shield > 0) {
s.shield = 0
s.iframes = SHIELD_IFRAMES
s.shieldsUsed++
pushEvent(s, EV.SHIELD_BREAK, s.fx[i], s.fy[i], killer)
return false
}
const px = s.fx[i]
const py = s.fy[i]
s.alive[i] = 0
s.count--
s.lost++
s.combo = 0
s.killer = killer
pushEvent(s, EV.LOST, px, py, killer)
return true
}
