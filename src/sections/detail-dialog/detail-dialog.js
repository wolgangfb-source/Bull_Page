import { families } from '../../data/families.js';
import { renderArt } from '../journey/art.js';

/** Wires the line-detail dialog and returns `show(index)`. */
export function initDetailDialog() {
  const dialog = document.querySelector('#detail');
  const title = dialog.querySelector('#detail-title');
  const art = dialog.querySelector('#detail-art');
  const text = dialog.querySelector('#detail-text');

  dialog.querySelector('#close').onclick = () => dialog.close();

  function show(index) {
    const family = families[index];
    title.textContent = family.name;
    // Offset keeps the gradient id distinct from the copy already rendered in the journey scene.
    art.innerHTML = renderArt(family, index + 10);
    text.textContent = family.text;
    dialog.showModal();
  }

  return { show };
}
