import { initConcreteLogo } from './concrete-logo.js';
import { PANORAMAS, mobileLayout, paintPanorama } from './panorama.js';
import { initWater } from './panorama-water.js';
import { initMist } from './mist.js';
import { initWordmark } from './wordmark.js';
import { initTimeline } from './timeline.js';

/** Wires every effect of the cover and starts its scroll timeline. */
export function initCover({ setHeaderTone }) {
  const runway = document.querySelector('.cover-runway');
  const cover = runway.querySelector('.cover');
  const welcome = cover.querySelector('.cover-welcome');
  const panoramaCanvas = welcome.querySelector('.welcome-photo');
  const pauseButton = cover.querySelector('#cover-motion');

  // Narrow screens get their own panorama; repaint if the layout crosses the breakpoint (e.g. on rotation).
  const water = initWater({ canvas: panoramaCanvas, welcome });
  function showPanorama() {
    const panorama = mobileLayout.matches ? PANORAMAS.mobile : PANORAMAS.desktop;
    water.show(panorama, paintPanorama(panoramaCanvas, panorama, { onUpgrade: water.resample }));
  }
  showPanorama();

  const concreteLogo = initConcreteLogo({ cover, runway, pauseButton });
  const mist = initMist(cover.querySelector('.cover-mist'));

  // The wordmark reports back to the timeline when ready, so the timeline is created lazily.
  let timeline = null;
  const wordmark = initWordmark({
    mark: welcome.querySelector('.welcome-bull-mark'),
    isPaused: concreteLogo.isPaused,
    pauseButton,
    touchSurface: cover,
    onReady: () => timeline?.render(),
  });

  timeline = initTimeline({ cover, runway, pauseButton, mist, wordmark, setHeaderTone });
  timeline.render();

  mobileLayout.addEventListener('change', () => {
    showPanorama();
    timeline.render(); // the pan distance depends on the panorama's width
  });
}
