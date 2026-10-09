// A panorama reaches the screen in three steps so the welcome never opens onto an empty frame:
//   1. *-preview.webp  tiny, shown at once as the canvas background (see welcome.css)
//   2. *-fast.webp     painted as soon as it arrives
//   3. the full image  swapped in afterwards on connections that can afford it
const asset = name => new URL(`./assets/${name}`, import.meta.url).href;

/**
 * One panorama per layout. `pool` is a rectangle enclosing the pool, in pixels of the full image,
 * for the water effect. The matching aspect ratio and preview live in welcome.css.
 */
export const PANORAMAS = {
  // 3:1, for wide screens.
  desktop: {
    width: 3584,
    height: 1184,
    fast: asset('panorama-fast.webp'),
    full: asset('panorama.webp'),
    pool: { x: 2636, y: 248, width: 948, height: 476 },
  },
  // 4:1, a longer walk for narrow screens.
  mobile: {
    width: 2508,
    height: 627,
    fast: asset('panorama-mobile-fast.webp'),
    full: asset('panorama-mobile.webp'),
    pool: { x: 2076, y: 140, width: 432, height: 270 },
  },
};

/** Same breakpoint as the mobile rules in the stylesheets. */
export const mobileLayout = matchMedia('(max-width: 800px)');

function load(url) {
  const image = new Image();
  image.src = url;
  const ready = image.decode
    ? image.decode()
    : new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
  return ready.then(() => image);
}

/** Skip the full-resolution copy when the visitor asked to save data or is on a slow link. */
function canAffordFullQuality() {
  const connection = navigator.connection;
  return !connection || !(connection.saveData || /(^|-)[23]g$/.test(connection.effectiveType ?? ''));
}

// Latest request per canvas, so an image that arrives after the layout changed is not painted.
const requests = new WeakMap();

/**
 * Sizes `canvas` for `panorama` and paints it. Resolves to true once the first full-size version
 * is on screen (false if it failed to load or was superseded). `onUpgrade` fires if the
 * full-resolution version replaces it later.
 */
export function paintPanorama(canvas, panorama, { onUpgrade } = {}) {
  const request = {};
  requests.set(canvas, request);
  const current = () => requests.get(canvas) === request;

  // Resizing also clears the canvas, letting the preview behind it show through.
  canvas.width = panorama.width;
  canvas.height = panorama.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high'; // the fast version is smaller than the canvas
  const draw = image => ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return load(panorama.fast).then(image => {
    if (!current()) return false;
    draw(image);
    if (canAffordFullQuality()) {
      load(panorama.full).then(full => {
        if (!current()) return;
        draw(full);
        onUpgrade?.();
      }).catch(() => {});
    }
    return true;
  }).catch(error => {
    console.error('No se pudo cargar el panorama', error);
    return false;
  });
}
