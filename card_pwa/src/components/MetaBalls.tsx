/**
 * AI_CONTEXT: WebGL metaballs animation adapted from React Bits for the startup loading screen.
 */
import { useEffect, useRef, type CSSProperties } from 'react'
import { Camera, Mesh, Program, Renderer, Transform, Triangle, Vec3 } from 'ogl'
import './MetaBalls.css'

interface MetaBallsProps {
  className?: string
  color?: string
  speed?: number
  enableMouseInteraction?: boolean
  hoverSmoothness?: number
  animationSize?: number
  ballCount?: number
  clumpFactor?: number
  cursorBallSize?: number
  cursorBallColor?: string
  enableTransparency?: boolean
}

function parseHexColor(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const normalized = clean.length === 3
    ? clean.split('').map(ch => `${ch}${ch}`).join('')
    : clean
  const r = Number.parseInt(normalized.substring(0, 2), 16) / 255
  const g = Number.parseInt(normalized.substring(2, 4), 16) / 255
  const b = Number.parseInt(normalized.substring(4, 6), 16) / 255
  return [
    Number.isFinite(r) ? r : 1,
    Number.isFinite(g) ? g : 1,
    Number.isFinite(b) ? b : 1,
  ]
}

function fract(x: number): number {
  return x - Math.floor(x)
}

function hash31(p: number): [number, number, number] {
  const r: [number, number, number] = [p * 0.1031, p * 0.103, p * 0.0973].map(fract) as [number, number, number]
  const rYzx = [r[1], r[2], r[0]]
  const dotVal = r[0] * (rYzx[0] + 33.33) + r[1] * (rYzx[1] + 33.33) + r[2] * (rYzx[2] + 33.33)
  for (let i = 0; i < 3; i += 1) {
    r[i] = fract(r[i] + dotVal)
  }
  return r
}

function hash33(v: [number, number, number]): [number, number, number] {
  const p: [number, number, number] = [v[0] * 0.1031, v[1] * 0.103, v[2] * 0.0973].map(fract) as [number, number, number]
  const pYxz = [p[1], p[0], p[2]]
  const dotVal = p[0] * (pYxz[0] + 33.33) + p[1] * (pYxz[1] + 33.33) + p[2] * (pYxz[2] + 33.33)
  for (let i = 0; i < 3; i += 1) {
    p[i] = fract(p[i] + dotVal)
  }
  const pXxy = [p[0], p[0], p[1]]
  const pYxx = [p[1], p[0], p[0]]
  const pZyx = [p[2], p[1], p[0]]
  const result: [number, number, number] = [0, 0, 0]
  for (let i = 0; i < 3; i += 1) {
    result[i] = fract((pXxy[i] + pYxx[i]) * pZyx[i])
  }
  return result
}

const vertex = `#version 300 es
precision highp float;
layout(location = 0) in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragment = `#version 300 es
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec3 iMouse;
uniform vec3 iColor;
uniform vec3 iCursorColor;
uniform float iAnimationSize;
uniform int iBallCount;
uniform float iCursorBallSize;
uniform vec3 iMetaBalls[50];
uniform float iClumpFactor;
uniform bool enableTransparency;
out vec4 outColor;

