import { useEffect, useRef } from 'react';

// Decorative hero graphic: a twisting high-rise on a glazed podium, turning slowly, drawn in the site's gold on a
// drafting grid. Plain canvas 2D (no 3D library). The tower is a stack of convex floor plates, so it draws correctly
// with back-face culling and bottom-to-top order (the camera is always above). Pauses off screen and in background
// tabs. It always turns: it's part of the brand, so it deliberately ignores prefers-reduced-motion (the owner's call).

type Vec = [number, number, number];
type Point = [number, number];

const ACCENT = '217, 183, 126';
const BACKGROUND = '15, 16, 19';
const WARM = '255, 206, 138';
const SECONDS_PER_TURN = 40;
// A slow turn needs no more than 30 fps; phones get 20 to save battery.
const frameMs = () => 1000 / (window.matchMedia('(pointer: coarse)').matches ? 20 : 30);
const TILT = 0.36; // camera looks down by about 21 degrees
// Thin lines stay sharp at 1.5x; phones are capped there to keep each frame cheap.
const pixelRatio = () => Math.min(window.devicePixelRatio || 1, window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2);

// ---- Model ------------------------------------------------------------------------------------------------------

const FLOORS = 26;
const FLOOR_HEIGHT = 0.126;
const SLAB = 0.024; // slab thickness; the rest of each floor is glass
const SLAB_OUTSET = 0.045;
const TWIST = (Math.PI * 75) / 180; // base to top
const PODIUM_HEIGHT = 0.34;
const CROWN_FLOORS = 2; // open frame at the top, no glass
const MAST = 0.75;
/** Sun direction in model space (fixed to the building, so the shadow stays put as the camera circles). */
const SUN = normalize([-0.42, 0.88, 0.3]);

function normalize([x, y, z]: Vec): Vec {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}

/** Rounded rectangle footprint (convex), as [x, z] points. */
function roundedRect(width: number, depth: number, radius: number, steps = 3): Point[] {
  const points: Point[] = [];
  const corners: [number, number, number][] = [
    [width / 2 - radius, depth / 2 - radius, 0],
    [-width / 2 + radius, depth / 2 - radius, Math.PI / 2],
    [-width / 2 + radius, -depth / 2 + radius, Math.PI],
    [width / 2 - radius, -depth / 2 + radius, (Math.PI * 3) / 2]
  ];
  for (const [cx, cz, start] of corners) {
    for (let i = 0; i <= steps; i++) {
      const a = start + (i / steps) * (Math.PI / 2);
      points.push([cx + Math.cos(a) * radius, cz + Math.sin(a) * radius]);
    }
  }
  return points;
}

/** Scales and turns a footprint about its centre, pushing every point out by `outset`. */
function transformFootprint(points: Point[], scale: number, angle: number, outset = 0): Point[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map(([x, z]) => {
    const length = Math.hypot(x, z) || 1;
    const s = scale + outset / length;
    return [(x * cos - z * sin) * s, (x * sin + z * cos) * s];
  });
}

/** A vertical prism: a convex footprint extruded from y0 to y1. */
interface Prism {
  footprint: Point[];
  y0: number;
  y1: number;
  kind: 'glass' | 'slab' | 'podium' | 'frame';
  /** Seed for which windows are lit. */
  seed: number;
}

/** What doesn't change as the camera turns, worked out once per side of a prism. */
interface Side {
  /** Outward horizontal normal. */
  nx: number;
  nz: number;
  /** Sunlight on it, 0 to 1. */
  light: number;
  /** Window divisions across it, and which of them are lit. */
  panes: number;
  lit: number[];
}

/** Deterministic pseudo-random number in [0, 1). */
function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const TOWER_PLAN = roundedRect(1.25, 0.95, 0.3, 2);

/** Bottom to top, the order they're drawn in. */
function buildModel(): Prism[] {
  const prisms: Prism[] = [];
  // Podium: two storeys of glass with a roof slab.
  const podium = roundedRect(2.7, 2.1, 0.18, 2);
  prisms.push({ footprint: podium, y0: 0, y1: PODIUM_HEIGHT - SLAB, kind: 'podium', seed: 1 });
  prisms.push({ footprint: transformFootprint(podium, 1, 0, 0.03), y0: PODIUM_HEIGHT - SLAB, y1: PODIUM_HEIGHT, kind: 'slab', seed: 0 });

  for (let floor = 0; floor < FLOORS; floor++) {
    const t = floor / (FLOORS - 1);
    const angle = TWIST * t;
    const scale = 1 - 0.16 * t * t; // gentle taper towards the top
    const y = PODIUM_HEIGHT + floor * FLOOR_HEIGHT;
    const crown = floor >= FLOORS - CROWN_FLOORS;
    prisms.push({
      footprint: transformFootprint(TOWER_PLAN, scale, angle),
      y0: y,
      y1: y + FLOOR_HEIGHT - SLAB,
      kind: crown ? 'frame' : 'glass',
      seed: floor * 97 + 13
    });
    prisms.push({
      footprint: transformFootprint(TOWER_PLAN, scale, angle, SLAB_OUTSET),
      y0: y + FLOOR_HEIGHT - SLAB,
      y1: y + FLOOR_HEIGHT,
      kind: 'slab',
      seed: 0
    });
  }
  return prisms;
}

