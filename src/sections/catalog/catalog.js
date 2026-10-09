import { families, familyNumber } from '../../data/families.js';

/** Renders one card per line; `onSelect(index)` fires when a card is chosen. */
export function initCatalog({ onSelect }) {
  const grid = document.querySelector('#catalog-grid');
  families.forEach((family, i) => {
    const card = document.createElement('button');
    card.className = 'catalog-card';
    card.innerHTML = `<span>${familyNumber(i)}</span><h3>${family.name}</h3><span>Ver escena ↑</span>`;
    card.onclick = () => onSelect(i);
    grid.append(card);
  });
}
