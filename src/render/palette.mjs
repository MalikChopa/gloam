export const PALETTE = {
nightTop: '#0b1020',
nightBottom: '#1a1040',
fireCore: '#ffe9a8',
fireHalo: '#ffc861',
lanternCore: '#fff6dc',
lanternRing: '#4de3d0',
danger: '#ff4d8d',
bramble: '#3b1d5c',
brambleDark: '#1a0b2e',
current: '#6b5bd6',
moth: '#c9a0ff',
text: '#e9ecff',
textDim: '#9aa3c7',
accent: '#4de3d0',
record: '#ffe9a8',
}
export const PALETTE_CB = {
...PALETTE,
fireCore: '#F0E442',
fireHalo: '#FFD27A',
lanternCore: '#ffffff',
lanternRing: '#56B4E9',
danger: '#D55E00',
bramble: '#00203a',
brambleDark: '#00152a',
current: '#5B4B9A',
moth: '#CC79A7',
accent: '#009E73',
accentText: '#66c5ab',
record: '#F0E442',
dashed: true,
}
export function rgba(hex, a) {
const n = parseInt(hex.slice(1), 16)
return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'
}
