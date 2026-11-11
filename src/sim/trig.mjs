export const TRIG_N = 256
const PI = 3.141592653589793
function taylorSin(x) {
const x2 = x * x
return x * (1 - (x2 / 6) * (1 - (x2 / 20) * (1 - (x2 / 42) * (1 - x2 / 72))))
}
const SIN = new Float64Array(TRIG_N)
;(function build() {
for (let i = 0; i < TRIG_N; i++) {
let x = (i * 2 * PI) / TRIG_N
if (x > PI) x -= 2 * PI
if (x > PI / 2) x = PI - x
else if (x < -PI / 2) x = -PI - x
SIN[i] = taylorSin(x)
}
})()
export function sinT(i) { return SIN[i & 255] }
export function cosT(i) { return SIN[(i + 64) & 255] }
