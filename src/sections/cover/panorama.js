// The panorama reaches the screen in three steps so the welcome never opens onto an empty frame:
//   1. panorama-preview.webp  tiny, shown at once as the canvas background (see welcome.css)
//   2. panorama-fast.webp     painted as soon as it arrives
//   3. panorama.webp          full resolution, swapped in afterwards on connections that can afford it
const FAST_URL = new URL('./assets/panorama-fast.webp', import.meta.url).href;
const FULL_URL = new URL('./assets/panorama.webp', import.meta.url).href;

function load(url) {
  const image = new Image();
  image.src = url;
  const ready = image.decode
    ? image.decode()
    : new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
  return ready.then(() => image);
}

/** Skip the 1.8 MB full-resolution copy when the visitor asked to save data or is on a slow link. */
function canAffordFullQuality() {
  const connection = navigator.connection;
  return !connection || !(connection.saveData || /(^|-)[23]g$/.test(connection.effectiveType ?? ''));
}

/**
 * Paints the panorama into `canvas`. Resolves to true once the first full-size version is on
 * screen (false if it failed to load). `onUpgrade` fires if the full-resolution version replaces it later.
 */
export function paintPanorama(canvas, { onUpgrade } = {}) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high'; // the fast version is smaller than the canvas
  const draw = image => ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return load(FAST_URL).then(image => {
    draw(image);
    if (canAffordFullQuality()) {
      load(FULL_URL).then(full => { draw(full); onUpgrade?.(); }).catch(() => {});
    }
    return true;
  }).catch(error => {
    console.error('No se pudo cargar el panorama', error);
    return false;
  });
}
