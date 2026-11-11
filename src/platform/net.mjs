import { MAX_BODY_BYTES } from '../sim/params.mjs'
export const NET_TIMEOUT_MS = 4000
export function runSelfCheck({ runGolden, expected }) {
try { return runGolden() === expected } catch { return false }
}
const OFF_NET = () => ({ ok: false, reason: 'offline', cause: 'network' })
const OFF_SRV = () => ({ ok: false, reason: 'offline', cause: 'server' })
export function createNet({ fetch: fetchFn = globalThis.fetch, base = '', timeoutMs = NET_TIMEOUT_MS, enabled = true } = {}) {
let selfOk = null
async function call(path, init) {
if (!enabled || typeof fetchFn !== 'function') return OFF_NET()
const ctl = typeof AbortController === 'function' ? new AbortController() : null
let timer = null
const timeout = new Promise((resolve) => { timer = setTimeout(() => { if (ctl) ctl.abort(); resolve(OFF_NET()) }, timeoutMs) })
const work = (async () => {
let res
try { res = await fetchFn(base + path, { ...init, signal: ctl ? ctl.signal : undefined, credentials: 'omit', cache: 'no-store' }) } catch { return OFF_NET() }
try {
if (!res || typeof res.status !== 'number') return OFF_SRV()
if (res.status === 200) {
let data = null
try { data = await res.json() } catch {   }
return data && typeof data === 'object' ? { ok: true, data } : OFF_SRV()
}
let err = ''
try { const j = await res.json(); err = j && typeof j.error === 'string' ? j.error : '' } catch {   }
if (res.status === 409 && err === 'rules') return { ok: false, reason: 'rules' }
if (res.status === 409 && err === 'day') return { ok: false, reason: 'day' }
if (res.status === 429) return { ok: false, reason: 'rate' }
if (res.status === 503) return { ok: false, reason: 'busy' }
if (res.status >= 400 && res.status < 500) return { ok: false, reason: 'rejected' }
return OFF_SRV()
} catch { return OFF_SRV() }
})()
const r = await Promise.race([work, timeout])
clearTimeout(timer)
return r
}
return {
setSelfCheck(ok) { selfOk = !!ok },
get selfOk() { return selfOk },
get enabled() { return enabled },
fetchDaily() { return call('/api/daily', { method: 'GET' }) },
fetchScores(day) { return call('/api/scores?day=' + encodeURIComponent(day), { method: 'GET' }) },
async submitScore(payload) {
if (selfOk === false) return { ok: false, reason: 'selfcheck' }
let body
try { body = JSON.stringify(payload) } catch { return OFF_SRV() }
if (body.length > MAX_BODY_BYTES) return OFF_SRV()
return call('/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
},
}
}
