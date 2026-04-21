import { useEffect, useRef, useCallback } from 'react'

/**
 * 3-D Game of Life – Carter Bays variant S5-7/B6
 * Isometric canvas projection, seeded from reviewedToday.
 */

interface Props {
  reviewedToday: number
  correctToday: number
  viewMode?: '2d' | '3d'
  animationSpeed?: number
}

const GC = 12
const GR = 12
const GD = 4

const ACTIVE_TICK_MS = 240
const IDLE_TICK_MS = 960
const REDUCED_MOTION_TICK_MS = 1400
const BURST_DURATION_MS = 12_000
const STABLE_THRESHOLD = 6
const CALM_HUES = [18, 34, 48, 162, 198, 224]

function normalizeAnimationSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 100
  return Math.max(50, Math.min(150, Math.round(speed)))
}

function seedRatio(reviewed: number): number {
  if (reviewed === 0) return 0.04
  return Math.min(0.18 + (reviewed / 60) * 0.18, 0.42)
}

function makeGrid(ratio: number): Uint8Array {
  const g = new Uint8Array(GC * GR * GD)
  for (let i = 0; i < g.length; i++) g[i] = Math.random() < ratio ? 1 : 0
  return g
}

function readCell(g: Uint8Array, c: number, r: number, z: number): number {
  return g[((z + GD) % GD) * GC * GR + ((r + GR) % GR) * GC + ((c + GC) % GC)]
}

function aliveCount(g: Uint8Array): number {
  let total = 0
  for (let i = 0; i < g.length; i++) total += g[i]
  return total
}

function enforceMinAliveCells(g: Uint8Array, minAlive: number): Uint8Array {
  const target = Math.min(Math.max(0, Math.floor(minAlive)), g.length)
  if (target === 0) return g

  let alive = aliveCount(g)
  if (alive >= target) return g

  const next = new Uint8Array(g)
  const deadIndices: number[] = []

  for (let i = 0; i < next.length; i++) {
    if (next[i] === 0) deadIndices.push(i)
  }

  while (alive < target && deadIndices.length > 0) {
    const pick = Math.floor(Math.random() * deadIndices.length)
    const idx = deadIndices[pick]
    next[idx] = 1
    deadIndices[pick] = deadIndices[deadIndices.length - 1]
    deadIndices.pop()
    alive += 1
  }

  return next
}

function injectCells(g: Uint8Array, ratio: number): Uint8Array {
  const next = new Uint8Array(g)
  for (let i = 0; i < next.length; i++) {
    if (next[i] === 0 && Math.random() < ratio) next[i] = 1
  }
  return next
}

function step(grid: Uint8Array): { next: Uint8Array; changed: boolean } {
  const next = new Uint8Array(GC * GR * GD)
  let changed = false
  for (let z = 0; z < GD; z++) {
    for (let r = 0; r < GR; r++) {
      for (let c = 0; c < GC; c++) {
        let n = 0
        for (let dz = -1; dz <= 1; dz++) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dz !== 0 || dr !== 0 || dc !== 0) {
                n += readCell(grid, c + dc, r + dr, z + dz)
              }
            }
          }
        }

        const cur = readCell(grid, c, r, z)
        const nxt: 0 | 1 =
          (cur === 1 && n >= 5 && n <= 7) || (cur === 0 && n === 6) ? 1 : 0
        next[z * GC * GR + r * GC + c] = nxt
        if (nxt !== cur) changed = true
      }
    }
  }
  return { next, changed }
}

