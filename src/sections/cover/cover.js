import { initConcreteLogo } from './concrete-logo.js';
import { paintPanorama } from './panorama.js';
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

  let water = null;
  const painted = paintPanorama(panoramaCanvas, { onUpgrade: () => water?.resample() });
  water = initWater({ canvas: panoramaCanvas, welcome, painted });

  const concreteLogo = initConcreteLogo({ cover, runway, pauseButton });
  const mist = initMist(cover.querySelector('.cover-mist'));

  // The wordmark reports back to the timeline when ready, so the timeline is created lazily.
  let timeline = null;
  const wordmark = initWordmark({
    mark: welcome.querySelector('.welcome-bull-mark'),
    isPaused: concreteLogo.isPaused,
    pauseButton,
    onReady: () => timeline?.render(),
  });

  timeline = initTimeline({ cover, runway, pauseButton, mist, wordmark, setHeaderTone });
  timeline.render();
}
