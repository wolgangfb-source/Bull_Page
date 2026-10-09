# Hormigones Bull · Bienvenida

Landing de bienvenida con recorrido por las seis líneas de producto. Es la versión modular del
archivo único `Web_Bull_Bienvenida_Extendida_Linea_Amarilla.html`: mismo contenido, mismo
comportamiento y mismos píxeles, separado en archivos por sección.

## Cómo ejecutarlo

Necesita servirse por HTTP: los efectos leen píxeles de las imágenes con `canvas`, y el navegador
lo bloquea si la página se abre con doble clic (`file://`).

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # genera dist/ listo para publicar
npm run preview  # sirve dist/ para revisarlo
```

No depende del empaquetador: `index.html` usa módulos ES y `@import` nativos, así que cualquier
servidor estático apuntando a esta carpeta también funciona.

## Estructura

```
index.html                    Marcado de toda la página, una sección por bloque comentado
src/
├─ main.js                    Punto de entrada: inicializa cada sección y las conecta
├─ styles/
│  ├─ main.css                Importa todo en orden (tokens → base → componentes → secciones)
│  ├─ tokens.css              Colores, escala tipográfica y fuentes
│  ├─ base.css                Reset y estilos de elementos
│  └─ components.css          .btn, .eyebrow, .small, .grid-lines
├─ data/
│  └─ families.js             Las seis líneas (nombre, textos, color, ilustración)
├─ shared/
│  ├─ math.js                 clamp, smoothstep, smoothRange
│  ├─ motion.js               prefers-reduced-motion
│  └─ fracture.js             Recorte de polígonos para fragmentar los logos
├─ assets/brand/              Isotipo y logotipo
└─ sections/
   ├─ header/                 Navegación y menú móvil
   ├─ cover/                  Portada
   │  ├─ cover.js             Conecta los efectos de la portada
   │  ├─ timeline.js          Coreografía por scroll (qué pasa en cada tramo)
   │  ├─ concrete-logo.js     Logo de hormigón que se arma, reacciona al cursor y se dispersa
   │  ├─ panorama-grass.js    Pinta el panorama y le aplica césped fotográfico
   │  ├─ panorama-water.js    Ondas del agua de la piscina y su botón de pausa
   │  ├─ wordmark.js          Logotipo fragmentado que reacciona al cursor
   │  ├─ mist.js              Niebla de transición
   │  ├─ cover.css · welcome.css · mist.css
   │  └─ assets/              panorama.png, lawn-texture.jpg, (mist-volute.png)
   ├─ journey/                Recorrido fijo por las seis líneas, puntos de navegación
   ├─ catalog/                Tarjetas "Todas las líneas"
   ├─ closing/                Llamado final
   ├─ footer/
   └─ detail-dialog/          Diálogo de detalle de línea
```

Cada sección exporta una función `init…()` y recibe por parámetro lo que necesita de las demás;
no hay variables globales. Para agregar, quitar o editar una línea de producto basta con
`src/data/families.js`.

## Pendientes heredados del archivo original

- **Falta la imagen de la niebla.** El original apuntaba a `Humo_Bull_Volutas_Transparente.png`,
  que no venía incluido. Copiarla como `src/sections/cover/assets/mist-volute.png`.
- **Falta la página del showroom.** Seis enlaces apuntan a
  `Web_Hormigones_Bull_Showroom_Instagram_v3.html` (`#showroom`, `#inspiracion`, `#catalogo`,
  `#contacto`). Hay que publicarla junto a esta o actualizar los `href` en `index.html`.
- **Las fuentes no se cargan.** El CSS pide Inter, Archivo e IBM Plex Mono, pero ningún archivo las
  incluye; hoy se ve con Arial salvo que estén instaladas en el equipo.
- **Resolución del panorama.** `panorama.png` mide 2172×724 px y se muestra a la altura completa
  de la pantalla: en un monitor 4K se amplía ~3× y se ve borroso. Hace falta un original de al
  menos 6480×2160 px. Al reemplazarla hay que escalar las coordenadas del césped y la piscina en
  `panorama-grass.js` y `panorama-water.js`, que están en píxeles de la imagen actual.
- **Peso de imágenes.** `panorama.png` (3,7 MB) y `lawn-texture.jpg` (1,6 MB) son el 93 % de la
  descarga. El césped se compone en el navegador al cargar; hornear ese resultado en una sola
  imagen WebP/AVIF eliminaría la segunda imagen y el cálculo inicial.
