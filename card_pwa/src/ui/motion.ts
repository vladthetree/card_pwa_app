/**
 * AI_CONTEXT:
 * Role: Zentraler framer-motion-Shim; exportiert die leichte `m`-Komponente unter dem Namen `motion`.
 * Used by: Alle Komponenten mit Animationen (statt direktem framer-motion-Import).
 * Important: `m` bündelt keine Animations-Features — die lädt App.tsx async über <LazyMotion features>. Neue Komponenten müssen von HIER importieren; ein direkter `motion`-Import aus framer-motion zieht sonst wieder das komplette Paket in den Start-Bundle. Ausnahme: Reorder (LabScenarioView) kommt weiter direkt aus framer-motion.
 */
export { m as motion, AnimatePresence, useReducedMotion } from 'framer-motion'
