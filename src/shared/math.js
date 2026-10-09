export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

/** Hermite ease of t, clamped to 0..1. */
export const smoothstep = t => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};

/** smoothstep of where `value` sits between `from` and `to` (`from` may be greater than `to`). */
export const smoothRange = (from, to, value) => smoothstep((value - from) / (to - from));
