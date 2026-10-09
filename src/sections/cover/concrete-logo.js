import { clamp, smoothstep } from '../../shared/math.js';
import { reducedMotion } from '../../shared/motion.js';
import { clipPolygon } from '../../shared/fracture.js';
import { followTouch } from '../../shared/touch.js';

// The logo is modelled in a 180-unit square and rasterised at 3x.
const UNITS = 180, SUPERSAMPLE = 3, N = UNITS * SUPERSAMPLE;
const CELL = 7; // fracture grid step, in units

const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), u = smoothstep(x - ix), v = smoothstep(y - iy);
  return (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v) + (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v;
}

/** Procedural concrete (grain, clouding, aggregate, pores, bevel) cut to the logo silhouette. */
function buildConcreteSurface(logoImage) {
  const mask = document.createElement('canvas');
  mask.width = mask.height = N;
  const mg = mask.getContext('2d', { willReadFrequently: true });
  mg.drawImage(logoImage, 0, 0, N, N);
  const source = mg.getImageData(0, 0, N, N), alpha = new Uint8ClampedArray(N * N);
  for (let i = 0; i < alpha.length; i++) {
    const k = i * 4;
    alpha[i] = source.data[k + 3] * (1 - source.data[k] / 255);
  }
  const at = (x, y) => x < 0 || y < 0 || x >= N || y >= N ? 0 : alpha[y * N + x] / 255;

  const surface = document.createElement('canvas');
  surface.width = surface.height = N;
  const mat = surface.getContext('2d');
  const pixels = mat.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const k = (y * N + x) * 4, a = alpha[y * N + x];
    if (!a) continue;
    const grain = (hash(x + 7, y + 13) - .5) * 19, cloud = (noise(x / 64, y / 64) - .5) * 35, aggregate = (noise(x / 4, y / 4) - .5) * 12;
    const pore = hash(x + 30, y + 42) > .993 ? 32 : 0;
    const bevel = (at(x + 4, y + 4) - at(x - 4, y - 4)) * 35;
    const light = 188 - y / N * 30 + cloud + grain + aggregate + bevel - pore;
    pixels.data[k] = light + 4;
    pixels.data[k + 1] = light + 3;
    pixels.data[k + 2] = light - 3;
    pixels.data[k + 3] = a;
  }
  mat.putImageData(pixels, 0, 0);
  return { surface, alpha };
}

/** Jittered Voronoi fracture cells produce interlocking natural fragments, not square tiles. */
function buildFragments(surface, alpha) {
  const S = SUPERSAMPLE;
  const grid = [], cols = Math.ceil(UNITS / CELL);
  for (let gy = 0; gy < cols; gy++) for (let gx = 0; gx < cols; gx++) {
    grid.push({
      gx, gy,
      x: Math.min(UNITS - 1, (gx + .15 + hash(gx, gy) * .7) * CELL),
      y: Math.min(UNITS - 1, (gy + .15 + hash(gx + 43, gy + 11) * .7) * CELL),
    });
  }

  const fragments = [];
  for (const s of grid) {
    let polygon = [[0, 0], [UNITS, 0], [UNITS, UNITS], [0, UNITS]];
    for (let yy = Math.max(0, s.gy - 2); yy <= Math.min(cols - 1, s.gy + 2); yy++) {
      for (let xx = Math.max(0, s.gx - 2); xx <= Math.min(cols - 1, s.gx + 2); xx++) {
        const q = grid[yy * cols + xx];
        if (q === s) continue;
        const nx = q.x - s.x, ny = q.y - s.y;
        polygon = clipPolygon(polygon, nx, ny, (q.x * q.x + q.y * q.y - s.x * s.x - s.y * s.y) / 2);
      }
    }
    if (polygon.length < 3) continue;
    const left = Math.floor(Math.min(...polygon.map(v => v[0])) * S) / S, top = Math.floor(Math.min(...polygon.map(v => v[1])) * S) / S;
    const right = Math.ceil(Math.max(...polygon.map(v => v[0])) * S) / S, bottom = Math.ceil(Math.max(...polygon.map(v => v[1])) * S) / S;

    // Skip cells that fall entirely outside the logo.
    let occupied = false;
    for (let y = Math.floor(top * S); y < Math.min(N, bottom * S); y += 3) {
      for (let x = Math.floor(left * S); x < Math.min(N, right * S); x += 3) {
        if (alpha[y * N + x] > 50) occupied = true;
      }
    }
    if (!occupied) continue;

    const tile = document.createElement('canvas');
    tile.width = Math.max(1, Math.round((right - left) * S));
    tile.height = Math.max(1, Math.round((bottom - top) * S));
    const tc = tile.getContext('2d');
    tc.beginPath();
    polygon.forEach((v, i) => i ? tc.lineTo((v[0] - left) * S, (v[1] - top) * S) : tc.moveTo((v[0] - left) * S, (v[1] - top) * S));
    tc.closePath();
    tc.clip();
    tc.drawImage(surface, -left * S, -top * S);

    fragments.push({
      x: s.x, y: s.y, polygon, left, top, tile, edge: null,
      seed: hash(s.gx + 2, s.gy + 3) * 6,
      dx: 0, dy: 0, vx: 0, vy: 0, spin: 0, spinVelocity: 0,
      startX: (hash(s.gx + 71, s.gy) - .5) * 850,
      startY: (hash(s.gx, s.gy + 65) - .5) * 700,
    });
  }
  return fragments;
}

