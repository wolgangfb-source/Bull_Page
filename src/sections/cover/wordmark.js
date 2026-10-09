import { reducedMotion } from '../../shared/motion.js';
import { clipPolygon } from '../../shared/fracture.js';

const random = n => {
  const v = Math.sin(n * 127.1 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * The second-stage wordmark stays whole and responds to hover like the concrete dog.
 * `isPaused` and `pauseButton` come from the cover's shared pause control; `onReady` fires
 * once the canvas version can replace the plain image.
 * Returns `render(isReduced)` for the timeline and `isReady()`.
 */
export function initWordmark({ mark, isPaused, pauseButton, onReady }) {
  const img = mark.querySelector('.welcome-bull-logo');
  const canvas = mark.querySelector('.welcome-logo-particles');
  const ctx = canvas.getContext('2d');

  let width = 0, height = 0, logoWidth = 0, logoHeight = 0, bleed = 0, quality = 2, surface = null;
  let shards = [], reduced = false, ready = false, frame = 0, lastFrame = 0;
  const cursor = { x: 0, y: 0, active: false };

  function polygonPath(poly) {
    ctx.beginPath();
    poly.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
  }

  /** Sizes the canvas (logo box plus a bleed margin for travelling shards) and cuts the shards. */
  function prepare() {
    logoWidth = Math.max(1, mark.clientWidth);
    logoHeight = Math.max(1, mark.clientHeight);
    bleed = Math.max(105, Math.min(170, logoWidth * .48));
    width = logoWidth + bleed * 2;
    height = logoHeight + bleed * 2;
    canvas.style.left = `${-bleed}px`;
    canvas.style.top = `${-bleed}px`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    quality = logoWidth > 900 ? 1 : Math.min(2, Math.max(1, devicePixelRatio || 1));
    canvas.width = Math.round(width * quality);
    canvas.height = Math.round(height * quality);
    ctx.setTransform(quality, 0, 0, quality, 0, 0);

    const mask = document.createElement('canvas');
    mask.width = canvas.width;
    mask.height = canvas.height;
    const mc = mask.getContext('2d', { willReadFrequently: true });
    mc.drawImage(img, bleed * quality, bleed * quality, logoWidth * quality, logoHeight * quality);
    const source = mc.getImageData(0, 0, mask.width, mask.height).data;

    // Near-black silhouette; the white glow comes from the CSS drop-shadows on the canvas.
    surface = document.createElement('canvas');
    surface.width = mask.width;
    surface.height = mask.height;
    const sc = surface.getContext('2d');
    const pixels = sc.createImageData(mask.width, mask.height);
    for (let k = 0; k < pixels.data.length; k += 4) {
      pixels.data[k] = 10;
      pixels.data[k + 1] = 10;
      pixels.data[k + 2] = 10;
      pixels.data[k + 3] = source[k + 3];
    }
    sc.putImageData(pixels, 0, 0);

    const cols = Math.max(20, Math.min(90, Math.round(logoWidth / 16)));
    const rows = Math.max(5, Math.min(21, Math.round(logoHeight / 14)));
    const grid = [];
    for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
      const seed = gy * cols + gx;
      grid.push({
        gx, gy,
        x: bleed + (gx + .5 + (random(seed + 12) - .5) * .55) * logoWidth / cols,
        y: bleed + (gy + .5 + (random(seed + 84) - .5) * .55) * logoHeight / rows,
        seed,
      });
    }

    shards = [];
    for (const center of grid) {
      let poly = [[bleed, bleed], [bleed + logoWidth, bleed],
        [bleed + logoWidth, bleed + logoHeight], [bleed, bleed + logoHeight]];
      for (let gy = Math.max(0, center.gy - 2); gy <= Math.min(rows - 1, center.gy + 2); gy++) {
        for (let gx = Math.max(0, center.gx - 2); gx <= Math.min(cols - 1, center.gx + 2); gx++) {
          const other = grid[gy * cols + gx];
          if (other === center) continue;
          const nx = other.x - center.x, ny = other.y - center.y;
          poly = clipPolygon(poly, nx, ny, (other.x ** 2 + other.y ** 2 - center.x ** 2 - center.y ** 2) / 2);
          if (poly.length < 3) break;
        }
        if (poly.length < 3) break;
      }
      if (poly.length < 3) continue;
      const left = Math.max(0, Math.min(...poly.map(v => v[0])));
      const top = Math.max(0, Math.min(...poly.map(v => v[1])));
      const right = Math.min(width, Math.max(...poly.map(v => v[0])));
      const bottom = Math.min(height, Math.max(...poly.map(v => v[1])));

      // Skip cells with no ink in them.
      let occupied = false;
      for (let y = Math.floor(top * quality); y < Math.ceil(bottom * quality) && !occupied; y += 3) {
        for (let x = Math.floor(left * quality); x < Math.ceil(right * quality); x += 3) {
          if (source[(y * mask.width + x) * 4 + 3] > 50) { occupied = true; break; }
        }
      }
      if (!occupied) continue;

      const tile = document.createElement('canvas');
      tile.width = Math.max(1, Math.ceil((right - left) * quality));
      tile.height = Math.max(1, Math.ceil((bottom - top) * quality));
      const tc = tile.getContext('2d');
      tc.setTransform(quality, 0, 0, quality, -left * quality, -top * quality);
      tc.beginPath();
      poly.forEach(([x, y], i) => i ? tc.lineTo(x, y) : tc.moveTo(x, y));
      tc.closePath();
      tc.clip();
      tc.drawImage(surface, 0, 0, width, height);

      const edge = document.createElement('canvas');
      edge.width = tile.width;
      edge.height = tile.height;
      const ec = edge.getContext('2d');
      ec.drawImage(tile, 0, 0);
      ec.globalCompositeOperation = 'source-in';
      ec.fillStyle = '#050505';
      ec.fillRect(0, 0, edge.width, edge.height);

      shards.push({
        x: center.x, y: center.y, left, top, poly, tile, edge,
        seed: random(center.seed + 671), dx: 0, dy: 0, vx: 0, vy: 0, spin: 0, spinVelocity: 0,
      });
    }

    ready = true;
    onReady();
    if (reduced) draw(performance.now()); else schedule();
  }

  function draw(now) {
    frame = 0;
    const dt = Math.min(.034, Math.max(.001, (now - (lastFrame || now - 16.67)) / 1000));
    lastFrame = now;
    ctx.clearRect(0, 0, width, height);
    if (!surface) return;
    ctx.drawImage(surface, 0, 0, width, height);

    const moving = [];
    const activity = cursor.active && !isPaused() ? 1 : 0;
    for (const shard of shards) {
      let tx = 0, ty = 0;
      const vx = shard.x - cursor.x, vy = shard.y - cursor.y;
      const distance = Math.hypot(vx, vy);
      const radius = Math.max(48, logoWidth * .22);
      if (activity && distance < radius) {
        const influence = (1 - distance / radius) ** 1.8;
        const force = (30 + shard.seed * 12) * influence;
        const angle = Math.atan2(vy, vx) + Math.sin(shard.x * .11 + shard.y * .08) * .24;
        const curl = Math.sin(shard.x * .07 - shard.y * .12) * influence * 7;
        tx = Math.cos(angle) * force - Math.sin(angle) * curl;
        ty = Math.sin(angle) * force + Math.cos(angle) * curl;
      }
      const stiffness = 155 / (.86 + shard.seed * .1);
      const damping = 2.05 * Math.sqrt(stiffness);
      const targetSpin = Math.min(1, Math.hypot(tx, ty) / 35) * Math.sin(shard.seed * 21) * .32;
      for (let sub = 0; sub < 2; sub++) {
        const step = dt / 2;
        shard.vx += ((tx - shard.dx) * stiffness - shard.vx * damping) * step;
        shard.vy += ((ty - shard.dy) * stiffness - shard.vy * damping) * step;
        shard.dx += shard.vx * step;
        shard.dy += shard.vy * step;
        shard.spinVelocity += ((targetSpin - shard.spin) * 145 - shard.spinVelocity * 25) * step;
        shard.spin += shard.spinVelocity * step;
      }
      if (!activity && Math.hypot(shard.dx, shard.dy) < .05 && Math.hypot(shard.vx, shard.vy) < .4) {
        shard.dx = shard.dy = shard.vx = shard.vy = shard.spin = shard.spinVelocity = 0;
      }
      if (Math.hypot(shard.dx, shard.dy) > .06) moving.push(shard);
    }

    if (moving.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = .5;
      for (const shard of moving) { polygonPath(shard.poly); ctx.fill(); ctx.stroke(); }
      ctx.restore();
      for (const shard of moving) {
        ctx.save();
        ctx.translate(shard.x + shard.dx, shard.y + shard.dy);
        ctx.rotate(shard.spin);
        const x = shard.left - shard.x, y = shard.top - shard.y;
        const w = shard.tile.width / quality, h = shard.tile.height / quality;
        const lift = Math.min(1, Math.hypot(shard.dx, shard.dy) / 22);
        ctx.shadowColor = '#0009';
        ctx.shadowBlur = 1 + lift * 5;
        ctx.shadowOffsetY = lift * 2;
        ctx.drawImage(shard.edge, x + lift, y + lift * 2, w, h);
        ctx.shadowColor = 'transparent';
        ctx.drawImage(shard.tile, x, y, w, h);
        ctx.restore();
      }
    }
    // The loop only runs while something is moving.
    if (cursor.active || moving.length) schedule();
  }

  function schedule() {
    if (!frame && !reduced) frame = requestAnimationFrame(draw);
  }

  mark.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const rect = mark.getBoundingClientRect();
    cursor.x = e.clientX - rect.left + bleed;
    cursor.y = e.clientY - rect.top + bleed;
    cursor.active = true;
    schedule();
  });
  mark.addEventListener('pointerleave', () => { cursor.active = false; schedule(); });
  window.addEventListener('resize', prepare, { passive: true });
  reducedMotion.addEventListener('change', () => { reduced = reducedMotion.matches; schedule(); });
  pauseButton.addEventListener('click', schedule);
  img.decode().then(prepare).catch(error => console.error('No se pudo cargar el logo', error));

  return {
    render(isReduced) { reduced = isReduced; schedule(); },
    isReady: () => ready,
  };
}
