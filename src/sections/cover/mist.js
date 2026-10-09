import { smoothstep } from '../../shared/math.js';

// One entry per .mist-volute layer: start position (vw/vh), sideways drift, rotation, scale and peak opacity.
const LAYERS = [
  { delay: 0, x: -.16, y: 1.13, drift: .18, r: -15, scale: 1.02, alpha: .62 },
  { delay: .09, x: .52, y: 1.27, drift: -.12, r: 12, scale: .86, alpha: .55 },
  { delay: .16, x: -.27, y: .72, drift: .27, r: -26, scale: .98, alpha: .5 },
  { delay: .25, x: .67, y: .84, drift: -.22, r: 22, scale: 1.12, alpha: .52 },
  { delay: .37, x: .07, y: 1.41, drift: .13, r: -7, scale: 1.2, alpha: .67 },
];

/** Returns `render(progress)` where progress 0..1 lifts the volutes up through the cover. */
export function initMist(mist) {
  const layers = [...mist.querySelectorAll('.mist-volute')];
  const depth = mist.querySelector('.mist-depth');

  function render(p) {
    mist.style.opacity = p ? String(smoothstep(p / .15)) : 0;
    layers.forEach((layer, i) => {
      const s = LAYERS[i];
      const q = smoothstep((p - s.delay) / (1 - s.delay));
      const curl = Math.sin(q * 4.5 + i * 1.7) * .065 * q;
      layer.style.opacity = String(s.alpha * smoothstep(q / .27));
      layer.style.transform = `translate3d(${(s.x + s.drift * q + curl) * 100}vw,${(s.y - (.96 + i * .08) * q) * 100}vh,0) rotate(${s.r + q * (i % 2 ? 18 : -13)}deg) scale(${s.scale * (.8 + q * .45)})`;
    });
    depth.style.opacity = String(smoothstep((p - .47) / .53) * .52);
    depth.style.transform = `translateY(${(1 - smoothstep(p)) * 22}%)`;
  }

  render(0);
  return { render };
}
