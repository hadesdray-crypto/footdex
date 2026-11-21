// When the screen turns (portrait <-> landscape), everybody on the screen moves to the same place in the new screen:
// one event « footdex:ecran » with the old and the new size, and each kind of character puts himself back inside.

export type Recal = { w0: number; h0: number; w1: number; h1: number };
export const EVT_ECRAN = "footdex:ecran";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Same place in proportion; somebody entering or leaving by a side stays just outside that side. */
export function recalerX(x: number, d: Recal, marge = 24): number {
  if (x < 0) return x;
  if (x > d.w0) return d.w1 + (x - d.w0);
  return clamp((x * d.w1) / d.w0, marge, d.w1 - marge);
}
/** The ground line: same height in proportion, never under the bottom bar nor under the top bar. */
export function recalerY(y: number, d: Recal, haut = 96, bas = 78): number {
  return clamp((y * d.h1) / d.h0, haut, Math.max(haut, d.h1 - bas));
}
export function recaler<T extends { x: number; y: number }>(p: T, d: Recal, marge = 24): T {
  p.x = recalerX(p.x, d, marge);
  p.y = recalerY(p.y, d);
  return p;
}

/** Called each time the screen has turned (the new size is already there). Returns a function to stop listening. */
export function surEcranTourne(fn: (d: Recal) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const h = (e: Event) => {
    try {
      fn((e as CustomEvent<Recal>).detail);
    } catch {
      /* one character that cannot move must not stop the others */
    }
  };
  window.addEventListener(EVT_ECRAN, h);
  return () => window.removeEventListener(EVT_ECRAN, h);
}
