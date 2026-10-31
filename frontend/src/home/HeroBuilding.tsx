import { useEffect, useRef } from 'react';

// Decorative hero graphic: a slowly turning architectural massing model drawn as gold line work on a drafting grid.
// Plain canvas 2D (no 3D library): a handful of boxes, rotated, projected and drawn back to front. Pauses when off
// screen or in a background tab; a still frame for prefers-reduced-motion.

type Vec = [number, number, number];

interface Face {
  corners: Vec[];
  /** Detail lines lying on the face (floor lines, mullions), drawn after its fill so nearer faces hide them. */
  lines: [Vec, Vec][];
  normal: Vec;
}

/**
 * Faces of a box from (x0, y0, z0) to (x1, y1, z1), y up. floors: spacing of horizontal lines on the walls;
 * mullions: number of vertical divisions per wall.
 */
function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, floors = 0, mullions = 0): Face[] {
  const walls: { corners: Vec[]; normal: Vec; along: (t: number, y: number) => Vec }[] = [
    { corners: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], normal: [0, 0, 1], along: (t, y) => [x0 + (x1 - x0) * t, y, z1] },
    { corners: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], normal: [0, 0, -1], along: (t, y) => [x1 - (x1 - x0) * t, y, z0] },
    { corners: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], normal: [1, 0, 0], along: (t, y) => [x1, y, z1 - (z1 - z0) * t] },
    { corners: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], normal: [-1, 0, 0], along: (t, y) => [x0, y, z0 + (z1 - z0) * t] }
  ];
  const faces: Face[] = walls.map(({ corners, normal, along }) => {
    const lines: [Vec, Vec][] = [];
    if (floors > 0) for (let y = y0 + floors; y < y1 - 1e-6; y += floors) lines.push([along(0, y), along(1, y)]);
    for (let i = 1; i < mullions; i++) lines.push([along(i / mullions, y0), along(i / mullions, y1)]);
    return { corners, normal, lines };
  });
  faces.push({ corners: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], normal: [0, 1, 0], lines: [] });
  return faces;
}

// The model, roughly centred on the origin; units are arbitrary. Blocks are drawn layer by layer (the camera is always
// above, so lower blocks first), blocks within a layer far to near, and each block's faces far to near. Blocks must
// not intersect.
const MODEL: { layer: number; faces: Face[] }[] = [
  { layer: 0, faces: box(-1.5, 0, -1.0, 1.5, 0.55, 1.0, 0.275, 8) }, // podium
  { layer: 1, faces: box(-0.75, 0.55, -0.6, 0.55, 3.35, 0.6, 0.2, 5) }, // tower
  // Cantilevered upper block on the tower's side; the face against the tower is left out.
  { layer: 1, faces: box(0.55, 2.15, -0.75, 1.75, 2.75, 0.75, 0.2, 5).filter((face) => face.normal[0] !== -1) },
  { layer: 2, faces: box(-0.45, 3.35, -0.3, 0.2, 3.6, 0.3) } // rooftop plant
];
const MODEL_CENTER_Y = 1.8;

const ACCENT = '217, 183, 126';
const BACKGROUND = '15, 16, 19';
const SECONDS_PER_TURN = 36;
const FRAME_MS = 1000 / 30; // a slow turn needs no more than 30 fps
const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);
const TILT = 0.38; // camera looks down by about 22 degrees
const LIGHT: Vec = normalize([-0.5, 0.7, 0.6]);

function normalize([x, y, z]: Vec): Vec {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}

