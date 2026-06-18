// Selbstständige Enter-Animation pro Listenkarte. Bewusst KEINE Parent→Child-
// Varianten-Orchestrierung (variants + initial="hidden"/animate="show" mit
// staggerChildren): remounten Kinder, nachdem der Parent sein "show" bereits
// abgespielt hat (z. B. Tab-Wechsel Shuffle → Labs → zurück zu Decks), bleiben
// sie dauerhaft im hidden-Zustand — unsichtbar, aber klickbar (Bug 2026-06-11).
export const cardEnter = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
}
