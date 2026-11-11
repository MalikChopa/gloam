import { createRun, prepareInput, step } from '../sim/index.mjs'
import { decode } from '../sim/replay.mjs'
export const GHOST_FADE_TICKS = 50
export function createGhostRun(entry, mode = 'daily') {
let recs, state
try {
recs = decode(entry.log, entry.ticks)
state = createRun({ seedKey: entry.key, mode, rules: entry.rules })
} catch {
return null
}
const input = { hasTarget: false, tx: 0, ty: 0, dx: 0, dy: 0, flare: false }
let i = 0
let since = 0
const g = {
state,
score: entry.score,
px: state.lantern.x, py: state.lantern.y, x: state.lantern.x, y: state.lantern.y,
pcx: 0, pcy: 0, cx: 0, cy: 0,
alive: 0,
ended: false,
fade: 1,
done: false,
}
function centre() {
let sx = 0, sy = 0, n = 0
for (let k = 0; k < state.alive.length; k++) if (state.alive[k]) { sx += state.fx[k]; sy += state.fy[k]; n++ }
g.alive = n
if (n > 0) { g.cx = sx / n; g.cy = sy / n } else { g.cx = state.lantern.x; g.cy = state.lantern.y }
}
centre(); g.pcx = g.cx; g.pcy = g.cy
g.advance = function advance() {
if (g.done) return
if (g.ended) {
g.px = g.x; g.py = g.y; g.pcx = g.cx; g.pcy = g.cy
since++
g.fade = since >= GHOST_FADE_TICKS ? 0 : 1 - since / GHOST_FADE_TICKS
if (g.fade <= 0) g.done = true
return
}
g.px = g.x; g.py = g.y; g.pcx = g.cx; g.pcy = g.cy
input.flare = false
if (i < recs.length && recs[i].tick === state.tick) {
const r = recs[i++]
if (r.kind === 1) {
input.hasTarget = true; input.tx = r.a * 2; input.ty = r.b * 2; input.dx = 0; input.dy = 0
} else if (r.kind === 2) {
input.hasTarget = false; input.tx = 0; input.ty = 0
input.dx = (r.a & 2 ? 1 : 0) - (r.a & 1 ? 1 : 0)
input.dy = (r.a & 8 ? 1 : 0) - (r.a & 4 ? 1 : 0)
}
input.flare = r.flare
}
prepareInput(input)
step(state, input)
g.x = state.lantern.x; g.y = state.lantern.y
centre()
if (state.over || state.tick >= entry.ticks) g.ended = true
}
return g
}
export function ghostView(g, out) {
if (!g || g.done) return null
out.px = g.px; out.py = g.py; out.x = g.x; out.y = g.y
out.pcx = g.pcx; out.pcy = g.pcy; out.cx = g.cx; out.cy = g.cy
out.alive = g.alive; out.fade = g.fade; out.ended = g.ended
return out
}
