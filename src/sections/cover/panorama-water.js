import { clamp, smoothRange } from '../../shared/math.js';
import { reducedMotion } from '../../shared/motion.js';

const FRAME_INTERVAL = 40; // ms, ~25fps is plenty for slow ripples

const PAUSE_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3h3v14H5zm7 0h3v14h-3z"/></svg>';
const PLAY_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.7v14.6L17 10z"/></svg>';

// Travelling waves as sin(col * u + row * v + speed * t), with u, v in pixels of a 724px-tall panorama:
// horizontal drift, vertical chop, and two shimmer layers.
const WAVES = [
  { col: .031, row: .019, speed: .78 },
  { col: .082, row: -.031, speed: -.82 },
  { col: .027, row: .046, speed: 1.33 },
  { col: .069, row: -.031, speed: -.89 },
];
const SWELL_COL = .044; // vertical swell that only varies along x

const isBlue = (r, g, b) => smoothRange(0, 18, Math.min(b - r - 10, b - g - 2)) * smoothRange(44, 82, g);

/**
 * Ripples the pool water of the painted panorama and adds a floating pause button.
 * Returns `show(panorama, painted)` to point it at a panorama (see PANORAMAS in panorama.js) once
 * the `painted` promise from paintPanorama() resolves, and `resample()` for later repaints.
 */
