/**
 * The six product lines. This is the single source for the journey scenes, the navigation dots,
 * the catalog cards and the detail dialog.
 * `shape` picks the artwork in sections/journey/art.js; `color` tints the stage while the line is active.
 */
export const families = [
  {
    name: 'Línea piscina',
    title: 'El agua encuentra\nsu lugar.',
    text: 'Bordes y piezas que acompañan la forma de tu piscina. Un encuentro entre agua, textura y diseño.',
    product: 'Borde de piscina',
    color: '#bcd9df',
    shape: 'pool',
  },
  {
    name: 'Línea jardín',
    title: 'Un camino hacia\ntu espacio.',
    text: 'Pastelones y soluciones para dar ritmo a tu jardín. Formas que conectan lo natural con tu manera de vivir.',
    product: 'Pastelón para jardín',
    color: '#c6d3b9',
    shape: 'tile',
  },
  {
    name: 'Mobiliario de hormigón',
    title: 'Formas para\nhabitar.',
    text: 'Maceteros, jardineras y bancas. Piezas con presencia que transforman una esquina en un lugar.',
    product: 'Macetero de hormigón',
    color: '#d6c5b4',
    shape: 'pot',
  },
  {
    name: 'Fachaletas',
    title: 'El carácter\nde tus muros.',
    text: 'Relieves y texturas para crear superficies que se miran de cerca. La materia también cuenta historias.',
    product: 'Fachaleta de hormigón',
    color: '#c6c6c1',
    shape: 'wall',
  },
  {
    name: 'Piedras decorativas',
    title: 'Naturaleza\nen los detalles.',
    text: 'Complementos para componer tu paisaje. Tonos y texturas que dan otra dimensión a los espacios exteriores.',
    product: 'Piedras para paisajismo',
    color: '#d5baa6',
    shape: 'stone',
  },
  {
    name: 'Ferretería Bull',
    title: 'Todo para\nterminar bien.',
    text: 'Complementos para instalar y cuidar tu proyecto. El detalle final también forma parte del diseño.',
    product: 'Sellador para hormigón',
    color: '#e8cd76',
    shape: 'seal',
  },
];

/** "01", "02"… label used across scenes, dots and cards. */
export const familyNumber = index => String(index + 1).padStart(2, '0');
