export const motionTokens = {
  durations: {
    fast: 0.14,
    base: 0.22,
    slow: 0.32
  },
  ease: {
    standard: [0.2, 0.8, 0.2, 1] as const
  },
  distance: {
    pageY: 10,
    cardY: 8
  }
} as const;