export function initWater({ canvas, welcome }) {
  // Pool rectangle of the current panorama, and S: its pixels per pixel of the 724px-tall reference.
  let X0 = 0, Y0 = 0, w = 0, h = 0, S = 1, panoramaWidth = 1;
  let colSin = [], colCos = [], swellColSin = null, swellColCos = null;
  const rowSin = new Float64Array(WAVES.length), rowCos = new Float64Array(WAVES.length);
  let source = null, frame = null, mask = null, active = true, visible = false, last = 0, time = 0;
  let looping = false, shown = 0;

  function configure(panorama) {
    ({ x: X0, y: Y0, width: w, height: h } = panorama.pool);
    S = panorama.height / 724;
    panoramaWidth = panorama.width;
    // Column parts of every wave, computed once per panorama.
    const table = fn => Float64Array.from({ length: w }, (_, x) => fn(x / S));
    colSin = WAVES.map(wave => table(u => Math.sin(wave.col * u)));
    colCos = WAVES.map(wave => table(u => Math.cos(wave.col * u)));
    swellColSin = table(u => Math.sin(SWELL_COL * u));
    swellColCos = table(u => Math.cos(SWELL_COL * u));
    source = frame = mask = null;
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'water-motion-toggle';
  button.title = 'Pausar movimiento del agua';
  button.setAttribute('aria-label', button.title);
  button.innerHTML = PAUSE_ICON;
  button.hidden = true;
  document.body.appendChild(button);

  // Only offer the button while the pool is actually on screen.
  function updateButton() {
    if (reducedMotion.matches) { button.hidden = true; return; }
    const rect = canvas.getBoundingClientRect();
    const waterLeft = rect.left + rect.width * (X0 / panoramaWidth);
    const host = welcome.getBoundingClientRect();
    button.hidden = !(host.bottom > 0 && host.top < innerHeight && waterLeft < innerWidth - 70 && rect.right > innerWidth * .55);
  }

  function restoreStill() {
    if (source) canvas.getContext('2d').putImageData(source, X0, Y0);
  }

  /** Takes the pool as currently painted as the still image the ripples are sampled from. */
  function sample() {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    source = ctx.getImageData(X0, Y0, w, h);
    frame = ctx.createImageData(w, h);
    mask = new Float32Array(w * h);
    for (let p = 0; p < w * h; p++) {
      const i = p * 4;
      mask[p] = isBlue(source.data[i], source.data[i + 1], source.data[i + 2]);
    }
  }

  function tick(now) {
    requestAnimationFrame(tick);
    if (!source || !active || !visible || document.hidden || reducedMotion.matches || now - last < FRAME_INTERVAL) return;
    const dt = last ? Math.min(now - last, 80) : FRAME_INTERVAL;
    last = now;
    time += dt * .001;
    const src = source.data, dst = frame.data, ctx = canvas.getContext('2d');
    // Each wave is sin(column part + row part); with the column parts tabulated, a row only needs
    // the sine and cosine of its own part, and no pixel calls Math.sin.
    const swellCos = Math.cos(time * .66), swellSin = Math.sin(time * .66);
    for (let y = 0; y < h; y++) {
      const v = y / S;
      const flow = 2.3 * Math.sin(v * .057 + time * .91) + 1.1 * Math.sin(v * .117 - time * .61);
      for (let k = 0; k < WAVES.length; k++) {
        const phase = WAVES[k].row * v + WAVES[k].speed * time;
        rowSin[k] = Math.sin(phase);
        rowCos[k] = Math.cos(phase);
      }
      for (let x = 0; x < w; x++) {
        const p = y * w + x, i = p * 4, m = mask[p];
        if (m < .05) { dst[i] = src[i]; dst[i + 1] = src[i + 1]; dst[i + 2] = src[i + 2]; dst[i + 3] = 255; continue; }
        const drift = colSin[0][x] * rowCos[0] + colCos[0][x] * rowSin[0];
        const chop = colSin[1][x] * rowCos[1] + colCos[1][x] * rowSin[1];
        const dx = S * (flow + 0.7 * drift);
        const dy = S * (1.6 * (swellColSin[x] * swellCos + swellColCos[x] * swellSin) + 0.65 * chop);
        const sx = clamp(x + dx, 0, w - 1.001), sy = clamp(y + dy, 0, h - 1.001);
        const xa = Math.floor(sx), ya = Math.floor(sy), tx = sx - xa, ty = sy - ya;
        const p00 = ya * w + xa, p10 = p00 + 1, p01 = p00 + w, p11 = p01 + 1;
        // Never pull deck or coping pixels into the water.
        const sampleWater = Math.min(mask[p00], mask[p10], mask[p01], mask[p11]) > .15;
        const glimmer = 1 + .017 * (colSin[2][x] * rowCos[2] + colCos[2][x] * rowSin[2]) + .012 * (colSin[3][x] * rowCos[3] + colCos[3][x] * rowSin[3]);
        const strength = m * .88;
        for (let c = 0; c < 3; c++) {
          const sample = sampleWater
            ? ((src[p00 * 4 + c] * (1 - tx) + src[p10 * 4 + c] * tx) * (1 - ty) + (src[p01 * 4 + c] * (1 - tx) + src[p11 * 4 + c] * tx) * ty)
            : src[i + c];
          dst[i + c] = clamp(src[i + c] * (1 - strength) + sample * glimmer * strength, 0, 255);
        }
        dst[i + 3] = 255;
      }
    }
    ctx.putImageData(frame, X0, Y0);
  }

  new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    if (visible) last = 0;
  }, { threshold: .01 }).observe(welcome);

  button.addEventListener('click', () => {
    active = !active;
    button.title = active ? 'Pausar movimiento del agua' : 'Reanudar movimiento del agua';
    button.setAttribute('aria-label', button.title);
    button.innerHTML = active ? PAUSE_ICON : PLAY_ICON;
    if (!active) restoreStill();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) restoreStill();
    updateButton();
  });
  window.addEventListener('scroll', updateButton, { passive: true });
  window.addEventListener('resize', updateButton, { passive: true });

  return {
    show(panorama, painted) {
      const current = ++shown;
      configure(panorama);
      painted.then(ok => {
        if (!ok || current !== shown) return; // failed, or another panorama was requested meanwhile
        sample();
        updateButton();
        if (!looping) { looping = true; requestAnimationFrame(tick); }
      });
    },
    // Call after the canvas is repainted with a sharper version of the same panorama.
    resample() { if (source) sample(); },
  };
}
