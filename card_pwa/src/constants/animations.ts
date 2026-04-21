export const animationContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

export const animationItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
}