float getMetaBallValue(vec2 c, float r, vec2 p) {
  vec2 d = p - c;
  float dist2 = max(dot(d, d), 0.0001);
  return (r * r) / dist2;
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  float scale = iAnimationSize / iResolution.y;
  vec2 coord = (fc - iResolution.xy * 0.5) * scale;
  vec2 mouseW = (iMouse.xy - iResolution.xy * 0.5) * scale;
  float m1 = 0.0;
  for (int i = 0; i < 50; i++) {
    if (i >= iBallCount) break;
    m1 += getMetaBallValue(iMetaBalls[i].xy, iMetaBalls[i].z, coord);
  }
  float m2 = getMetaBallValue(mouseW, iCursorBallSize, coord);
  float total = m1 + m2;
  float f = smoothstep(-1.0, 1.0, (total - 1.3) / min(1.0, fwidth(total)));
  vec3 cFinal = vec3(0.0);
  if (total > 0.0) {
    float alpha1 = m1 / total;
    float alpha2 = m2 / total;
    cFinal = iColor * alpha1 + iCursorColor * alpha2;
  }
  outColor = vec4(cFinal * f, enableTransparency ? f : 1.0);
}
`

export default function MetaBalls({
  className = '',
  color = '#ffffff',
  speed = 0.3,
  enableMouseInteraction = true,
  hoverSmoothness = 0.05,
  animationSize = 30,
  ballCount = 15,
  clumpFactor = 1,
  cursorBallSize = 3,
  cursorBallColor = '#ffffff',
  enableTransparency = true,
}: MetaBallsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined

    let renderer: Renderer | null = null
    let animationFrameId = 0

    try {
      const dpr = 1
      renderer = new Renderer({ dpr, alpha: true, premultipliedAlpha: false })
      const gl = renderer.gl
      gl.clearColor(0, 0, 0, enableTransparency ? 0 : 1)
      container.appendChild(gl.canvas)

      const camera = new Camera(gl, {
        left: -1,
        right: 1,
        top: 1,
        bottom: -1,
        near: 0.1,
        far: 10,
      })
      camera.position.z = 1

      const geometry = new Triangle(gl)
      const [r1, g1, b1] = parseHexColor(color)
      const [r2, g2, b2] = parseHexColor(cursorBallColor)
      const metaBallsUniform = Array.from({ length: 50 }, () => new Vec3(0, 0, 0))
      const effectiveBallCount = Math.min(Math.max(0, Math.floor(ballCount)), 50)

      const program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
          iTime: { value: 0 },
          iResolution: { value: new Vec3(0, 0, 0) },
          iMouse: { value: new Vec3(0, 0, 0) },
          iColor: { value: new Vec3(r1, g1, b1) },
          iCursorColor: { value: new Vec3(r2, g2, b2) },
          iAnimationSize: { value: animationSize },
          iBallCount: { value: effectiveBallCount },
          iCursorBallSize: { value: cursorBallSize },
          iMetaBalls: { value: metaBallsUniform },
          iClumpFactor: { value: clumpFactor },
          enableTransparency: { value: enableTransparency },
        },
      })

      const mesh = new Mesh(gl, { geometry, program })
      const scene = new Transform()
      mesh.setParent(scene)
      const ballParams = Array.from({ length: effectiveBallCount }, (_, i) => {
        const idx = i + 1
        const h1 = hash31(idx)
        const h2 = hash33(h1)
        return {
          st: h1[0] * (2 * Math.PI),
          dtFactor: 0.1 * Math.PI + h1[1] * (0.4 * Math.PI - 0.1 * Math.PI),
          baseScale: 5.0 + h1[1] * 5.0,
          toggle: Math.floor(h2[0] * 2.0),
          radius: 0.5 + h2[2] * 1.5,
        }
      })

      const mouseBallPos = { x: 0, y: 0 }
      let pointerInside = false
      let pointerX = 0
      let pointerY = 0

      const resize = () => {
        const width = Math.max(1, container.clientWidth)
        const height = Math.max(1, container.clientHeight)
        renderer?.setSize(width * dpr, height * dpr)
        gl.canvas.style.width = `${width}px`
        gl.canvas.style.height = `${height}px`
        program.uniforms.iResolution.value.set(gl.canvas.width, gl.canvas.height, 0)
      }

      const onPointerMove = (event: PointerEvent) => {
        if (!enableMouseInteraction) return
        const rect = container.getBoundingClientRect()
        const px = event.clientX - rect.left
        const py = event.clientY - rect.top
        pointerX = (px / rect.width) * gl.canvas.width
        pointerY = (1 - py / rect.height) * gl.canvas.height
      }
      const onPointerEnter = () => {
        if (enableMouseInteraction) pointerInside = true
      }
      const onPointerLeave = () => {
        if (enableMouseInteraction) pointerInside = false
      }

      window.addEventListener('resize', resize)
      container.addEventListener('pointermove', onPointerMove)
      container.addEventListener('pointerenter', onPointerEnter)
      container.addEventListener('pointerleave', onPointerLeave)
      resize()

      const startTime = performance.now()
      const update = (now: number) => {
        animationFrameId = requestAnimationFrame(update)
        const elapsed = (now - startTime) * 0.001
        program.uniforms.iTime.value = elapsed

        for (let i = 0; i < effectiveBallCount; i += 1) {
          const p = ballParams[i]
          const dt = elapsed * speed * p.dtFactor
          const th = p.st + dt
          const x = Math.cos(th)
          const y = Math.sin(th + dt * p.toggle)
          metaBallsUniform[i].set(x * p.baseScale * clumpFactor, y * p.baseScale * clumpFactor, p.radius)
        }

        let targetX: number
        let targetY: number
        if (pointerInside) {
          targetX = pointerX
          targetY = pointerY
        } else {
          const cx = gl.canvas.width * 0.5
          const cy = gl.canvas.height * 0.5
          const rx = gl.canvas.width * 0.15
          const ry = gl.canvas.height * 0.15
          targetX = cx + Math.cos(elapsed * speed) * rx
          targetY = cy + Math.sin(elapsed * speed) * ry
        }
        mouseBallPos.x += (targetX - mouseBallPos.x) * hoverSmoothness
        mouseBallPos.y += (targetY - mouseBallPos.y) * hoverSmoothness
        program.uniforms.iMouse.value.set(mouseBallPos.x, mouseBallPos.y, 0)
        renderer?.render({ scene, camera })
      }

      animationFrameId = requestAnimationFrame(update)

      return () => {
        cancelAnimationFrame(animationFrameId)
        window.removeEventListener('resize', resize)
        container.removeEventListener('pointermove', onPointerMove)
        container.removeEventListener('pointerenter', onPointerEnter)
        container.removeEventListener('pointerleave', onPointerLeave)
        if (gl.canvas.parentNode === container) {
          container.removeChild(gl.canvas)
        }
        gl.getExtension('WEBGL_lose_context')?.loseContext()
      }
    } catch (error) {
      console.warn('[MetaBalls] WebGL loader unavailable', error)
      return undefined
    }
  }, [
    animationSize,
    ballCount,
    clumpFactor,
    color,
    cursorBallColor,
    cursorBallSize,
    enableMouseInteraction,
    enableTransparency,
    hoverSmoothness,
    speed,
  ])

  const style = {
    '--metaballs-color': color,
    '--metaballs-alt-color': cursorBallColor,
  } as CSSProperties

  return (
    <div ref={containerRef} className={`metaballs-container ${className}`.trim()} style={style} aria-hidden="true">
      <span className="metaballs-fallback metaballs-fallback-a" />
      <span className="metaballs-fallback metaballs-fallback-b" />
      <span className="metaballs-fallback metaballs-fallback-c" />
    </div>
  )
}
