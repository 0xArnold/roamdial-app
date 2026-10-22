// Real PCM envelope; no synthetic beat when audio is silent or unavailable.
export function rmsLevel(samples) {
  let energy = 0;
  for (const v of samples) energy += v * v;
  const rms = Math.sqrt(energy / Math.max(1, samples.length));
  return Math.min(1, Math.max(0, (rms - 0.008) * 4.5));
}
export function smoothLevel(previous, target, dt) {
  const rate = target > previous ? 18 : 5;
  const next = previous + (target - previous) * (1 - Math.exp(-rate * Math.min(dt, 0.1)));
  return next < 0.0001 ? 0 : next;
}