const MODEL = buildModel();
const SIDES: Side[][] = MODEL.map(({ footprint, seed }) =>
  footprint.map(([ax, az], i) => {
    const [bx, bz] = footprint[(i + 1) % footprint.length];
    const length = Math.hypot(bx - ax, bz - az);
    const nx = (bz - az) / length;
    const nz = -(bx - ax) / length;
    const panes = Math.max(1, Math.round(length / 0.13));
    const lit = Array.from({ length: panes }, (_, p) => p).filter((p) => hash(seed + i * 31 + p * 7) > 0.86);
    return { nx, nz, light: Math.max(0, nx * SUN[0] + nz * SUN[2]), panes, lit };
  })
);

/**
 * Opaque mixes of the background and the accent, so each face is one fill instead of two: SHADES[k] is the accent at
 * k / (SHADES.length - 1) opacity over the background.
 */
const SHADES = Array.from({ length: 48 }, (_, k) => {
  const t = k / 47;
  const [r0, g0, b0] = BACKGROUND.split(',').map(Number);
  const [r1, g1, b1] = ACCENT.split(',').map(Number);
  return `rgb(${Math.round(r0 + (r1 - r0) * t)}, ${Math.round(g0 + (g1 - g0) * t)}, ${Math.round(b0 + (b1 - b0) * t)})`;
});
const SLAB_TOP = SHADES[Math.round(47 * (0.1 + SUN[1] * 0.08))];
const shade = (opacity: number) => SHADES[Math.max(0, Math.min(47, Math.round(opacity * 47)))];
const TOP = PODIUM_HEIGHT + FLOORS * FLOOR_HEIGHT;
const MODEL_CENTER_Y = (TOP + MAST * 0.5) / 2;


/** Trees on the plaza: [x, z, radius]. */
const TREES: [number, number, number][] = [
  [-1.75, 1.35, 0.17], [-1.1, 1.55, 0.14], [0.35, 1.6, 0.16], [1.55, 1.4, 0.18], [1.85, 0.4, 0.13],
  [1.7, -0.9, 0.16], [0.6, -1.5, 0.15], [-0.7, -1.55, 0.17], [-1.85, -0.6, 0.15], [-1.9, 0.5, 0.12]
];

