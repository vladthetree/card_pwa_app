/**
 * AI_CONTEXT:
 * Role: Async geladenes framer-motion-Featurepaket für <LazyMotion> (App.tsx).
 * Used by: App.tsx via dynamic import — landet als eigener Chunk außerhalb des Start-Bundles.
 * Important: domMax (nicht domAnimation), weil DragMatchCard Drag-Gesten nutzt.
 */
import { domMax } from 'framer-motion'

export default domMax
