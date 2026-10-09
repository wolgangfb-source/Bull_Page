const POT_PHOTO = new URL('./assets/macetero.webp', import.meta.url).href;

const SHAPE_PATHS = {
  pool: 'M35 170Q72 103 156 113L390 166L346 228L127 181Q64 160 35 192Z',
  tile: 'M45 140L287 85L407 156L170 238Z M45 140L170 238L170 261L45 165Z M170 238L407 156L407 179L170 261Z',
  wall: 'M56 80L323 64L393 110L126 126Z M56 147L323 131L393 177L126 193Z M56 214L323 198L393 244L126 260Z',
  stone: 'M46 203L69 116L136 91L190 155L150 227Z M190 257L190 186L259 135L333 191L302 281Z M292 115L337 62L413 110L392 165L320 179Z',
  seal: 'M156 91L280 91L302 119L302 293L134 293L134 119Z M183 50L251 50L251 91L183 91Z',
};

const SEAL_LABEL = '<path d="M155 160H283V226H155Z" fill="#f2b705"/><text x="219" y="195" fill="#1f2933" text-anchor="middle" font-size="18">BULL</text>';

/**
 * Markup for a line's artwork: the catalog photograph for the pot, an illustration for the rest.
 * `gradientId` must be unique per rendered copy, since SVG gradient ids are document-wide.
 */
export function renderArt(family, gradientId) {
  if (family.shape === 'pot') {
    return `<img src="${POT_PHOTO}" alt="Macetero de hormigón natural del catálogo Bull">`;
  }
  return `<svg viewBox="0 0 450 350" role="img" aria-label="Ilustración de ${family.product}">`
    + `<defs><linearGradient id="material${gradientId}" x2="1" y2="1"><stop stop-color="#c7c7bd"/><stop offset="1" stop-color="#737d73"/></linearGradient></defs>`
    + `<path d="${SHAPE_PATHS[family.shape]}" fill="url(#material${gradientId})" stroke="#59645b" stroke-width="1.4"/>`
    + (family.shape === 'seal' ? SEAL_LABEL : '')
    + '</svg><small>Ilustración de producto</small>';
}
