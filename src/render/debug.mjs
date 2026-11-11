export function createDebug(getInfo) {
const el = document.createElement('pre')
el.id = 'debug'
el.setAttribute('aria-hidden', 'true')
document.body.appendChild(el)
let nextAt = 0
function f(v, d = 1) { return typeof v === 'number' && isFinite(v) ? v.toFixed(d) : '-' }
return {
update(now) {
if (now < nextAt) return
nextAt = now + 250
const i = getInfo()
el.textContent =
'fps ' + f(i.fps) + ' (10 s ' + f(i.fps10) + ')  tps ' + f(i.tps) + '\n' +
'image p95 ' + f(i.frameMsP95) + ' ms\n' +
'tick ' + i.tick + '  D ' + f(i.difficulty, 2) + '  dist ' + f(i.distance, 0) + '\n' +
'essaim ' + i.count + '  lumière ' + i.lightR + '  score ' + i.score + '\n' +
'combo ' + i.combo + '  justesses ' + i.nearMisses + '  éclats ' + i.flares + '  égarées ' + i.picked + '\n' +
'particules ' + i.particles + ' (max ' + i.particlesMax + ', budget ' + f(i.budget, 1) + ')  tremblement ' + f(i.shakePx, 1) + ' px  événements perdus ' + i.eventsDropped + '\n' +
(i.invincible ? 'INVINCIBLE\n' : '') +
'graine ' + i.seed + '\n' +
'phase ' + i.phase + (i.paused ? ' (pause)' : '') + '\n' +
'retryReadyMs ' + f(i.retryReadyMs, 0) + '  restartMs ' + f(i.restartMs, 0) + '\n' +
'deathToPlayableMs ' + f(i.deathToPlayableMs, 0) + '  morts [' + i.deaths.join(', ') + ']'
},
dispose() { el.remove() },
}
}