function drawIso(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  g: Uint8Array,
  alive: boolean,
) {
  const width = ctx.canvas.width / dpr
  const height = ctx.canvas.height / dpr

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, width, height)

  const cellSize = Math.min(
    width / (GC + GR + 2),
    height / ((GC + GR) * 0.5 + GD + 2),
  )

  const offX = width / 2
  const gridH = (GC + GR) * cellSize * 0.5 + GD * cellSize
  const offY = (height - gridH) / 2 + GD * cellSize

  const sx = (c: number, r: number) => (c - r) * cellSize + offX
  const sy = (c: number, r: number, z: number) =>
    (c + r) * cellSize * 0.5 - z * cellSize + offY

  const baseSaturation = alive ? 82 : 30
  const baseAlpha = alive ? 0.9 : 0.38

  const colorForCell = (c: number, r: number, z: number) => {
    // Deterministic palette selection keeps the scene varied but visually calm.
    const idx = Math.abs((c * 17 + r * 23 + z * 31) % CALM_HUES.length)
    const hue = CALM_HUES[idx]
    const top = `hsla(${hue} ${Math.max(26, baseSaturation - 14)}% 56% / ${baseAlpha})`
    const right = `hsla(${hue} ${Math.max(20, baseSaturation - 22)}% 43% / ${Math.max(0.2, baseAlpha - 0.18)})`
    const front = `hsla(${hue} ${Math.max(16, baseSaturation - 28)}% 33% / ${Math.max(0.16, baseAlpha - 0.28)})`
    return { top, right, front }
  }

  for (let z = 0; z < GD; z++) {
    for (let diag = 0; diag < GR + GC - 1; diag++) {
      for (let r = 0; r < GR; r++) {
        const c = diag - r
        if (c < 0 || c >= GC) continue
        if (!readCell(g, c, r, z)) continue

        const palette = colorForCell(c, r, z)

        ctx.beginPath()
        ctx.moveTo(sx(c, r), sy(c, r, z + 1))
        ctx.lineTo(sx(c + 1, r), sy(c + 1, r, z + 1))
        ctx.lineTo(sx(c + 1, r + 1), sy(c + 1, r + 1, z + 1))
        ctx.lineTo(sx(c, r + 1), sy(c, r + 1, z + 1))
        ctx.closePath()
        ctx.fillStyle = palette.top
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(sx(c + 1, r), sy(c + 1, r, z + 1))
        ctx.lineTo(sx(c + 1, r + 1), sy(c + 1, r + 1, z + 1))
        ctx.lineTo(sx(c + 1, r + 1), sy(c + 1, r + 1, z))
        ctx.lineTo(sx(c + 1, r), sy(c + 1, r, z))
        ctx.closePath()
        ctx.fillStyle = palette.right
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(sx(c, r + 1), sy(c, r + 1, z + 1))
        ctx.lineTo(sx(c + 1, r + 1), sy(c + 1, r + 1, z + 1))
        ctx.lineTo(sx(c + 1, r + 1), sy(c + 1, r + 1, z))
        ctx.lineTo(sx(c, r + 1), sy(c, r + 1, z))
        ctx.closePath()
        ctx.fillStyle = palette.front
        ctx.fill()
      }
    }
  }

  ctx.restore()
}

function draw2D(
  ctx: CanvasRenderingContext2D,
  g: Uint8Array,
) {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.imageSmoothingEnabled = false

  const width = ctx.canvas.width
  const height = ctx.canvas.height
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)

  const targetAspect = width / Math.max(1, height)
  const layerCols = targetAspect >= 1.35 ? GD : targetAspect <= 0.7 ? 1 : 2
  const layerRows = Math.ceil(GD / layerCols)
  const cols = GC * layerCols
  const rows = GR * layerRows
  const cellSize = Math.max(1, Math.floor(Math.min(width / cols, height / rows)))
  const gridWidth = cols * cellSize
  const gridHeight = rows * cellSize
  const originX = Math.floor((width - gridWidth) / 2)
  const originY = Math.floor((height - gridHeight) / 2)
  const liveFill = '#fff'

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const layerX = c % layerCols
      const layerY = r % layerRows
      const z = layerY * layerCols + layerX
      if (z >= GD) continue
      if (!readCell(g, Math.floor(c / layerCols), Math.floor(r / layerRows), z)) continue

      ctx.fillStyle = liveFill
      ctx.fillRect(originX + c * cellSize, originY + r * cellSize, cellSize, cellSize)
    }
  }

  ctx.restore()
}

interface State {
  g: Uint8Array
  paused: boolean
  stableCount: number
}

