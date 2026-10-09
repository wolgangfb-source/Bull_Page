import { clamp, smoothRange } from '../../shared/math.js';

const SCENE_URL = new URL('./assets/panorama.png', import.meta.url).href;
const LAWN_URL = new URL('./assets/lawn-texture.jpg', import.meta.url).href;

const W = 2172, H = 724;
// The lawn ends where the pool deck begins.
const LAWN_RIGHT = 1582;
// Upper and lower lawn boundaries as [x, y] polylines across the panorama.
const LAWN_TOP = [[0, 165], [170, 184], [380, 199], [650, 208], [900, 195], [1150, 203], [1400, 211], [1582, 202]];
const LAWN_BOTTOM = [[0, 383], [170, 417], [380, 461], [650, 477], [900, 478], [1150, 472], [1400, 487], [1582, 486]];

const ready = image => image.decode
  ? image.decode()
  : new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });

const luminance = (data, i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];

function interpolate(points, x) {
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i][0]) {
      const a = points[i - 1], b = points[i], t = (x - a[0]) / (b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * t;
    }
  }
  return points[points.length - 1][1];
}

function pixelsOf(draw) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  draw(ctx);
  return ctx.getImageData(0, 0, W, H).data;
}

/**
 * Paints the panorama into `canvas` and re-textures its lawn with photographic grass.
 * Resolves to true once painted, false if an image failed to load.
 */
export function paintPanorama(canvas) {
  const scene = new Image(), lawn = new Image();
  scene.src = SCENE_URL;
  lawn.src = LAWN_URL;

  return Promise.all([ready(scene), ready(lawn)]).then(() => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(scene, 0, 0, W, H);
    const original = ctx.getImageData(0, 0, W, H);
    // A heavy blur of the scene carries its lighting without the painted grass detail.
    const shade = pixelsOf(c => { c.filter = 'blur(28px)'; c.drawImage(scene, 0, 0, W, H); });
    const texture = pixelsOf(c => c.drawImage(lawn, 114, 313, W, H, 0, 0, W, H));

    let sum = 0, count = 0;
    for (let y = 200; y < 480; y += 3) for (let x = 0; x < 1560; x += 3) {
      sum += luminance(texture, (y * W + x) * 4);
      count++;
    }
    const average = sum / count;

    const out = original.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < LAWN_RIGHT; x++) {
      const upper = interpolate(LAWN_TOP, x), lower = interpolate(LAWN_BOTTOM, x);
      const area = smoothRange(upper, upper + 35, y) * smoothRange(lower, lower - 35, y) * smoothRange(LAWN_RIGHT, 1538, x);
      if (area < 0.001) continue;
      const i = (y * W + x) * 4;
      const r = out[i], g = out[i + 1], b = out[i + 2];
      // The green-only gate leaves the pale paving, dark contact shadows, and flowers untouched.
      const green = smoothRange(0.045, 0.16, (g - Math.max(r, b)) / Math.max(g, 1));
      const lit = smoothRange(28, 67, g);
      const amount = area * green * lit * 0.98;
      if (amount < 0.001) continue;
      const grain = clamp(Math.pow(luminance(texture, i) / average, 0.55), 0.72, 1.36);
      const nextR = clamp(shade[i] * grain * 0.56 + texture[i] * 1.30 * 0.44, 0, 255);
      const nextG = clamp(shade[i + 1] * grain * 0.56 + texture[i + 1] * 1.25 * 0.44, 0, 255);
      const nextB = clamp(shade[i + 2] * grain * 0.56 + texture[i + 2] * 1.15 * 0.44, 0, 255);
      out[i] = Math.round(r * (1 - amount) + nextR * amount);
      out[i + 1] = Math.round(g * (1 - amount) + nextG * amount);
      out[i + 2] = Math.round(b * (1 - amount) + nextB * amount);
    }
    ctx.putImageData(original, 0, 0);
    return true;
  }).catch(error => {
    console.error('No se pudo cargar el césped fotográfico', error);
    return false;
  });
}
