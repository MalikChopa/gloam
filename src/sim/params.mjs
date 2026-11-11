export const RULES_VERSION = 3
export const VIEW_W = 360
export const VIEW_H = 640
export const LANTERN_ZONE = { x0: 16, x1: 344, y0: 260, y1: 600 }
export const LANTERN_START = { x: 180, y: 480 }
export const MAX_TICKS = 21600
export const MAX_LOG_CHARS = 200000
export const MAX_BODY_BYTES = 262144
export const LANTERN_V = 8
export const LANTERN_KEY_ACC = 1.2
export const LANTERN_KEY_V = 6
export const LANTERN_KEY_FRICTION = 0.75
export const TOUCH_OFFSET_Y = 56
export const INPUT_QUANT = 2
export const SWARM_START = 24
export const SWARM_MAX = 40
export const FIREFLY_R = 3
export const SWARM_R_BASE = 12
export const SWARM_R_PER = 0.6
export const SWARM_R_MIN = 8
export const FOLLOW_K = 0.12
export const DAMPING = 0.70
export const LEASH_R = 20
export const LEASH_K = 0.30
export const SEP_R = 7
export const SEP_K = 0.6
export const FIREFLY_VMAX = 12
export const SWARM_W_MAX = 80
export const OVERSHOOT_MAX = 8
export const SETTLE_TICKS = 15
export function SWARM_W(n) { return 2 * (SWARM_R_BASE + SWARM_R_PER * n) + 2 * FIREFLY_R }
export const RAMP_TICKS = 5400
export const SCROLL_V0 = 1.8
export const SCROLL_V1 = 3.4
export const SCROLL_OVERTIME_STEP = 0.2
export const SCROLL_OVERTIME_TICKS = 1800
export const SCROLL_VMAX = 4.2
export const FIRST_CHUNK_Y = -30
export const SPAWN_Y = -40
export const DIFFICULTY_STEP = 1800
export const REMOVE_Y = 660
export const ACT_TICKS = [0, 4050, 9000, 16200]
export const ACT_IDS = ['lisiere', 'marais', 'cimes', 'nuit']
export function actAt(tick) {
let a = 0
for (let i = 1; i < ACT_TICKS.length; i++) if (tick >= ACT_TICKS[i]) a = i
return a
}
export const LATE_T0 = 16200
export const LATE_LEN = 5400
export function lateAt(tick) {
if (tick <= LATE_T0) return 0
const l = (tick - LATE_T0) / LATE_LEN
return l < 1 ? l : 1
}
export const SCROLL_LATE = 1.0
export const GAP_LATE_CUT = 20
export function difficultyAt(tick) {
const d = tick / RAMP_TICKS
return d < 1 ? d : 1
}
export function scrollAt(tick) {
if (tick <= RAMP_TICKS) return SCROLL_V0 + (SCROLL_V1 - SCROLL_V0) * (tick / RAMP_TICKS)
const v = SCROLL_V1 + SCROLL_OVERTIME_STEP * ((tick - RAMP_TICKS) / SCROLL_OVERTIME_TICKS)
if (v < SCROLL_VMAX) return v
return SCROLL_VMAX + SCROLL_LATE * lateAt(tick)
}
export function CHUNK_GAP(D) { return 300 - 120 * D }
export function chunkGapAt(tick) { return CHUNK_GAP(difficultyAt(tick)) - GAP_LATE_CUT * lateAt(tick) }
export const HAZARD_POOL = 24
export const STRAY_POOL = 16
export const HAZARD_DESPAWN = 900
export const EVENTS_MAX = 64
export const T_BRAMBLE = 1
export const T_CURRENT = 2
export const T_BAT = 3
export const T_MOTH = 4
export const T_GATE = 5
export const T_TIME = 6
export const T_PULSE = 7
export const T_BOLT = 8
export const T_COCOON = 9
export const T_EMBER = 10
export const T_COUNT = 11
export const TYPE_NAME = ['none', 'BRAMBLE', 'CURRENT', 'BAT', 'MOTH', 'GATE', 'TIME', 'PULSE', 'BOLT', 'COCOON', 'EMBER']
export const CAUSE_NAME = ['', 'bramble', 'current', 'bat', 'moth', 'gate', 'time', 'pulse', 'bolt']
export const BRAMBLE_H = 20
export const HITBOX_SHRINK = 2
export const CHICANE_GAP = 90
export const CHUNK_LEN_BRAMBLE = BRAMBLE_H
export const CHUNK_LEN_CHICANE = BRAMBLE_H + CHICANE_GAP + BRAMBLE_H
export const SAFE_LATERAL = 4
export const CHICANE_D_MIN = 0.5
export const CHICANE_P_PER_D = 0.3
export function CHICANE_P(D) { return CHICANE_P_PER_D * D }
export const CHICANE_P_LATE = 0.25
export function GAP_W(D) { return 134 - 42 * D }
export function SLACK(D) { return GAP_W(D) + 2 * HITBOX_SHRINK - SWARM_W_MAX }
export function MAX_SHIFT(D, s, gap = CHUNK_GAP(D)) {
const geo = 320 - GAP_W(D)
const dyn = SLACK(D) + SAFE_LATERAL * ((gap - SWARM_W_MAX) / s - SETTLE_TICKS)
const m = dyn < geo ? dyn : geo
return m > 0 ? m : 0
}
export function CHICANE_SHIFT(D) {
const a = 60 - 30 * D
const b = GAP_W(D) + 2 * HITBOX_SHRINK - SWARM_W_MAX
return a < b ? a : b
}
export const WEIGHT = [0, 40, 15, 15, 15, 15, 0, 12, 9]
export const UNLOCK_TICK = [0, 0, 600, 1200, 1800, 2400, 1e9, 4050, 9000]
export const BOLT_W_LATE = 9
export const MOBILE_W_LATE = 15
export function typeWeight(t, tick) {
if (tick < UNLOCK_TICK[t]) return 0
if (t === T_BOLT) return WEIGHT[t] + BOLT_W_LATE * lateAt(tick)
if (t === T_BAT || t === T_MOTH) return WEIGHT[t] + MOBILE_W_LATE * lateAt(tick)
return WEIGHT[t]
}
export const STRAY_P = 0.35
export const STRAY_R = 20
export const STRAY_EDGE = 12
export const STRAY_SLOTS = 3
export const STRAY_P_LATE = 4
export function strayPAt(late) { const k = 1 - STRAY_P_LATE * late; return k > 0 ? STRAY_P * k : 0 }
export const NEAR_DIST = 10
export const NEAR_DIST_BAT = 24
export const NEAR_RAW = 600
export const PICKUP_FULL_RAW = 1200
export const FLARE_CD = 180
export const FLARE_CD_LATE = 240
export function flareCdAt(late) { return Math.round(FLARE_CD + FLARE_CD_LATE * late) }
export const FLARE_R = 120
export const FLARE_BUFFER = 5
export const FLARE_FX_TICKS = 18
export const LIGHT_R_BASE = 48
export const LIGHT_PER_FIREFLY = 4
export const COMBO_CAP = 14
export const SCORE_DIV = 120
export const EV = {
LOST: 1, NEAR_MISS: 2, PICKUP: 3, FLARE: 4, FLARE_HIT: 5, BAT_WARN: 6,
BAT_BITE: 7, MOTH_BURN: 8, GATE_WARN: 9, DEATH: 10, DIFFICULTY_UP: 11,
BOLT_WARN: 12, BOLT_HIT: 13, PULSE_ON: 14, WIND_WARN: 15, WIND_START: 16,
SHIELD_GAIN: 17, SHIELD_BREAK: 18, EMBER_GAIN: 19, ACT_START: 20,
GAUNTLET_WARN: 21, GAUNTLET_START: 22, GAUNTLET_END: 23,
}
export const CHUNK_LEN_CURRENT = 240
export const CHUNK_LEN_GATE = 24
export const CHUNK_LEN_MOBILE = 0
export const CURRENT_W_MIN = 80
export const CURRENT_W_MAX = 110
export const CURRENT_H = 240
export const CURRENT_F = 1.0
export const CURRENT_EDGE = 40
export const BAT_WARN_TICKS = 60
export const BAT_Y_MIN = 120
export const BAT_Y_MAX = 320
export const BAT_ENTRY_X = 16
export const BAT_ACC = 0.14
export const BAT_V0 = 2.4
export const BAT_V_PER_D = 0.8
export const BAT_R = 10
export const BAT_BITE_DELAY = 5
export const BAT_CHEW = 24
export const BAT_BITES_MAX = 2
export const BAT_BITES_LATE = 0.3
export function batBitesMax(late) { return late >= BAT_BITES_LATE ? BAT_BITES_MAX + 1 : BAT_BITES_MAX }
export const BAT_LIFE = 540
export const BAT_LEAVE_V = 4
export const BAT_FLEE = 150
export const BAT_FLEE_MULT = 1.5
export const BAT_REPEL_RAW = 3000
export function BAT_V(D, late = 0) { return BAT_V0 + BAT_V_PER_D * D + BAT_V_LATE * late }
export const BAT_V_LATE = 1.0
export function BAT_MAX_ALIVE(D, late = 0) { return D >= 0.75 ? (late >= BAT3_LATE ? 3 : 2) : 1 }
export const BAT3_LATE = 0.0001
export const MOTH_ZIG = 0.5
export const MOTH_ZIG_STEP = 2
export const MOTH_V0 = 1.0
export const MOTH_V_PER_D = 0.6
export const MOTH_R = 8
export const MOTH_CONTACT = 20
export const MOTH_EAT_TICKS = 45
export const MOTH_BITES_MAX = 2
export const MOTH_MAX_ALIVE = 2
export const MOTH3_LATE = 0.5
export function mothMaxAlive(late) { return late >= MOTH3_LATE ? 3 : MOTH_MAX_ALIVE }
export const MOTH_BURN_RAW = 4800
export function MOTH_V(D) { return MOTH_V0 + MOTH_V_PER_D * D }
export const GATE_H = 24
export const GATE_OPEN = 140
export const GATE_PERIOD = 200
export const GATE_OPEN_T = 100
export const GATE_WARN = 20
export const GATE_CLOSE_T = 25
export const GATE_SHUT_T = 25
export const GATE_REOPEN_T = 50
export const GATE_GRACE = 5
export const GATE_REF_Y = 430
export const PULSE_PERIOD = 72
export const PULSE_ON_T = 24
export const PULSE_WARN = 24
export const PULSE_REF_Y = 470
export const PULSE_NEAR_T = 6
export const CHUNK_LEN_PULSE = BRAMBLE_H
export const BOLT_WARN_T = 48
export const BOLT_STRIKE_T = 12
export const BOLT_HW = 12
export const BOLT_OFF = 24
export const BOLT_REF_Y = 470
export const BOLT_SEP = 150
export const BOLT_NEAR = 10
export const CHUNK_LEN_BOLT = 120
export const ITEM_POOL = 6
export const ITEM_R = 20
export const ITEM_UNLOCK = 4050
export const EMBER_P = 0.06
export const COCOON_P = 0.025
export const ITEM_EDGE = 14
export const SHIELD_TTL = 1200
export const START_SHIELD = 600
export const SHIELD_IFRAMES = 36
export const WIND_WARN_T = 60
export const WIND_BLOW_T = 180
export const WIND_RAMP = 20
export const WIND_F = 1.6
export const WIND_FIRST = 360
export const WIND_EVERY = 600
export const WIND_JIT = 240
export const COMBINE_P0 = 0.25
export const COMBINE_P_LATE = 0.5
export function COMBINE_P(late) { return late > 0 ? COMBINE_P0 + COMBINE_P_LATE * late : 0 }
export const C_CHICANE = 100
export const GAUNTLET_KINDS = [
[T_PULSE, C_CHICANE, T_PULSE],
[T_GATE, C_CHICANE, T_GATE],
[T_PULSE, C_CHICANE, T_GATE],
[T_GATE, C_CHICANE, T_PULSE],
[C_CHICANE, T_BOLT, C_CHICANE],
[T_PULSE, C_CHICANE, T_BOLT],
]
export const GAUNTLET_QUIET = 1200
export const GAUNTLET_EVERY = 1500
export const GAUNTLET_JIT = 600
export const GAUNTLET_START_Y = 300
export const GAUNTLET_END_Y = 560
export const GAUNTLET_SPAN_MARGIN = 30
