import { clamp, smoothstep } from '../../shared/math.js';
import { reducedMotion } from '../../shared/motion.js';

/**
 * Scroll-driven choreography of the cover. `t` is scroll progress in viewport heights, so every
 * number below reads as "how many screens down". The beats, in order:
 *
 *   0.00 – 0.55   intro copy and hint fade out
 *   0.47 – 1.53   welcome panorama opens through a growing circular mask
 *   0.82 – 2.25   headline rises in, hops, then lifts away with its shade
 *   2.25 – 6.00   wordmark appears and the panorama pans from the path to the pool
 *   6.60 – 8.90   mist rises
 *   8.15 – 9.10   cover fades, handing over to the journey (header flips to light at 8.55)
 */
export function initTimeline({ cover, runway, pauseButton, mist, wordmark, setHeaderTone }) {
  const copy = cover.querySelector('.cover-copy');
  const hint = cover.querySelector('.cover-hint');
  const greeting = cover.querySelector('.cover-welcome');
  const panorama = greeting.querySelector('.welcome-photo');
  const headline = greeting.querySelector('.welcome-headline');
  const composition = greeting.querySelector('.welcome-composition');
  const bullMark = greeting.querySelector('.welcome-bull-mark');
  const bullLogo = greeting.querySelector('.welcome-bull-logo');
  const journey = document.querySelector('.journey');

  function render() {
    const reduced = reducedMotion.matches;
    const rawT = Math.max(0, (window.scrollY - runway.offsetTop) / Math.max(1, cover.clientHeight));
    // Scroll between 0.82 and 3.25 screens is slowed down to give the headline extra reading time.
    const t = rawT <= .82 ? rawT : rawT < 3.25 ? .82 + (rawT - .82) * (1.43 / 2.43) : rawT - 1;

    // Whole cover: fade out at the end and stop intercepting input.
    const fade = reduced ? 0 : smoothstep((t - 8.15) / .95);
    cover.style.opacity = String(1 - fade);
    cover.style.pointerEvents = fade > .97 ? 'none' : 'auto';
    cover.inert = fade > .97;

    // Intro copy and controls.
    copy.style.opacity = String(reduced ? 0 : 1 - smoothstep(t / .55));
    copy.style.transform = reduced ? 'none' : `translateY(${-Math.min(t, 1) * 25}px)`;
    hint.style.opacity = String(1 - smoothstep(t / .55));
    pauseButton.style.opacity = String(1 - smoothstep((t - .7) / .5));
    pauseButton.disabled = t > 1.2 && !reduced;

    // Welcome panorama: circular reveal, then the horizontal walk.
    const imageReveal = reduced ? 1 : smoothstep((t - .58) / .95);
    greeting.style.opacity = String(reduced ? 1 : smoothstep((t - .47) / .37));
    const radius = Math.hypot(greeting.clientWidth, greeting.clientHeight) * imageReveal, feather = Math.min(140, greeting.clientWidth * .12);
    const revealMask = reduced ? 'none' : `radial-gradient(circle at 50% 40%, #000 ${Math.max(0, radius - feather)}px, transparent ${radius + feather}px)`;
    greeting.style.maskImage = revealMask;
    greeting.style.webkitMaskImage = revealMask;
    const walkProgress = reduced ? 0 : smoothstep((t - 2.25) / 3.75);
    const travel = Math.max(0, panorama.offsetWidth - greeting.clientWidth);
    panorama.style.transform = reduced ? 'none' : `translate3d(${-Math.round(travel * walkProgress)}px,0,0)`;

    mist.render(reduced ? 0 : smoothstep((t - 6.60) / 2.30));

    // Headline: in, hop, out.
    const headlineIn = reduced ? 1 : smoothstep((t - .82) / .55), headlineOut = reduced ? 0 : smoothstep((t - 1.82) / .43);
    const hopPhase = reduced ? 0 : clamp((t - 1.46) / .34), hopArc = Math.sin(Math.PI * hopPhase);
    headline.style.setProperty('--welcome-line-progress', String(reduced ? 1 : smoothstep((t - .82) / .98)));
    headline.style.setProperty('--heading-dog-tilt', `${reduced ? 0 : -8 * Math.sin(Math.PI * hopPhase)}deg`);
    headline.style.opacity = String(headlineIn * (1 - headlineOut));
    headline.style.transform = reduced ? 'none' : `translate3d(0,${Math.round((1 - headlineIn) * 28 - hopArc * 22 - headlineOut * innerHeight * 1.08)}px,0) scale(${1 + hopArc * .012})`;
    const shadeExit = reduced ? 1 : smoothstep((t - 1.78) / .64);
    greeting.style.setProperty('--headline-shade', String(headlineIn * (1 - shadeExit)));
    greeting.style.setProperty('--shade-exit', String(shadeExit));

    // Wordmark: the plain image shows only until its canvas version is ready.
    const logoReveal = reduced ? 1 : smoothstep((t - 2.25) / .24);
    composition.style.opacity = String(logoReveal);
    bullMark.style.opacity = String(logoReveal);
    bullMark.style.pointerEvents = reduced || logoReveal < .92 ? 'none' : 'auto';
    bullLogo.style.opacity = String(wordmark.isReady() && !reduced ? 0 : 1);
    wordmark.render(reduced);

    // Hand-over to the journey.
    journey.inert = !reduced && t < 9.05;
    const onDark = reduced ? window.scrollY < innerHeight : t < 8.55;
    setHeaderTone(onDark ? 'dark' : 'light');
  }

  window.addEventListener('scroll', render, { passive: true });
  window.addEventListener('resize', render);
  reducedMotion.addEventListener('change', render);

  return { render };
}
