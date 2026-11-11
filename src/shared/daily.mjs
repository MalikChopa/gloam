import { RULES_VERSION } from '../sim/params.mjs'
export const NIGHT_EPOCH = '2026-11-06'
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const MS_DAY = 86400000
export function dayKey(date = new Date()) { return date.toISOString().slice(0, 10) }
export function isDayKey(key) {
if (typeof key !== 'string' || !DAY_RE.test(key)) return false
const d = new Date(key + 'T00:00:00Z')
return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === key
}
export function addDays(key, n) {
if (!isDayKey(key) || !Number.isInteger(n)) return key
return new Date(Date.parse(key + 'T00:00:00Z') + n * MS_DAY).toISOString().slice(0, 10)
}
export function daysBetween(a, b) {
return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / MS_DAY)
}
export function nightNumber(key) {
const n = daysBetween(NIGHT_EPOCH, key) + 1
return n < 1 ? 1 : n
}
export function dailySeedKey(key) { return 'GLOAM|' + RULES_VERSION + '|' + key }
export function freeSeedKey(u32) { return (u32 % 2176782336).toString(36).padStart(6, '0') }
export function freeSeedFull(id) { return 'GLOAM|' + RULES_VERSION + '|free|' + id }
