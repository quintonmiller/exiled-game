export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

export function direction(x1: number, y1: number, x2: number, y2: number): { dx: number; dy: number } {
  const dist = distance(x1, y1, x2, y2);
  if (dist === 0) return { dx: 0, dy: 0 };
  return { dx: (x2 - x1) / dist, dy: (y2 - y1) / dist };
}
