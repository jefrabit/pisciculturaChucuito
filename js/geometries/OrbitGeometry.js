// ------------------------------------------------------------
// ORBIT GEOMETRY (Pasos 11/14/16)
// Líneas para órbitas, trayectorias y el cerco perimetral.
// Formato: pos(3) solo (sin normal/uv) → componentsPerVertex=3.
// primitive: "lineLoop" (cerrado) o "lineStrip" (abierto).
// ------------------------------------------------------------
import { Geometry } from "../core/Geometry.js";

// Circunferencia en XZ (útil para órbitas y cerco cerrado).
export function crearOrbitaCircular(radioX, radioZ, segmentos = 64) {
  const puntos = [];
  for (let i = 0; i < segmentos; i++) {
    const t = i / segmentos;
    const angulo = t * Math.PI * 2;
    puntos.push(Math.cos(angulo) * radioX, 0, Math.sin(angulo) * radioZ);
  }
  return new Geometry({
    vertices: new Float32Array(puntos),
    primitive: "lineLoop",
    componentsPerVertex: 3,
    hasNormals: false,
    hasUvs: false
  });
}

// Polilínea abierta (abierta, dibujada con LINE_STRIP) → la cascada.
// `puntos` es un array plano [x,y,z, x,y,z, ...].
export function crearPolilinea(puntos) {
  return new Geometry({
    vertices: new Float32Array(puntos),
    primitive: "lineStrip",
    componentsPerVertex: 3,
    hasNormals: false,
    hasUvs: false
  });
}