export function luminance(hex) {
const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
if (!m) throw new Error('couleur invalide : ' + hex)
const c = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255)
.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
export function contrast(a, b) {
const la = luminance(a), lb = luminance(b)
const hi = Math.max(la, lb), lo = Math.min(la, lb)
return (hi + 0.05) / (lo + 0.05)
}
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], select, textarea, [tabindex]:not([tabindex="-1"])'
export function focusables(container) {
return Array.from(container.querySelectorAll(FOCUSABLE)).filter((e) => !e.hidden && !e.closest('[hidden]'))
}
export function trapFocus(getContainer, doc = document) {
const onKey = (e) => {
if (e.key !== 'Tab' || e.ctrlKey || e.altKey || e.metaKey) return
const box = getContainer()
if (!box) return
const list = focusables(box)
if (list.length === 0) { e.preventDefault(); return }
const a = doc.activeElement
const i = list.indexOf(a)
if (i < 0) { e.preventDefault(); list[e.shiftKey ? list.length - 1 : 0].focus(); return }
if (e.shiftKey && i === 0) { e.preventDefault(); list[list.length - 1].focus() }
else if (!e.shiftKey && i === list.length - 1) { e.preventDefault(); list[0].focus() }
}
doc.addEventListener('keydown', onKey, true)
return () => doc.removeEventListener('keydown', onKey, true)
}
export function createA11y({ doc = document, win = window } = {}) {
const live = doc.createElement('div')
live.id = 'a11y-live'
live.className = 'sr-only'
live.setAttribute('aria-live', 'polite')
live.setAttribute('aria-atomic', 'true')
doc.body.appendChild(live)
const mq = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null
const listeners = []
if (mq && mq.addEventListener) mq.addEventListener('change', () => { for (const f of listeners) f() })
let timer = null
return {
announce(text) {
live.textContent = ''
clearTimeout(timer)
timer = setTimeout(() => { live.textContent = text }, 40)
},
get prefersReducedMotion() { return !!(mq && mq.matches) },
onReducedMotionChange(fn) { listeners.push(fn) },
trapFocus: (getContainer) => trapFocus(getContainer, doc),
live,
}
}
