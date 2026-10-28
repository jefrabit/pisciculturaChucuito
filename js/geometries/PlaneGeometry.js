// ------------------------------------------------------------
// PLANE GEOMETRY (Paso 5/16)
// Plano horizontal unitario centrado en origen (Y=0).
// Formato: pos|normal|uv = 8 floats.
// ------------------------------------------------------------
import { Geometry } from "../core/Geometry.js";

export function crearMallaPlano() {
  const vertices = new Float32Array([
    -0.5, 0, -0.5,  0, 1, 0,  0, 0,
     0.5, 0, -0.5,  0, 1, 0,  1, 0,
     0.5, 0,  0.5,  0, 1, 0,  1, 1,
    -0.5, 0,  0.5,  0, 1, 0,  0, 1
  ]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  return new Geometry({
    vertices,
    indices,
    primitive: "triangles",
    componentsPerVertex: 8,
    hasNormals: true,
    hasUvs: true
  });
}