/** Dark silhouette of a fragment, drawn offset underneath it to fake thickness. */
function edgeOf(fragment) {
  if (!fragment.edge) {
    const edge = fragment.edge = document.createElement('canvas');
    edge.width = fragment.tile.width;
    edge.height = fragment.tile.height;
    const ec = edge.getContext('2d');
    ec.drawImage(fragment.tile, 0, 0);
    ec.globalCompositeOperation = 'source-in';
    ec.fillStyle = fragment.seed > 3 ? '#55564d' : '#69695e';
    ec.fillRect(0, 0, edge.width, edge.height);
  }
  return fragment.edge;
}

/**
 * Opening logo: a concrete slab that assembles on load, parts around the pointer
 * and scatters as the page scrolls. Returns `isPaused()` for effects sharing the pause button.
 */
export function initConcreteLogo({ cover, runway, pauseButton }) {
  const canvas = cover.querySelector('#cover-particles');
  const fallback = cover.querySelector('.cover-fallback');
  const cx = canvas.getContext('2d');
  const cursor = { x: 0, y: 0, active: false };
  let fragments = [], surface = null;
  let paused = reducedMotion.matches, visible = true, formed = 0, rafId = 0, lastFrame = 0;

  function resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    const now = performance.now(), dt = Math.min(.034, Math.max(.001, (now - (lastFrame || now - 16.67)) / 1000));
    lastFrame = now;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    cx.clearRect(0, 0, w, h);
    if (!surface) return;

    const scrollOut = clamp(((window.scrollY - runway.offsetTop) / h - .15) / 1.05);
    const spread = reducedMotion.matches || paused ? 0 : scrollOut * scrollOut;
    const size = Math.min(430, w * .72, h * .48), scale = size / UNITS, left = (w - size) / 2, top = h * .4 - size / 2;
    const opacity = 1 - scrollOut * scrollOut;
    fallback.style.opacity = '0';
    formed = paused ? 1 : Math.min(1, formed + dt * 1.08);
    const arrival = (1 - formed) ** 3;
    const moving = [];

    // One uninterrupted textured solid at rest; fracture boundaries are invisible until it breaks.
    cx.globalAlpha = 1;
    cx.drawImage(surface, left, top, size, size);

    const activity = cursor.active && !paused ? 1 : 0;
    for (const p of fragments) {
      const bx = left + p.x * scale, by = top + p.y * scale;
      // Pointer repulsion target, with a little curl so fragments do not move radially in lockstep.
      let tx = 0, ty = 0;
      const vx = bx - cursor.x, vy = by - cursor.y, d = Math.hypot(vx, vy), radius = size * .675;
      if (activity && d < radius) {
        const influence = (1 - d / radius) ** 1.8, force = influence * (165 + p.seed * 10) * activity;
        const angle = Math.atan2(vy, vx) + Math.sin(p.x * .045 + p.y * .035) * .24 + Math.sin(p.seed * 8) * .12;
        const curl = Math.sin(p.x * .03 - p.y * .025) * influence * 13 * activity;
        tx = Math.cos(angle) * force - Math.sin(angle) * curl;
        ty = Math.sin(angle) * force + Math.cos(angle) * curl;
      }
      // Critically damped spring toward the target, integrated in two substeps.
      const stiffness = 165 / (.85 + p.seed * .045), damping = 2.05 * Math.sqrt(stiffness);
      const returnAngle = Math.min(1, Math.hypot(tx, ty) / 110) * Math.sin(p.seed * 5) * .65;
      for (let sub = 0; sub < 2; sub++) {
        const step = dt / 2;
        p.vx += ((tx - p.dx) * stiffness - p.vx * damping) * step;
        p.vy += ((ty - p.dy) * stiffness - p.vy * damping) * step;
        p.dx += p.vx * step;
        p.dy += p.vy * step;
        p.spinVelocity += ((returnAngle - p.spin) * 145 - p.spinVelocity * 25) * step;
        p.spin += p.spinVelocity * step;
      }
      if (activity < .0001 && Math.hypot(p.dx, p.dy) < .075 && Math.hypot(p.vx, p.vy) < .45) {
        p.dx = p.dy = p.vx = p.vy = p.spin = p.spinVelocity = 0;
      }
      // Add the load-in arrival and the scroll-out scatter on top of the spring offset.
      const angle = Math.atan2(p.y - UNITS / 2, p.x - UNITS / 2) + Math.sin(p.seed) * .3, distance = spread * (Math.max(w, h) * 1.1 + p.seed * 80);
      const dx = (paused ? 0 : p.dx) + p.startX * arrival + Math.cos(angle) * distance, dy = (paused ? 0 : p.dy) + p.startY * arrival + Math.sin(angle) * distance;
      const displacement = Math.hypot(dx, dy);
      if (displacement < .075) continue;
      moving.push({ p, bx, by, dx, dy, lift: Math.min(1, displacement / 45), rotation: (paused ? 0 : p.spin) + Math.min(1, arrival + spread) * Math.sin(p.seed * 5) });
    }

    // Lift each irregular cell from the same material surface, preserving its exact original texture.
    cx.save();
    cx.globalCompositeOperation = 'destination-out';
    cx.globalAlpha = 1;
    cx.fillStyle = '#000';
    cx.strokeStyle = '#000';
    cx.lineWidth = .9;
    cx.lineJoin = 'round';
    cx.beginPath();
    for (const m of moving) {
      m.p.polygon.forEach((v, i) => {
        const x = left + v[0] * scale, y = top + v[1] * scale;
        i ? cx.lineTo(x, y) : cx.moveTo(x, y);
      });
      cx.closePath();
    }
    cx.fill();
    cx.stroke();
    cx.restore();
    cx.globalCompositeOperation = 'source-over';

    for (const m of moving) {
      const p = m.p, edge = edgeOf(p);
      cx.save();
      cx.translate(m.bx + m.dx, m.by + m.dy);
      cx.rotate(m.rotation);
      const x = (p.left - p.x) * scale, y = (p.top - p.y) * scale, tileW = p.tile.width / SUPERSAMPLE * scale, tileH = p.tile.height / SUPERSAMPLE * scale;
      const depth = m.lift * (1.2 + Math.min(tileW, tileH) * .12);
      cx.shadowColor = '#02030299';
      cx.shadowBlur = 1 + m.lift * 5;
      cx.shadowOffsetY = .2 + m.lift * 3;
      cx.shadowOffsetX = m.lift;
      cx.drawImage(edge, x + depth * .4, y + depth, tileW, tileH);
      cx.shadowColor = 'transparent';
      cx.drawImage(edge, x + depth * .2, y + depth * .5, tileW, tileH);
      cx.drawImage(p.tile, x, y, tileW, tileH);
      cx.restore();
      // A few fragments shed a speck of dust.
      if (p.seed > 4.9) {
        cx.globalAlpha = Math.min(1, Math.hypot(m.dx, m.dy) / 100) * .24;
        cx.fillStyle = '#bebbb0';
        cx.fillRect(m.bx + m.dx + Math.sin(p.seed) * 9, m.by + m.dy + Math.cos(p.seed * 2) * 10, 1, .6);
        cx.globalAlpha = 1;
      }
    }

    // Apply the departure opacity once, after compositing the solid and its fragments.
    if (opacity < 1) {
      cx.globalCompositeOperation = 'destination-in';
      cx.globalAlpha = opacity;
      cx.fillStyle = '#fff';
      cx.fillRect(0, 0, w, h);
      cx.globalAlpha = 1;
      cx.globalCompositeOperation = 'source-over';
    }
    if (!paused && visible && document.visibilityState === 'visible') rafId = requestAnimationFrame(draw);
  }

  /** Restarts the loop (or draws a single frame while paused) and syncs the pause button. */
  function refresh() {
    cancelAnimationFrame(rafId);
    pauseButton.textContent = paused ? 'Activar efecto' : 'Pausar efecto';
    pauseButton.setAttribute('aria-pressed', paused);
    draw();
  }

  const logoImage = new Image();
  logoImage.onload = () => {
    const built = buildConcreteSurface(logoImage);
    surface = built.surface;
    fragments = buildFragments(built.surface, built.alpha);
    resize();
    refresh();
  };
  logoImage.src = fallback.src;

  function pointAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    cursor.x = clientX - r.left;
    cursor.y = clientY - r.top;
    cursor.active = true;
  }
  // Mouse and pen come through pointer events; fingers through followTouch.
  cover.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') pointAt(e.clientX, e.clientY); });
  cover.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') cursor.active = false; });
  followTouch(cover, pointAt, () => { cursor.active = false; });
  pauseButton.onclick = () => { paused = !paused; refresh(); };
  reducedMotion.addEventListener('change', e => { paused = e.matches; refresh(); });
  // While paused there is no loop, so scroll has to repaint the fade-out itself.
  window.addEventListener('scroll', () => { if (paused && visible) refresh(); }, { passive: true });
  window.addEventListener('resize', () => { resize(); refresh(); });
  document.addEventListener('visibilitychange', refresh);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    refresh();
  }, { threshold: .15 }).observe(cover);

  return { isPaused: () => paused };
}
