export function hashSeed(str) {
let h = 1779033703 ^ str.length
for (let i = 0; i < str.length; i++) {
h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
h = (h << 13) | (h >>> 19)
}
const out = [0, 0, 0, 0]
for (let k = 0; k < 4; k++) {
h = Math.imul(h ^ (h >>> 16), 2246822507)
h = Math.imul(h ^ (h >>> 13), 3266489909)
h ^= h >>> 16
out[k] = h >>> 0
}
return out
}
export function createRng(words) {
let a = words[0] | 0
let b = words[1] | 0
let c = words[2] | 0
let d = words[3] | 0
function u32() {
const t = (((a + b) | 0) + d) | 0
d = (d + 1) | 0
a = b ^ (b >>> 9)
b = (c + (c << 3)) | 0
c = (c << 21) | (c >>> 11)
c = (c + t) | 0
return t >>> 0
}
const rng = {
u32,
float() { return u32() / 4294967296 },
int(n) { return Math.floor((u32() / 4294967296) * n) },
range(lo, hi) { return lo + (u32() / 4294967296) * (hi - lo) },
chance(p) { return u32() / 4294967296 < p },
}
return rng
}
export function createLevelRng(seedKey) {
const rng = createRng(hashSeed(seedKey + '|level'))
for (let i = 0; i < 12; i++) rng.u32()
return rng
}
export function createContentRng(seedKey) {
const rng = createRng(hashSeed(seedKey + '|content'))
for (let i = 0; i < 12; i++) rng.u32()
return rng
}
export function createWindRng(seedKey) {
const rng = createRng(hashSeed(seedKey + '|wind'))
for (let i = 0; i < 12; i++) rng.u32()
return rng
}
export function createGauntletRng(seedKey) {
const rng = createRng(hashSeed(seedKey + '|gauntlet'))
for (let i = 0; i < 12; i++) rng.u32()
return rng
}
