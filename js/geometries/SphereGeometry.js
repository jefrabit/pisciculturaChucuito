// ------------------------------------------------------------
// SPHERE GEOMETRY (Paso 7/16)
// Geometría esférica procedural (lat/long) con formato
// pos|normal|uv = 8 floats. Costura/polos correctos.
// ------------------------------------------------------------
import { Geometry } from "../core/Geometry.js";

export function crearMallaEsfera(radio, segLat, segLon) {
  const vertices = [];
  const indices = [];
  for (let lat = 0; lat <= segLat; lat++) {
    const v = lat / segLat;
    const phi = v * Math.PI;
    for (let lon = 0; lon <= segLon; lon++) {
      const u = lon / segLon;
      const theta = u * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      vertices.push(
        radio * nx, radio * ny, radio * nz,
        nx, ny, nz,
        u, v
      );
    }
  }
  const cols = segLon + 1;
  for (let lat = 0; lat < segLat; lat++) {
    for (let lon = 0; lon < segLon; lon++) {
      const actual = lat * cols + lon;
      const siguiente = actual + cols;
      indices.push(actual, siguiente, actual + 1);
      indices.push(actual + 1, siguiente, siguiente + 1);
    }
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

// Helper monolito: esfera de radio 1 (la escala la da Mesh.scale).
export function crearMallaEsferaUnitaria(segLat = 24, segLon = 32) {
  return crearMallaEsfera(1.0, segLat, segLon);
}