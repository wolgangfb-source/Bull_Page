import { clamp, smoothRange } from '../../shared/math.js';
import { reducedMotion } from '../../shared/motion.js';

// Pool region inside the 2172px-wide panorama.
const X0 = 1615, Y0 = 198, POOL_W = 557, POOL_H = 326, PANORAMA_W = 2172;
const FRAME_INTERVAL = 40; // ms, ~25fps is plenty for slow ripples

const PAUSE_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3h3v14H5zm7 0h3v14h-3z"/></svg>';
const PLAY_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.7v14.6L17 10z"/></svg>';

const isBlue = (r, g, b) => smoothRange(0, 18, Math.min(b - r - 10, b - g - 2)) * smoothRange(44, 82, g);

/**
 * Ripples the pool water of the painted panorama and adds a floating pause button.
 * `painted` is the promise from paintPanorama(); the water is sampled from its final pixels.
 */
export function initWater({ canvas, welcome, painted }) {
  const w = POOL_W, h = POOL_H;
  let source = null, frame = null, mask = null, active = true, visible = false, last = 0, time = 0;

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
    const waterLeft = rect.left + rect.width * (X0 / PANORAMA_W);
    const host = welcome.getBoundingClientRect();
    button.hidden = !(host.bottom > 0 && host.top < innerHeight && waterLeft < innerWidth - 70 && rect.right > innerWidth * .55);
  }

  function restoreStill() {
    if (source) canvas.getContext('2d').putImageData(source, X0, Y0);
  }

  function prepare() {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    source = ctx.getImageData(X0, Y0, w, h);
    frame = ctx.createImageData(w, h);
    mask = new Float32Array(w * h);
    for (let p = 0; p < w * h; p++) {
      const i = p * 4;
      mask[p] = isBlue(source.data[i], source.data[i + 1], source.data[i + 2]);
    }
    updateButton();
    if (!reducedMotion.matches) requestAnimationFrame(tick);
  }

  function tick(now) {
    requestAnimationFrame(tick);
    if (!active || !visible || document.hidden || reducedMotion.matches || now - last < FRAME_INTERVAL) return;
    const dt = last ? Math.min(now - last, 80) : FRAME_INTERVAL;
    last = now;
    time += dt * .001;
    const src = source.data, dst = frame.data, ctx = canvas.getContext('2d');
    for (let y = 0; y < h; y++) {
      const flowA = Math.sin(y * .057 + time * .91), flowB = Math.sin(y * .117 - time * .61);
      for (let x = 0; x < w; x++) {
        const p = y * w + x, i = p * 4, m = mask[p];
        if (m < .05) { dst[i] = src[i]; dst[i + 1] = src[i + 1]; dst[i + 2] = src[i + 2]; dst[i + 3] = 255; continue; }
        const dx = 2.3 * flowA + 1.1 * flowB + 0.7 * Math.sin(x * .031 + y * .019 + time * .78);
        const dy = 1.6 * Math.sin(x * .044 + time * .66) + 0.65 * Math.sin(x * .082 - y * .031 - time * .82);
        const sx = clamp(x + dx, 0, w - 1.001), sy = clamp(y + dy, 0, h - 1.001);
        const xa = Math.floor(sx), ya = Math.floor(sy), tx = sx - xa, ty = sy - ya;
        const p00 = ya * w + xa, p10 = p00 + 1, p01 = p00 + w, p11 = p01 + 1;
        // Never pull deck or coping pixels into the water.
        const sampleWater = Math.min(mask[p00], mask[p10], mask[p01], mask[p11]) > .15;
        const glimmer = 1 + .017 * Math.sin(x * .027 + y * .046 + time * 1.33) + .012 * Math.sin(x * .069 - y * .031 - time * .89);
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

  painted.then(ok => { if (ok) prepare(); });
}
