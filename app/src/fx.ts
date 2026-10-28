// Visual effects drawn on a canvas over the page: confetti bursts and sparkles for big cards.

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  shape: 0 | 1 | 2;
  life: number;
  max: number;
  gravity: number;
};

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let running = false;

export function reducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function ensureCanvas(): boolean {
  if (canvas && ctx && document.body.contains(canvas)) return true;
  canvas = document.createElement("canvas");
  canvas.className = "fx-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
  return Boolean(ctx);
}

function resize() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function star(c: CanvasRenderingContext2D, r: number) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}

function loop() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  particles = particles.filter((p) => p.life < p.max);
  for (const p of particles) {
    p.life += 1;
    p.vx *= 0.985;
    p.vy = p.vy * 0.985 + p.gravity;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    const fade = 1 - p.life / p.max;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, fade * 1.4));
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    else if (p.shape === 1) {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
      ctx.fill();
    } else star(ctx, p.size / 2);
    ctx.restore();
  }
  if (particles.length > 0) requestAnimationFrame(loop);
  else {
    running = false;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

function start() {
  if (!running) {
    running = true;
    requestAnimationFrame(loop);
  }
}

/** A burst of confetti and stars from a point of the screen. */
export function burst(x: number, y: number, colors: string[], count = 140, power = 1) {
  if (reducedMotion() || !ensureCanvas()) return;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (2 + Math.random() * 9) * power;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4 * power,
      size: 6 + Math.random() * 9,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[i % colors.length],
      shape: (i % 3) as 0 | 1 | 2,
      life: 0,
      max: 70 + Math.random() * 60,
      gravity: 0.18,
    });
  }
  start();
}

/** Confetti raining from the top, for a new path. */
export function rain(colors: string[], count = 160) {
  if (reducedMotion() || !ensureCanvas()) return;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * window.innerHeight * 0.5,
      vx: (Math.random() - 0.5) * 2,
      vy: 2 + Math.random() * 3,
      size: 6 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      color: colors[i % colors.length],
      shape: (i % 3) as 0 | 1 | 2,
      life: 0,
      max: 160 + Math.random() * 80,
      gravity: 0.05,
    });
  }
  start();
}

/** Little sparkles around an element, for rare cards on screen. */
export function sparkle(el: Element, color: string, count = 18) {
  if (reducedMotion() || !ensureCanvas()) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    particles.push({
      x: r.left + Math.random() * r.width,
      y: r.top + Math.random() * r.height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -0.4 - Math.random() * 0.8,
      size: 6 + Math.random() * 6,
      rot: 0,
      vr: 0.05,
      color,
      shape: 2,
      life: 0,
      max: 40 + Math.random() * 30,
      gravity: 0,
    });
  }
  start();
}

export function vibrate(pattern: number | number[]) {
  try {
    if (!reducedMotion() && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* not allowed here */
  }
}

export const RARITY_COLORS: Record<string, string[]> = {
  base: ["#dfe6f4", "#9fb0cc", "#ffffff"],
  rare: ["#ff5a76", "#ff9aab", "#ffd1d9", "#c21f45"],
  eclat: ["#ffcf4f", "#fff1b0", "#ffb200", "#ffffff"],
  legende: ["#f3e2b8", "#d8b878", "#ffffff", "#b98d45"],
  moment: ["#8af3ff", "#ff7ae0", "#ffe27a", "#9c8bff"],
  shiny: ["#ff7ae0", "#8af3ff", "#ffe27a", "#9cff8a", "#9c8bff", "#ffffff"],
};
