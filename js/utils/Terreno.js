// ------------------------------------------------------------
// Terreno.js — Heightmap REAL de la piscicultura de Chucuito, Puno (Paso 16)
//
// Fuente: OpenTopoData, dataset SRTM30m.
//   Punto verificado: -15.8968963, -69.8965143 = 3921 m snm.
// Grilla 15x15 sobre ~1 km x 1 km.
// ------------------------------------------------------------

import { Geometry } from "../core/Geometry.js";
import { mezclarColor, normalizar3 } from "../math/Matrix4.js";

export const TERRENO_REAL = {
  N: 15,
  latSur: -15.9013963, latNorte: -15.8923963,
  lonOeste: -69.9010143, lonEste: -69.8920143,
  ref_m: 3921,        // elevación de referencia (el sitio) → y = 0
  mPorUnidad: 11.1,   // metros por unidad de escena (1 km ≈ 90 unidades)
  elev: [
    [4061, 4042, 4019, 4005, 3981, 3954, 3943, 3943, 3934, 3928, 3915, 3910, 3909, 3914, 3903],
    [4038, 4024, 4012, 4000, 3985, 3966, 3943, 3934, 3924, 3914, 3908, 3903, 3901, 3904, 3896],
    [4026, 4012, 4004, 3988, 3980, 3970, 3962, 3950, 3937, 3929, 3915, 3900, 3885, 3884, 3883],
    [4026, 4007, 3996, 3979, 3970, 3968, 3969, 3963, 3952, 3946, 3932, 3918, 3896, 3880, 3870],
    [4031, 4015, 3997, 3979, 3965, 3957, 3957, 3960, 3960, 3951, 3946, 3934, 3909, 3890, 3876],
    [4034, 4017, 4001, 3983, 3963, 3948, 3946, 3954, 3955, 3950, 3942, 3934, 3923, 3906, 3890],
    [4029, 4014, 4002, 3983, 3965, 3943, 3935, 3937, 3942, 3943, 3938, 3933, 3922, 3915, 3905],
    [4026, 4012, 4002, 3987, 3967, 3946, 3930, 3921, 3924, 3924, 3926, 3928, 3918, 3913, 3907],
    [4012, 4008, 3997, 3988, 3972, 3955, 3935, 3918, 3905, 3901, 3905, 3908, 3909, 3909, 3903],
    [3999, 3997, 3991, 3985, 3972, 3960, 3945, 3925, 3907, 3893, 3886, 3891, 3896, 3898, 3901],
    [3985, 3986, 3979, 3976, 3969, 3957, 3947, 3937, 3921, 3905, 3886, 3872, 3877, 3885, 3895],
    [3976, 3970, 3964, 3967, 3962, 3952, 3943, 3934, 3926, 3913, 3894, 3874, 3867, 3872, 3884],
    [3975, 3958, 3948, 3951, 3948, 3942, 3937, 3929, 3919, 3909, 3892, 3875, 3860, 3862, 3875],
    [3977, 3959, 3939, 3929, 3932, 3930, 3929, 3927, 3915, 3907, 3893, 3878, 3862, 3856, 3864],
    [3980, 3964, 3946, 3929, 3919, 3925, 3923, 3919, 3912, 3902, 3887, 3879, 3865, 3851, 3855]
  ]
};

const TERMINO_MITAD = 45;

export function alturaRealPura(x, z) {
  const N = TERRENO_REAL.N;
  const u = (x + TERMINO_MITAD) / (2 * TERMINO_MITAD); // 0..1 oeste→este
  const v = (z + TERMINO_MITAD) / (2 * TERMINO_MITAD); // 0..1 sur→norte
  const fc = Math.max(0, Math.min(N - 1, u * (N - 1)));
  const fr = Math.max(0, Math.min(N - 1, v * (N - 1)));
  const c0 = Math.min(N - 2, Math.floor(fc));
  const r0 = Math.min(N - 2, Math.floor(fr));
  const tc = fc - c0, tr = fr - r0;
  const e = TERRENO_REAL.elev;
  const e00 = e[r0][c0], e01 = e[r0][c0 + 1];
  const e10 = e[r0 + 1][c0], e11 = e[r0 + 1][c0 + 1];
  const elev = e00 * (1 - tc) * (1 - tr) + e01 * tc * (1 - tr) +
               e10 * (1 - tc) * tr + e11 * tc * tr;
  return (elev - TERRENO_REAL.ref_m) / TERRENO_REAL.mPorUnidad;
}

let PADS = [];
export function definirPads(lista) {
  PADS = lista.map(p => ({ ...p, h: alturaRealPura(p.cx, p.cz) }));
}

export function alturaTerreno(x, z) {
  let h = alturaRealPura(x, z);
  for (const p of PADS) {
    const dFuera = Math.max(Math.abs(x - p.cx) - p.hx, Math.abs(z - p.cz) - p.hz);
    if (dFuera <= 0) {
      h = p.h;                                   // dentro: plataforma nivelada
    } else if (dFuera < p.suave) {               // borde: transición suave
      const t = dFuera / p.suave;
      const suave = t * t * (3 - 2 * t);         // smoothstep
      h = p.h + (h - p.h) * suave;
    }
  }
  return h;
}

export function colorTerreno(x, z, y) {
  const t = Math.max(0, Math.min(1, (y - 1) / 11)); // y real: -6 (lago) .. +12 (cerros)
  return mezclarColor([0.40, 0.50, 0.26], [0.54, 0.46, 0.34], t); // pasto ↔ tierra alta
}

export function crearMallaTerreno(ancho = 90, prof = 90, segX = 72, segZ = 72) {
  const verts = [];
  const idx = [];
  const e = 0.6;
  for (let j = 0; j <= segZ; j++) {
    const z = -prof / 2 + (prof * j) / segZ;
    for (let i = 0; i <= segX; i++) {
      const x = -ancho / 2 + (ancho * i) / segX;
      const y = alturaTerreno(x, z);
      const nx = alturaTerreno(x - e, z) - alturaTerreno(x + e, z);
      const nz = alturaTerreno(x, z - e) - alturaTerreno(x, z + e);
      const n = normalizar3([nx, 2 * e, nz]);
      const c = colorTerreno(x, z, y);
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
  return new Geometry({
    vertices: new Float32Array(verts),
    indices: new Uint16Array(idx),
    primitive: "triangles",
    componentsPerVertex: 9
  });
}
