export const HINT_FIRST_MS = 6000
export const HINT_KINDS = ['touch', 'mouse', 'keys']
export function shouldShowFirstHint(sv, { autoplay = false, warmup = false } = {}) {
if (autoplay || warmup || !sv || typeof sv !== 'object') return false
const runs = sv.stats && Number.isFinite(sv.stats.runs) ? sv.stats.runs : 0
const seen = !!(sv.seen && sv.seen.hint)
return runs === 0 && !seen
}
export function hintKind({ coarse = false, last = '' } = {}) {
if (HINT_KINDS.includes(last)) return last
return coarse ? 'touch' : 'mouse'
}
export function hintKey(kind) { return 'hint.first.' + (HINT_KINDS.includes(kind) ? kind : 'mouse') }
export function kindOfPointer(pointerType) { return pointerType === 'mouse' ? 'mouse' : pointerType === 'touch' || pointerType === 'pen' ? 'touch' : '' }
const KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'])
export function kindOfKey(code) { return KEYS.has(code) ? 'keys' : '' }
