const SCORE8K_MIN = 4000
const DEEPNIGHT_TICKS = 19800
const COCOONS_MIN = 5
const BOLTS_MIN = 20
const GAUNT_CLEAN_MIN = 1
export const ACHIEVEMENTS = [
{ id: 'first', test: (p) => p.runs >= 1 },
{ id: 'regular', test: (p) => p.runs >= 25, skin: { kind: 'lantern', id: 'moss' } },
{ id: 'veteran', test: (p) => p.runs >= 100, skin: { kind: 'fireflies', id: 'pearl' } },
{ id: 'score1k', test: (p) => p.bestScore >= 1000 },
{ id: 'score3k', test: (p) => p.bestScore >= 3000 },
{ id: 'score8k', test: (p) => p.bestScore >= SCORE8K_MIN, skin: { kind: 'fireflies', id: 'mosaic' } },
{ id: 'near50', test: (p) => p.near >= 50 },
{ id: 'combo10', test: (p) => p.bestCombo >= 10 },
{ id: 'marsh', test: (p) => p.bestBiome >= 1, skin: { kind: 'fireflies', id: 'lime' } },
{ id: 'peaks', test: (p) => p.bestBiome >= 2, skin: { kind: 'lantern', id: 'snow' } },
{ id: 'streak3', test: (p) => p.bestStreak >= 3 },
{ id: 'streak7', test: (p) => p.bestStreak >= 7 },
{ id: 'rescuer', test: (p) => p.picked >= 30 },
{ id: 'bats', test: (p) => p.batDodges >= 10 },
{ id: 'calm', test: (p, run) => !!run && run.flares === 0 && run.ticks >= 3600 },
{ id: 'marathon', test: (p) => p.bestTicks >= 10800 },
{ id: 'deepnight', test: (p) => p.bestTicks >= DEEPNIGHT_TICKS },
{ id: 'cocoons', test: (p) => p.cocoons >= COCOONS_MIN },
{ id: 'bolts', test: (p) => p.bolts >= BOLTS_MIN },
{ id: 'gauntlet', test: (p) => p.gauntsClean >= GAUNT_CLEAN_MIN },
]
export const ACH_IDS = ACHIEVEMENTS.map((a) => a.id)
export const ACH_MAX = ACHIEVEMENTS.length
export function achievementById(id) { return ACHIEVEMENTS.find((a) => a.id === id) || null }
export function progressOf(sv) {
const st = (sv && sv.stats) || {}
const num = (x) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : 0)
return {
runs: num(st.runs), bestScore: num(st.bestScore), bestCombo: num(st.bestCombo), bestTicks: num(st.bestTicks), bestDist: num(st.bestDist),
near: num(st.near), picked: num(st.picked), batDodges: num(st.batDodges), flares: num(st.flares), bestBiome: num(st.bestBiome),
bestStreak: num(sv && sv.streak && sv.streak.best), cocoons: num(st.cocoons), embers: num(st.embers), bolts: num(st.bolts), gaunts: num(st.gaunts), gauntsClean: num(st.gauntsClean), ach: Array.isArray(sv && sv.ach) ? sv.ach : [],
}
}
export function evaluate(prog, run = null) {
const have = new Set(prog.ach || [])
const out = []
for (const a of ACHIEVEMENTS) if (!have.has(a.id) && a.test(prog, run)) out.push(a.id)
return out
}
