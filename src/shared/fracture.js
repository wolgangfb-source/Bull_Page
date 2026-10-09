/**
 * Clips a convex polygon against the half-plane nx*x + ny*y <= limit.
 * Clipping a cell against the bisector of each neighbouring seed yields its Voronoi cell,
 * which is how both logos are broken into interlocking fragments.
 */
export function clipPolygon(polygon, nx, ny, limit) {
  const out = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const da = a[0] * nx + a[1] * ny - limit;
    const db = b[0] * nx + b[1] * ny - limit;
    if (da <= 0) out.push(a);
    if ((da <= 0) !== (db <= 0)) {
      const t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