function convexHull(points: Point[]): Point[] {
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (const p of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Shadow of the tower on the ground: convex hull of every floor's footprint pushed away from the sun. */
const SHADOW: Point[] = convexHull(
  MODEL.filter((prism) => prism.kind !== 'podium').flatMap((prism) =>
    prism.footprint.map(([x, z]): Point => [x - (SUN[0] / SUN[1]) * prism.y1, z - (SUN[2] / SUN[1]) * prism.y1])
  )
);

const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---- Drawing ----------------------------------------------------------------------------------------------------

function draw(context: CanvasRenderingContext2D, width: number, height: number, angle: number) {
  context.clearRect(0, 0, width, height);
  const scale = Math.min(width, height) / 6.1;
  const cx = width / 2;
  const cy = height * 0.5;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const cosT = Math.cos(TILT);
  const sinT = Math.sin(TILT);
  const distance = 11;

  // Model space -> camera space (turn about y, then tilt about x) -> screen.
  const toCamera = (x: number, y: number, z: number): Vec => {
    const rx = x * cosA + z * sinA;
    const rz = -x * sinA + z * cosA;
    const ry = y - MODEL_CENTER_Y;
    return [rx, ry * cosT - rz * sinT, ry * sinT + rz * cosT];
  };
  const project = ([x, y, z]: Vec): Point => {
    const perspective = distance / (distance - z);
    return [cx + x * scale * perspective, cy - y * scale * perspective];
  };
  const at = (x: number, y: number, z: number) => project(toCamera(x, y, z));
  const polygon = (points: Point[]) => {
    context.beginPath();
    points.forEach(([x, y], i) => (i ? context.lineTo(x, y) : context.moveTo(x, y)));
    context.closePath();
  };
  /** How directly a horizontal model-space normal faces the camera (> 0 = towards it). */
  const facing = (nx: number, nz: number) => (-nx * sinA + nz * cosA) * cosT;
  const sunlight = (nx: number, ny: number, nz: number) => Math.max(0, nx * SUN[0] + ny * SUN[1] + nz * SUN[2]);

  // Ground: drafting grid fading out from the centre. Each line is cut into short pieces bucketed by brightness, so it
  // takes a handful of strokes and no full-canvas blending.
  const extent = 3;
  const step = 0.3;
  const pieces = 8;
  const levels = Array.from({ length: 5 }, () => new Path2D());
  for (let i = -extent; i <= extent + 1e-6; i += step) {
    for (let k = 0; k < pieces; k++) {
      const u0 = -extent + (2 * extent * k) / pieces;
      const u1 = -extent + (2 * extent * (k + 1)) / pieces;
      const fade = 1 - Math.hypot(i, (u0 + u1) / 2) / extent;
      if (fade <= 0) continue;
      const level = levels[Math.min(4, Math.floor(fade * 5))];
      for (const [a, b] of [
        [at(i, 0, u0), at(i, 0, u1)],
        [at(u0, 0, i), at(u1, 0, i)]
      ]) {
        level.moveTo(a[0], a[1]);
        level.lineTo(b[0], b[1]);
      }
    }
  }
  context.lineWidth = 1;
  levels.forEach((path, level) => {
    context.strokeStyle = `rgba(${ACCENT}, ${(0.17 * (level + 0.5)) / 5})`;
    context.stroke(path);
  });
  polygon(SHADOW.map(([x, z]) => at(x, 0, z)));
  context.fillStyle = 'rgba(0, 0, 0, 0.38)';
  context.fill();

  // Trees behind the building first, the rest after it.
  const trees = TREES.map(([x, z, r]) => ({ x, z, r, depth: toCamera(x, r, z)[2] }));
  const drawTree = ({ x, z, r }: { x: number; z: number; r: number }) => {
    const [bx, by] = at(x, 0, z);
    const [tx, ty] = at(x, r * 1.15, z);
    context.strokeStyle = `rgba(${ACCENT}, 0.4)`;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(bx, by);
    context.lineTo(tx, ty);
    context.stroke();
    // Canopy: three overlapping lobes, the sunlit one brightest.
    const radius = r * scale * 0.7;
    const lobes: [number, number, number, number][] = [
      [-0.55, 0.15, 0.85, 0.06],
      [0.55, 0.1, 0.8, 0.1],
      [0, -0.45, 0.95, 0.16]
    ];
    for (const [ox, oy, size, glow] of lobes) {
      context.beginPath();
      context.arc(tx + ox * radius, ty - radius * 0.55 + oy * radius, radius * size, 0, Math.PI * 2);
      context.fillStyle = `rgba(${BACKGROUND}, 0.95)`;
      context.fill();
      context.fillStyle = `rgba(${ACCENT}, ${glow})`;
      context.fill();
      context.strokeStyle = `rgba(${ACCENT}, 0.45)`;
      context.stroke();
    }
  };
  trees.filter((tree) => tree.depth < 0).forEach(drawTree);

  MODEL.forEach((prism, index) => drawPrism(prism, SIDES[index]));

  // Mast with an aircraft warning light.
  const [mx0, my0] = at(0, TOP, 0);
  const [mx1, my1] = at(0, TOP + MAST, 0);
  context.strokeStyle = `rgba(${ACCENT}, 0.9)`;
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(mx0, my0);
  context.lineTo(mx1, my1);
  for (const f of [0.35, 0.65]) {
    const [rx, ry] = at(0, TOP + MAST * f, 0);
    context.moveTo(rx - 3, ry);
    context.lineTo(rx + 3, ry);
  }
  context.stroke();
  context.beginPath();
  context.arc(mx1, my1, 2.2, 0, Math.PI * 2);
  context.fillStyle = `rgba(${WARM}, 0.95)`;
  context.fill();

  trees.filter((tree) => tree.depth >= 0).forEach(drawTree);

  function drawPrism({ footprint, y0, y1, kind }: Prism, sides: Side[]) {
    const n = footprint.length;
    const bottom = footprint.map(([x, z]) => at(x, y0, z));
    const top = footprint.map(([x, z]) => at(x, y1, z));
    // Faces of one convex prism never overlap, so lines and lit windows are batched into one path each.
    const lines = new Path2D();
    const windows = new Path2D();

    for (let i = 0; i < n; i++) {
      const { nx, nz, light, panes, lit } = sides[i];
      const towards = facing(nx, nz);
      if (towards <= 0) continue; // faces away: hidden behind the front of a convex prism
      const j = (i + 1) % n;
      const b0 = bottom[i];
      const b1 = bottom[j];
      const t0 = top[i];
      const t1 = top[j];

      if (kind === 'frame') {
        // Open crown: columns only.
        lines.moveTo(b0[0], b0[1]);
        lines.lineTo(t0[0], t0[1]);
        continue;
      }

      polygon([b0, b1, t1, t0]);
      if (kind === 'slab') {
        context.fillStyle = shade(0.32 + light * 0.5);
        context.fill();
        continue;
      }
      // Glass: dark, warmed by the sun, brighter at glancing angles (a cheap Fresnel).
      context.fillStyle = shade(0.07 + light * 0.2 + Math.pow(1 - towards, 3) * 0.28);
      context.fill();

      for (const p of lit) {
        const [ax, ay] = lerp(b0, b1, p / panes);
        const [bx, by] = lerp(b0, b1, (p + 1) / panes);
        const [cx2, cy2] = lerp(t0, t1, (p + 1) / panes);
        const [dx, dy] = lerp(t0, t1, p / panes);
        windows.moveTo(ax, ay);
        windows.lineTo(bx, by);
        windows.lineTo(cx2, cy2);
        windows.lineTo(dx, dy);
        windows.closePath();
      }
      for (let p = 0; p <= panes; p++) {
        const [x0, ys0] = lerp(b0, b1, p / panes);
        const [x1, ys1] = lerp(t0, t1, p / panes);
        lines.moveTo(x0, ys0);
        lines.lineTo(x1, ys1);
      }
      if (kind === 'podium') {
        // A transom between the podium's two storeys.
        const [m0x, m0y] = lerp(b0, t0, 0.5);
        const [m1x, m1y] = lerp(b1, t1, 0.5);
        lines.moveTo(m0x, m0y);
        lines.lineTo(m1x, m1y);
      }
    }

    if (kind !== 'slab') {
      context.fillStyle = `rgba(${WARM}, 0.32)`;
      context.fill(windows);
      context.strokeStyle = kind === 'frame' ? `rgba(${ACCENT}, 0.55)` : `rgba(${ACCENT}, 0.26)`;
      context.lineWidth = kind === 'frame' ? 1 : 0.8;
      context.stroke(lines);
      return;
    }

    // Slab tops: the next floor covers the middle, leaving a rim; slab edges are the strongest lines.
    polygon(top);
    context.fillStyle = SLAB_TOP;
    context.fill();
    context.strokeStyle = `rgba(${ACCENT}, 0.95)`;
    context.lineWidth = 1.1;
    context.stroke();
  }

}

// ---- Component --------------------------------------------------------------------------------------------------

export function HeroBuilding() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;

    let width = 0;
    let height = 0;
    let angle = -0.5;
    let frame = 0;
    let last = 0;
    let visible = true;
    let started = false; // animation waits until the page has loaded, so it doesn't compete with it
    const frameInterval = frameMs();

    const render = () => {
      const ratio = pixelRatio();
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(context, width, height, angle);
    };
    const resize = () => {
      if (!started) return;
      const rect = element.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const ratio = pixelRatio();
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      render();
    };
    const tick = (time: number) => {
      frame = requestAnimationFrame(tick);
      if (last && time - last < frameInterval - 4) return; // the tolerance keeps 60 Hz screens at a steady rate
      if (last) angle += ((time - last) / 1000) * ((Math.PI * 2) / SECONDS_PER_TURN);
      last = time;
      render();
    };
    const update = () => {
      const run = started && visible && !document.hidden;
      if (run && !frame) {
        last = 0;
        frame = requestAnimationFrame(tick);
      } else if (!run && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(element);
    const viewObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    viewObserver.observe(element);
    document.addEventListener('visibilitychange', update);
    // Nothing is drawn until the page has loaded and the browser is idle, so the drawing never competes with the page
    // itself; then it fades in (.hero-visual.is-ready) and starts turning.
    let idle = 0;
    const start = () => {
      const begin = () => {
        started = true;
        resize();
        element.classList.add('is-ready');
        update();
      };
      // Safari has no requestIdleCallback.
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(begin, { timeout: 1500 });
      else idle = window.setTimeout(begin, 300);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });

    return () => {
      cancelAnimationFrame(frame);
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle);
      window.clearTimeout(idle);
      window.removeEventListener('load', start);
      sizeObserver.disconnect();
      viewObserver.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return <canvas ref={canvas} className="hero-visual" aria-hidden="true" />;
}