function draw(context: CanvasRenderingContext2D, width: number, height: number, angle: number) {
  context.clearRect(0, 0, width, height);
  const scale = Math.min(width, height) / 5.4;
  const cx = width / 2;
  const cy = height * 0.53;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const cosT = Math.cos(TILT);
  const sinT = Math.sin(TILT);
  const distance = 9;

  // Model space -> camera space (turn about y, then tilt about x).
  const toCamera = ([x, y, z]: Vec): Vec => {
    const rx = x * cosA + z * sinA;
    const rz = -x * sinA + z * cosA;
    const ry = y - MODEL_CENTER_Y;
    return [rx, ry * cosT - rz * sinT, ry * sinT + rz * cosT];
  };
  const project = ([x, y, z]: Vec): [number, number] => {
    const perspective = distance / (distance - z);
    return [cx + x * scale * perspective, cy - y * scale * perspective];
  };
  const point = (v: Vec) => project(toCamera(v));

  // Drafting grid on the ground, fading towards its edge.
  const extent = 2.6;
  const step = 0.325;
  context.lineWidth = 1;
  for (let i = -extent; i <= extent + 1e-6; i += step) {
    for (const [a, b] of [
      [[i, 0, -extent], [i, 0, extent]],
      [[-extent, 0, i], [extent, 0, i]]
    ] as [Vec, Vec][]) {
      const fade = 1 - Math.abs(i) / (extent + step);
      const [ax, ay] = point(a);
      const [bx, by] = point(b);
      const gradient = context.createLinearGradient(ax, ay, bx, by);
      gradient.addColorStop(0, `rgba(${ACCENT}, 0)`);
      gradient.addColorStop(0.5, `rgba(${ACCENT}, ${0.16 * fade})`);
      gradient.addColorStop(1, `rgba(${ACCENT}, 0)`);
      context.strokeStyle = gradient;
      context.beginPath();
      context.moveTo(ax, ay);
      context.lineTo(bx, by);
      context.stroke();
    }
  }

  // Back to front (see MODEL): dark fill hides what's behind, light from the upper left, then edges and details.
  const depthOf = (points: Vec[]) => points.reduce((sum, [, , z]) => sum + z, 0) / points.length;
  const faces = MODEL.map(({ layer, faces }) => {
    const projected = faces
      .map((face) => {
        const camera = face.corners.map(toCamera);
        return { face, camera, depth: depthOf(camera) };
      })
      .sort((a, b) => a.depth - b.depth);
    return { layer, projected, depth: depthOf(projected.flatMap(({ camera }) => camera)) };
  })
    .sort((a, b) => a.layer - b.layer || a.depth - b.depth)
    .flatMap(({ projected }) => projected);

  for (const { face, camera } of faces) {
    const [nx, ny, nz] = face.normal;
    const turned: Vec = [nx * cosA + nz * sinA, ny, -nx * sinA + nz * cosA];
    const light = Math.max(0, turned[0] * LIGHT[0] + turned[1] * LIGHT[1] + turned[2] * LIGHT[2]);
    const facing = turned[1] * sinT + turned[2] * cosT > 0; // towards the camera

    context.beginPath();
    camera.forEach((v, i) => {
      const [x, y] = project(v);
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.fillStyle = `rgba(${BACKGROUND}, 0.94)`;
    context.fill();
    context.fillStyle = `rgba(${ACCENT}, ${0.03 + light * 0.11})`;
    context.fill();

    if (face.lines.length) {
      context.lineWidth = 1;
      context.strokeStyle = `rgba(${ACCENT}, ${facing ? 0.22 + light * 0.18 : 0.08})`;
      context.beginPath();
      for (const [a, b] of face.lines) {
        const [ax, ay] = point(a);
        const [bx, by] = point(b);
        context.moveTo(ax, ay);
        context.lineTo(bx, by);
      }
      context.stroke();
    }

    context.lineWidth = 1.4;
    context.strokeStyle = `rgba(${ACCENT}, ${facing ? 0.75 + light * 0.25 : 0.25})`;
    context.lineJoin = 'round';
    context.beginPath();
    camera.forEach((v, i) => {
      const [x, y] = project(v);
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.stroke();
  }
}

export function HeroBuilding() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let angle = -0.6;
    let frame = 0;
    let last = 0;
    let visible = true;
    let started = false; // animation waits until the page has loaded, so it doesn't compete with it

    const render = () => {
      const ratio = pixelRatio();
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(context, width, height, angle);
    };
    const resize = () => {
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
      if (last && time - last < FRAME_MS - 4) return; // the tolerance keeps 60 Hz screens at a steady 30
      if (last) angle += ((time - last) / 1000) * ((Math.PI * 2) / SECONDS_PER_TURN);
      last = time;
      render();
    };
    const update = () => {
      const run = started && visible && !document.hidden && !still.matches;
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
    still.addEventListener('change', update);
    resize();
    const start = () => {
      started = true;
      update();
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('load', start);
      sizeObserver.disconnect();
      viewObserver.disconnect();
      document.removeEventListener('visibilitychange', update);
      still.removeEventListener('change', update);
    };
  }, []);

  return <canvas ref={canvas} className="hero-visual" aria-hidden="true" />;
}
