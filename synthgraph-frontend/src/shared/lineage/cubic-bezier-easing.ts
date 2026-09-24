// A minimal, dependency-free cubic-bezier easing solver (Newton-Raphson
// with a bisection fallback), following the same math as CSS's own
// `cubic-bezier()` timing function. Needed because ReactFlow's
// `fitViewOptions.ease` takes a raw `(t: number) => number` function -
// unlike Motion's `ease` prop, which accepts a bezier control-point array
// directly - so a literal `cubic-bezier(x1, y1, x2, y2)` curve can't be
// passed through as-is.
export function cubicBezierEasing(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const bezier = (t: number, a: number, b: number) => {
    const c = 3 * a;
    const d = 3 * (b - a) - c;
    const e = 1 - c - d;
    return ((e * t + d) * t + c) * t;
  };
  const bezierDerivative = (t: number, a: number, b: number) => {
    const c = 3 * a;
    const d = 3 * (b - a) - c;
    const e = 1 - c - d;
    return (3 * e * t + 2 * d) * t + c;
  };

  const xForT = (t: number) => bezier(t, x1, x2);
  const yForT = (t: number) => bezier(t, y1, y2);
  const dxForT = (t: number) => bezierDerivative(t, x1, x2);

  const tForX = (x: number): number => {
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const currentX = xForT(t) - x;
      const derivative = dxForT(t);
      if (Math.abs(derivative) < 1e-6) break;
      t -= currentX / derivative;
    }
    return Math.min(1, Math.max(0, t));
  };

  return (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : yForT(tForX(t)));
}
