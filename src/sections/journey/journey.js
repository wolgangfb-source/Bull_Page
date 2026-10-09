import { families, familyNumber } from '../../data/families.js';
import { clamp } from '../../shared/math.js';
import { reducedMotion } from '../../shared/motion.js';
import { renderArt } from './art.js';

// The first line keeps a longer share of the scroll so it gets a full viewing interval after the mist.
const FIRST_SHARE = .375;
const REMAINING_SHARE = (1 - FIRST_SHARE) / (families.length - 1);
const LAST_INDEX = families.length - 1;

/**
 * Builds one scene and one dot per line and keeps the active scene in sync with scroll.
 * Returns `goTo(index)` so other sections can jump to a line.
 */
export function initJourney({ onExplore }) {
  const journey = document.querySelector('.journey');
  const stage = journey.querySelector('.stage');
  const host = document.querySelector('#scenes');
  const dots = document.querySelector('#dots');
  const meter = document.querySelector('#meter');
  const sceneIndex = document.querySelector('#scene-index');
  let current = -1;

  const scrollRange = () => journey.offsetHeight - stage.offsetHeight;

  function goTo(index) {
    const progress = index === 0 ? FIRST_SHARE * .35 : FIRST_SHARE + (index - 1 + .12) * REMAINING_SHARE;
    window.scrollTo({
      top: journey.offsetTop + progress * scrollRange(),
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
    });
  }

  families.forEach((family, i) => {
    const scene = document.createElement('section');
    scene.className = 'scene';
    scene.id = 'line-' + i;
    scene.setAttribute('aria-label', family.name);
    scene.innerHTML = `<div><span class="number">${familyNumber(i)}</span><div class="eyebrow">${family.name}</div>`
      + `<h2>${family.title.replace('\n', '<br>')}</h2><p>${family.text}</p>`
      + '<div class="actions"><button class="btn" type="button">Explorar esta línea ↗</button></div></div>'
      + `<div class="art">${renderArt(family, i)}</div>`;
    scene.querySelector('button').onclick = () => onExplore(i);
    host.append(scene);

    const dot = document.createElement('button');
    dot.innerHTML = '<i></i>' + familyNumber(i);
    dot.setAttribute('aria-label', family.name);
    dot.onclick = () => goTo(i);
    dots.append(dot);
  });

  const scenes = [...host.children];

  function update() {
    const progress = clamp((window.scrollY - journey.offsetTop) / scrollRange());
    const index = progress < FIRST_SHARE
      ? 0
      : Math.min(LAST_INDEX, 1 + Math.floor((progress - FIRST_SHARE) / REMAINING_SHARE));
    meter.style.width = progress * 100 + '%';
    if (index === current) return;
    current = index;

    document.documentElement.style.setProperty('--scene', families[index].color);
    scenes.forEach((scene, i) => {
      scene.classList.toggle('active', i === index);
      scene.inert = i !== index;
      scene.setAttribute('aria-hidden', i !== index);
    });
    [...dots.children].forEach((dot, i) => dot.setAttribute('aria-current', i === index));
    sceneIndex.textContent = `${familyNumber(index)} / ${familyNumber(LAST_INDEX)}`;
  }

  let queued = false;
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { update(); queued = false; });
  }, { passive: true });
  window.addEventListener('resize', update);
  update();

  return { goTo };
}
