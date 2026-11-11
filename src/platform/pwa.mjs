export function shouldRegister(protocol, swFlag) { return protocol === 'https:' || !!swFlag }
export async function registerSW({ nav = globalThis.navigator, protocol, swFlag, onUpdate, url = 'sw.js' }) {
if (!shouldRegister(protocol, swFlag) || !nav || !nav.serviceWorker) return null
const hadController = !!nav.serviceWorker.controller
nav.serviceWorker.addEventListener('controllerchange', () => { if (hadController && onUpdate) onUpdate() })
try { return await nav.serviceWorker.register(url) } catch { return null }
}
