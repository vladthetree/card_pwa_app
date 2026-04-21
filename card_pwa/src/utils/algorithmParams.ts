export interface SM2Params {
  minEase: number
  defaultEase: number
  maxEase: number
  easeAgain: number
  easeHard: number
  easeGood: number
  easeEasy: number
  hardMultiplier: number
  easyMultiplier: number
  graduatingInterval: number
  hardGraduatingInterval: number
  easyInterval: number
}

export interface FSRSParams {
  requestRetention: number
  hardPen: number
  easyBonus: number
  w: number[]
}

export interface AlgorithmParams {
  sm2: SM2Params
  fsrs: FSRSParams
}

export const DEFAULT_SM2_PARAMS: SM2Params = {
  minEase: 1300,
  defaultEase: 2500,
  maxEase: 5000,
  easeAgain: -200,
  easeHard: -150,
  easeGood: 0,
  easeEasy: 150,
  hardMultiplier: 1.2,
  easyMultiplier: 1.3,
  graduatingInterval: 1,
  hardGraduatingInterval: 1,
  easyInterval: 4,
}

export const DEFAULT_FSRS_PARAMS: FSRSParams = {
  requestRetention: 0.9,
  hardPen: 1.2,
  easyBonus: 1.3,
  w: [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542],
}

export const DEFAULT_ALGORITHM_PARAMS: AlgorithmParams = {
  sm2: DEFAULT_SM2_PARAMS,
  fsrs: DEFAULT_FSRS_PARAMS,
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function normalizeSM2Params(input?: Partial<SM2Params>): SM2Params {
  const merged = { ...DEFAULT_SM2_PARAMS, ...(input ?? {}) }
  const minEase = Math.round(clamp(finiteOr(merged.minEase, DEFAULT_SM2_PARAMS.minEase), 800, 3000))
  const maxEase = Math.round(clamp(finiteOr(merged.maxEase, DEFAULT_SM2_PARAMS.maxEase), minEase + 200, 8000))
  const defaultEase = Math.round(clamp(finiteOr(merged.defaultEase, DEFAULT_SM2_PARAMS.defaultEase), minEase, maxEase))

  return {
    minEase,
    defaultEase,
    maxEase,
    easeAgain: Math.round(clamp(finiteOr(merged.easeAgain, DEFAULT_SM2_PARAMS.easeAgain), -500, 0)),
    easeHard: Math.round(clamp(finiteOr(merged.easeHard, DEFAULT_SM2_PARAMS.easeHard), -400, 50)),
    easeGood: Math.round(clamp(finiteOr(merged.easeGood, DEFAULT_SM2_PARAMS.easeGood), -100, 100)),
    easeEasy: Math.round(clamp(finiteOr(merged.easeEasy, DEFAULT_SM2_PARAMS.easeEasy), 0, 500)),
    hardMultiplier: clamp(finiteOr(merged.hardMultiplier, DEFAULT_SM2_PARAMS.hardMultiplier), 0.2, 1.2),
    easyMultiplier: clamp(finiteOr(merged.easyMultiplier, DEFAULT_SM2_PARAMS.easyMultiplier), 1.0, 2.5),
    graduatingInterval: Math.max(1, Math.floor(finiteOr(merged.graduatingInterval, DEFAULT_SM2_PARAMS.graduatingInterval))),
    hardGraduatingInterval: Math.max(1, Math.floor(finiteOr(merged.hardGraduatingInterval, DEFAULT_SM2_PARAMS.hardGraduatingInterval))),
    easyInterval: Math.max(1, Math.floor(finiteOr(merged.easyInterval, DEFAULT_SM2_PARAMS.easyInterval))),
  }
}

export function normalizeFSRSParams(input?: Partial<FSRSParams>): FSRSParams {
  const merged = { ...DEFAULT_FSRS_PARAMS, ...(input ?? {}) }
  const sourceWeights = Array.isArray(merged.w) && merged.w.length === DEFAULT_FSRS_PARAMS.w.length
    ? merged.w
    : DEFAULT_FSRS_PARAMS.w

  const w = sourceWeights.map((value, index) => finiteOr(value, DEFAULT_FSRS_PARAMS.w[index]))

  return {
    requestRetention: clamp(finiteOr(merged.requestRetention, DEFAULT_FSRS_PARAMS.requestRetention), 0.75, 0.99),
    hardPen: clamp(finiteOr(merged.hardPen, DEFAULT_FSRS_PARAMS.hardPen), 1.0, 2.5),
    easyBonus: clamp(finiteOr(merged.easyBonus, DEFAULT_FSRS_PARAMS.easyBonus), 1.0, 2.5),
    w,
  }
}

export function normalizeAlgorithmParams(input?: Partial<AlgorithmParams>): AlgorithmParams {
  return {
    sm2: normalizeSM2Params(input?.sm2),
    fsrs: normalizeFSRSParams(input?.fsrs),
  }
}

/** Converts SM-2 ease factor (1300-5000) to FSRS difficulty (1-10). */
export function factorToDifficulty(factor: number): number {
  return Math.max(1, Math.min(10, factor / 500))
}

/** Converts FSRS difficulty (1-10) to SM-2 ease factor with bounds. */
export function difficultyToFactor(
  difficulty: number,
  minEase = DEFAULT_SM2_PARAMS.minEase,
  maxEase = DEFAULT_SM2_PARAMS.maxEase,
): number {
  return Math.max(minEase, Math.min(maxEase, Math.round(difficulty * 500)))
}
