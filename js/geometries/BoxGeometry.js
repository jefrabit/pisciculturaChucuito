// ------------------------------------------------------------
// BOX GEOMETRY (Paso 5/16)
// Caja unitaria centrada en origen (-0.5 a +0.5).
// Formato: pos|normal|uv = 8 floats.
// ------------------------------------------------------------
import { Geometry } from "../core/Geometry.js";

export function crearMallaCaja() {
  const caras = [
    // Frente (+Z)
    { n: [0, 0, 1], v: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
    // Atras (-Z)
    { n: [0, 0, -1], v: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] },
    // Derecha (+X)
    { n: [1, 0, 0], v: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
    // Izquierda (-X)
    { n: [-1, 0, 0], v: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
    // Arriba (+Y)
    { n: [0, 1, 0], v: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
    // Abajo (-Y)
    { n: [0, -1, 0], v: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] }
  ];
  const vertices = [];
  const indices = [];
  let vi = 0;
  const uvs = [[0, 0], [1, 0], [1, 1], [0, 1]];
  for (const cara of caras) {
    for (let i = 0; i < 4; i++) {
      vertices.push(...cara.v[i], ...cara.n, ...uvs[i]);
    }
    indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
    vi += 4;
  }
  return new Geometry({
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
    primitive: "triangles",
    componentsPerVertex: 8,
    hasNormals: true,
    hasUvs: true
  });
}