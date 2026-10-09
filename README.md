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

`index.html` usa módulos ES y `@import` nativos, así que un servidor estático apuntando a esta
carpeta también funciona, pero sin las fuentes: esas las resuelve el empaquetador desde `node_modules`.

## Estructura

```
index.html                    Marcado de toda la página, una sección por bloque comentado
src/
├─ main.js                    Punto de entrada: inicializa cada sección y las conecta
├─ styles/
│  ├─ main.css                Importa todo en orden (tokens → base → componentes → secciones)
│  ├─ fonts.css               Inter, Archivo e IBM Plex Mono, autoalojadas desde npm
│  ├─ tokens.css              Colores, escala tipográfica y fuentes
│  ├─ base.css                Reset y estilos de elementos
│  └─ components.css          .btn, .eyebrow, .small, .grid-lines
├─ data/
│  └─ families.js             Las seis líneas (nombre, textos, color, ilustración)
├─ shared/
│  ├─ math.js                 clamp, smoothstep, smoothRange
│  ├─ motion.js               prefers-reduced-motion
│  ├─ fracture.js             Recorte de polígonos para fragmentar los logos
│  └─ touch.js                Seguimiento del dedo en pantallas táctiles
├─ assets/brand/              Isotipo y logotipo
└─ sections/
   ├─ header/                 Navegación y menú móvil
   ├─ cover/                  Portada
   │  ├─ cover.js             Conecta los efectos de la portada
   │  ├─ timeline.js          Coreografía por scroll (qué pasa en cada tramo)
   │  ├─ concrete-logo.js     Logo de hormigón que se arma, reacciona al cursor y se dispersa
   │  ├─ panorama.js          Carga progresiva del panorama (vista previa → rápida → completa)
   │  ├─ panorama-water.js    Ondas del agua de la piscina y su botón de pausa
   │  ├─ wordmark.js          Logotipo fragmentado que reacciona al cursor
   │  ├─ mist.js              Niebla de transición
   │  ├─ cover.css · welcome.css · mist.css
   │  └─ assets/              panorama.webp, panorama-fast.webp, panorama-preview.webp, mist-volute.webp
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

- **La niebla es una textura sustituta.** El original apuntaba a `Humo_Bull_Volutas_Transparente.png`,
  que no venía incluido. `src/sections/cover/assets/mist-volute.webp` es un reemplazo generado;
  si el cliente entrega su imagen, basta con sobrescribir ese archivo.
- **Falta la página del showroom.** Seis enlaces apuntan a
  `Web_Hormigones_Bull_Showroom_Instagram_v3.html` (`#showroom`, `#inspiracion`, `#catalogo`,
  `#contacto`). Hay que publicarla junto a esta o actualizar los `href` en `index.html`.
- **Resolución del panorama.** `panorama.webp` mide 3584×1184 px y se muestra a la altura completa
  de la pantalla: en un monitor 4K a escala 100 % todavía se amplía ~1,8×. Para nitidez total ahí
  haría falta un original de unos 6480×2160 px. Al reemplazarlo hay que regenerar las tres
  versiones (completa, rápida a 2172 px y vista previa a 543 px) y, si cambia la composición,
  ajustar el rectángulo de la piscina en `panorama-water.js` y el tamaño del `<canvas>`.
