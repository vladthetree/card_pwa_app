/**
 * AI_CONTEXT: Sharp, CSS-only startup loader. It intentionally avoids canvas,
 * WebGL and blur filters so iOS Safari can animate it without fuzzy scaling.
 */
import type { CSSProperties } from 'react'
import './StartupLoader.css'

interface StartupLoaderProps {
  primary: string
  secondary: string
  reducedMotion?: boolean | null
}

export default function StartupLoader({
  primary,
  secondary,
  reducedMotion = false,
}: StartupLoaderProps) {
  const style = {
    '--startup-loader-primary': primary,
    '--startup-loader-secondary': secondary,
  } as CSSProperties

  return (
    <div
      aria-hidden="true"
      className={`startup-loader${reducedMotion ? ' startup-loader--calm' : ''}`}
      data-testid="startup-loader"
      style={style}
    >
      <div className="startup-loader__orbit startup-loader__orbit--outer">
        <span className="startup-loader__satellite startup-loader__satellite--primary" />
        <span className="startup-loader__satellite startup-loader__satellite--secondary" />
      </div>

      <div className="startup-loader__orbit startup-loader__orbit--inner">
        <span className="startup-loader__dot startup-loader__dot--primary" />
        <span className="startup-loader__dot startup-loader__dot--secondary" />
      </div>

      <div className="startup-loader__deck">
        <span className="startup-loader__card startup-loader__card--back" />
        <span className="startup-loader__card startup-loader__card--middle" />
        <span className="startup-loader__card startup-loader__card--front">
          <span className="startup-loader__eyebrow" />
          <span className="startup-loader__line startup-loader__line--long" />
          <span className="startup-loader__line startup-loader__line--short" />
        </span>
      </div>
    </div>
  )
}
