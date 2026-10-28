// ------------------------------------------------------------
// Geometrias.js — Generadores de malla procedurales (Paso 16)
// Formato vértice: pos(3) | normal(3) | color(3) = 9 floats.
// ------------------------------------------------------------

import { Geometry, STRIDE_FLOATS } from "../core/Geometry.js";
import { normalizar3, transformarPunto4, mezclarColor } from "../math/Matrix4.js";

// Une varias geometrías en una sola (desplaza los índices).
export function fusionar(lista) {
  const v = [];
  const idx = [];
  let base = 0;
  for (const g of lista) {
    for (const x of g.vertices) v.push(x);
    for (const i of g.indices) idx.push(i + base);
    base += g.vertices.length / STRIDE_FLOATS;
  }
  return { vertices: new Float32Array(v), indices: new Uint16Array(idx) };
}

export function toGeometry(g) {
  return new Geometry({
    vertices: g.vertices,
    indices: g.indices,
    primitive: "triangles",
    componentsPerVertex: STRIDE_FLOATS
  });
}

// Caja centrada en (cx,cy,cz) con un color uniforme.
export function crearCaja(cx, cy, cz, ancho, alto, prof, color) {
  const hx = ancho / 2, hy = alto / 2, hz = prof / 2;
  const verts = [];
  const idx = [];
  let base = 0;

  function cara(a, b, c, d, n) {
    for (const p of [a, b, c, d]) {
      verts.push(p[0], p[1], p[2], n[0], n[1], n[2], color[0], color[1], color[2]);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    base += 4;
  }

  cara([cx - hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz + hz], [cx + hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz + hz], [0, 0, 1]);
  cara([cx + hx, cy - hy, cz - hz], [cx - hx, cy - hy, cz - hz], [cx - hx, cy + hy, cz - hz], [cx + hx, cy + hy, cz - hz], [0, 0, -1]);
  cara([cx + hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz - hz], [cx + hx, cy + hy, cz - hz], [cx + hx, cy + hy, cz + hz], [1, 0, 0]);
  cara([cx - hx, cy - hy, cz - hz], [cx - hx, cy - hy, cz + hz], [cx - hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz - hz], [-1, 0, 0]);
  cara([cx - hx, cy + hy, cz + hz], [cx + hx, cy + hy, cz + hz], [cx + hx, cy + hy, cz - hz], [cx - hx, cy + hy, cz - hz], [0, 1, 0]);
  cara([cx - hx, cy - hy, cz - hz], [cx + hx, cy - hy, cz - hz], [cx + hx, cy - hy, cz + hz], [cx - hx, cy - hy, cz + hz], [0, -1, 0]);

  return { vertices: new Float32Array(verts), indices: new Uint16Array(idx) };
}

// Plano horizontal en XZ. alturaFn(x,z) da la altura y; colorFn(x,z,y) el color.
export function crearPlano(ancho, prof, segX, segZ, alturaFn, colorFn) {
  const verts = [];
  const idx = [];
  const e = 0.6;
  for (let j = 0; j <= segZ; j++) {
    const z = -prof / 2 + (prof * j) / segZ;
    for (let i = 0; i <= segX; i++) {
      const x = -ancho / 2 + (ancho * i) / segX;
      const y = alturaFn(x, z);
      const nx = alturaFn(x - e, z) - alturaFn(x + e, z);
      const nz = alturaFn(x, z - e) - alturaFn(x, z + e);
      const n = normalizar3([nx, 2 * e, nz]);
      const c = colorFn(x, z, y);
      verts.push(x, y, z, n[0], n[1], n[2], c[0], c[1], c[2]);
    }
  }
  const cols = segX + 1;
  for (let j = 0; j < segZ; j++) {
    for (let i = 0; i < segX; i++) {
      const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  return { vertices: new Float32Array(verts), indices: new Uint16Array(idx) };
}

// Estanque de tierra (concreto) en espacio local.
// Devuelve { concreto, agua }: muros+losa como una malla, agua como otra.
export function crearEstanque(Lx, Lz, aguaY) {
  const t = 0.6;   // grosor de muro
  const h = 1.8;   // altura de muro
  const gris = [0.60, 0.60, 0.58];
  const aguaColor = [0.10, 0.34, 0.42];

  const concreto = fusionar([
    crearCaja(0, -0.3, 0, Lx, 0.6, Lz, gris),                         // losa base
    crearCaja(0, h / 2, Lz / 2 - t / 2, Lx, h, t, gris),              // muro +Z
    crearCaja(0, h / 2, -Lz / 2 + t / 2, Lx, h, t, gris),             // muro -Z
    crearCaja(Lx / 2 - t / 2, h / 2, 0, t, h, Lz - 2 * t, gris),      // muro +X
    crearCaja(-Lx / 2 + t / 2, h / 2, 0, t, h, Lz - 2 * t, gris)      // muro -X
  ]);
  const agua = crearPlano(Lx - 2 * t, Lz - 2 * t, 24, 12, () => aguaY, () => aguaColor);
  return { concreto, agua };
}

// Esfera (o elipsoide) generada por código — Paso 7.
export function crearEsfera(radios, segmentosLatitud, segmentosLongitud, colorFn) {
  const [rx, ry, rz] = radios;
  const vertices = [];
  const indices = [];
  for (let latitud = 0; latitud <= segmentosLatitud; latitud++) {
    const v = latitud / segmentosLatitud;
    const phi = v * Math.PI;
    for (let longitud = 0; longitud <= segmentosLongitud; longitud++) {
      const u = longitud / segmentosLongitud;
      const theta = u * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      const n = normalizar3([nx / rx, ny / ry, nz / rz]);
      const c = colorFn(ny);
      vertices.push(rx * nx, ry * ny, rz * nz, n[0], n[1], n[2], c[0], c[1], c[2]);
    }
  }
  const columnas = segmentosLongitud + 1;
  for (let latitud = 0; latitud < segmentosLatitud; latitud++) {
    for (let longitud = 0; longitud < segmentosLongitud; longitud++) {
      const actual = latitud * columnas + longitud;
      const siguiente = actual + columnas;
      indices.push(actual, actual + 1, siguiente);
      indices.push(actual + 1, siguiente + 1, siguiente);
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

// Contracolorado de la trucha arcoíris
export function colorTrucha(ny) {
  if (ny > 0.45) return mezclarColor([0.30, 0.35, 0.30], [0.14, 0.20, 0.18], (ny - 0.45) / 0.55);
  if (ny < -0.45) return mezclarColor([0.62, 0.66, 0.68], [0.87, 0.89, 0.85], (-ny - 0.45) / 0.55);
  return [0.58, 0.62, 0.64];
}

// Trucha: cuerpo elipsoidal + cola
export function crearTrucha() {
  const cuerpo = crearEsfera([0.85, 0.36, 0.26], 12, 20, colorTrucha);
  const cola = crearCaja(-1.02, 0, 0, 0.42, 0.52, 0.07, [0.42, 0.47, 0.45]);
  return fusionar([cuerpo, cola]);
}

// Cono truncado / cilindro con tapas
export function crearCono(radioBase, radioTop, altura, segmentos, color) {
  const vertices = [];
  const indices = [];
  const medio = altura / 2;
  const pendiente = (radioBase - radioTop) / altura;

  for (let i = 0; i <= segmentos; i++) {
    const theta = (i / segmentos) * Math.PI * 2;
    const c = Math.cos(theta), s = Math.sin(theta);
    const n = normalizar3([c, pendiente, s]);
    vertices.push(radioBase * c, -medio, radioBase * s, n[0], n[1], n[2], color[0], color[1], color[2]);
    vertices.push(radioTop * c, medio, radioTop * s, n[0], n[1], n[2], color[0], color[1], color[2]);
  }
  for (let i = 0; i < segmentos; i++) {
    const a = i * 2, b = a + 2, c = a + 1, d = a + 3;
    indices.push(a, c, b, b, c, d);
  }

  const tapaTop = vertices.length / 9;
  vertices.push(0, medio, 0, 0, 1, 0, color[0], color[1], color[2]);
  for (let i = 0; i <= segmentos; i++) {
    const theta = (i / segmentos) * Math.PI * 2;
    vertices.push(radioTop * Math.cos(theta), medio, radioTop * Math.sin(theta), 0, 1, 0, color[0], color[1], color[2]);
  }
  for (let i = 0; i < segmentos; i++) indices.push(tapaTop, tapaTop + 2 + i, tapaTop + 1 + i);

  const tapaBottom = vertices.length / 9;
  vertices.push(0, -medio, 0, 0, -1, 0, color[0], color[1], color[2]);
  for (let i = 0; i <= segmentos; i++) {
    const theta = (i / segmentos) * Math.PI * 2;
    vertices.push(radioBase * Math.cos(theta), -medio, radioBase * Math.sin(theta), 0, -1, 0, color[0], color[1], color[2]);
  }
  for (let i = 0; i < segmentos; i++) indices.push(tapaBottom, tapaBottom + 1 + i, tapaBottom + 2 + i);

  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

// Aplica una matriz 4x4 a una geometría y devuelve una geometría nueva
export function transformarGeometria(geo, m) {
  const v = geo.vertices;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i += 9) {
    const p = transformarPunto4(m, [v[i], v[i + 1], v[i + 2]]);
    const n = normalizar3([
      m[0] * v[i + 3] + m[4] * v[i + 4] + m[8] * v[i + 5],
      m[1] * v[i + 3] + m[5] * v[i + 4] + m[9] * v[i + 5],
      m[2] * v[i + 3] + m[6] * v[i + 4] + m[10] * v[i + 5]
    ]);
    out[i] = p[0]; out[i + 1] = p[1]; out[i + 2] = p[2];
    out[i + 3] = n[0]; out[i + 4] = n[1]; out[i + 5] = n[2];
    out[i + 6] = v[i + 6]; out[i + 7] = v[i + 7]; out[i + 8] = v[i + 8];
  }
  return { vertices: out, indices: geo.indices };
}

export function fusionarTransformadas(lista) {
  return fusionar(lista.map(item => transformarGeometria(item.geo, item.matriz)));
}

export function crearIncubadora() {
  return fusionar([
    crearCaja(0, 2, 0, 10, 4, 7, [0.86, 0.86, 0.82]),   // cuerpo
    crearCaja(0, 4.4, 0, 11, 0.8, 8, [0.48, 0.30, 0.24]) // techo
  ]);
}