export function GameOfLife({ reviewedToday, correctToday, viewMode = '3d', animationSpeed = 100 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<State | null>(null)
  const rafRef = useRef<number>(0)
  const lastRef = useRef<number>(0)
  const dprRef = useRef(1)
  const reviewedRef = useRef(reviewedToday)
  const correctRef = useRef(correctToday)
  const speedRef = useRef(normalizeAnimationSpeed(animationSpeed))
  const mountedRef = useRef(false)
  const burstUntilRef = useRef(0)
  const isPageVisibleRef = useRef(typeof document === 'undefined' ? true : document.visibilityState === 'visible')
  const reducedMotionRef = useRef(false)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const s = stateRef.current
    if (!canvas || !s) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      if (viewMode === '2d') {
        draw2D(ctx, s.g)
      } else {
        drawIso(ctx, dprRef.current, s.g, reviewedRef.current > 0)
      }
    }
  }, [viewMode])

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      reviewedRef.current = reviewedToday
      correctRef.current = correctToday
      burstUntilRef.current = performance.now() + BURST_DURATION_MS
      return
    }

    const prev = reviewedRef.current
    reviewedRef.current = reviewedToday
    correctRef.current = correctToday
    const s = stateRef.current
    if (!s) return

    if (reviewedToday === 0) {
      const nextGrid = enforceMinAliveCells(makeGrid(seedRatio(0)), correctRef.current)
      stateRef.current = { g: nextGrid, paused: false, stableCount: 0 }
    } else if (reviewedToday > prev) {
      const inject = Math.min(((reviewedToday - prev) / 60) * 0.18, 0.10)
      const newG = new Uint8Array(s.g)
      for (let i = 0; i < newG.length; i++) {
        if (!newG[i] && Math.random() < inject) newG[i] = 1
      }
      stateRef.current = { g: enforceMinAliveCells(newG, correctRef.current), paused: false, stableCount: 0 }
    } else {
      stateRef.current = { g: enforceMinAliveCells(s.g, correctRef.current), paused: s.paused, stableCount: s.stableCount }
    }

    burstUntilRef.current = performance.now() + BURST_DURATION_MS

    redraw()
  }, [reviewedToday, correctToday, redraw])

  useEffect(() => {
    speedRef.current = normalizeAnimationSpeed(animationSpeed)
  }, [animationSpeed])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const syncSize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      dprRef.current = dpr
      if (rect.width === 0 || rect.height === 0) return

      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)

      if (!stateRef.current) {
        stateRef.current = {
          g: enforceMinAliveCells(makeGrid(seedRatio(reviewedRef.current)), correctRef.current),
          paused: false,
          stableCount: 0,
        }
      }

      redraw()
    }

    syncSize()
    const ro = new ResizeObserver(syncSize)
    ro.observe(canvas)

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const applyReducedMotion = () => {
      reducedMotionRef.current = mediaQuery.matches
    }
    applyReducedMotion()

    const onVisibilityChange = () => {
      isPageVisibleRef.current = document.visibilityState === 'visible'
      if (isPageVisibleRef.current) {
        lastRef.current = 0
        burstUntilRef.current = performance.now() + 2_200
      }
    }

    const onMotionChange = () => applyReducedMotion()

    document.addEventListener('visibilitychange', onVisibilityChange)
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onMotionChange)
    } else {
      mediaQuery.addListener(onMotionChange)
    }

    const loop = (ts: number) => {
      if (!isPageVisibleRef.current) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const s = stateRef.current
      const inBurst = ts < burstUntilRef.current
      const speedFactor = speedRef.current / 100
      const tickMs = reducedMotionRef.current
        ? Math.max(320, REDUCED_MOTION_TICK_MS / speedFactor)
        : Math.max(100, (inBurst ? ACTIVE_TICK_MS : IDLE_TICK_MS) / speedFactor)

      if (s && !s.paused && ts - lastRef.current >= tickMs) {
        const { next, changed } = step(s.g)
        const stableCount = changed ? 0 : s.stableCount + 1

        let nextGrid = next
        if (reviewedRef.current > 0 && stableCount >= STABLE_THRESHOLD) {
          // Keep evolution alive for active study sessions, but stay calm in idle mode.
          nextGrid = injectCells(next, inBurst ? 0.012 : 0.004)
        }

        const preEnforcePopulation = aliveCount(nextGrid)
        nextGrid = enforceMinAliveCells(nextGrid, correctRef.current)
        const enforcedPopulation = aliveCount(nextGrid)
        const effectiveStableCount = enforcedPopulation > preEnforcePopulation ? 0 : stableCount

        if (reviewedRef.current > 0 && enforcedPopulation === 0) {
          stateRef.current = {
            g: enforceMinAliveCells(makeGrid(seedRatio(reviewedRef.current)), correctRef.current),
            paused: false,
            stableCount: 0,
          }
          redraw()
          lastRef.current = ts
          rafRef.current = requestAnimationFrame(loop)
          return
        }

        stateRef.current = {
          g: nextGrid,
          paused: reviewedRef.current === 0 && effectiveStableCount >= STABLE_THRESHOLD,
          stableCount: reviewedRef.current > 0 && effectiveStableCount >= STABLE_THRESHOLD ? 0 : effectiveStableCount,
        }

        const ctx = canvas.getContext('2d')
        if (ctx) {
          if (viewMode === '2d') {
            draw2D(ctx, nextGrid)
          } else {
            drawIso(ctx, dprRef.current, nextGrid, reviewedRef.current > 0)
          }
        }
        lastRef.current = ts
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', onMotionChange)
      } else {
        mediaQuery.removeListener(onMotionChange)
      }
    }
  }, [redraw, viewMode])

  return <canvas ref={canvasRef} className="block w-full h-full" />
}
