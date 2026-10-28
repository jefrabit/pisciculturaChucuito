// ------------------------------------------------------------
// Construcciones.js — Piezas físicas de la piscicultura de Chucuito (Paso 16)
// ------------------------------------------------------------

import {
  fusionar, crearCaja, crearPlano, crearCono,
  crearEsfera, transformarGeometria
} from "./Geometrias.js";
import { matrizTraslacion4 } from "../math/Matrix4.js";

export const COL = {
  concreto: [0.60, 0.60, 0.58],
  concretoOscuro: [0.44, 0.44, 0.42],
  metal: [0.38, 0.43, 0.48],
  metalOscuro: [0.26, 0.30, 0.34],
  plastico: [0.20, 0.48, 0.36],
  galva: [0.74, 0.75, 0.74],
  madera: [0.46, 0.33, 0.20],
  blanco: [0.88, 0.88, 0.85],
  arbusto: [0.17, 0.30, 0.15],
  arbustoSeco: [0.34, 0.32, 0.16],
  roca: [0.47, 0.46, 0.43],
  boya: [0.88, 0.45, 0.12],
  agua: [0.16, 0.42, 0.48]
};

export function crearCompuerta(ancho, alto) {
  const poste = 0.16;
  const marco = fusionar([
    crearCaja(-ancho / 2 - poste, alto / 2, 0, poste, alto, poste, COL.metalOscuro),
    crearCaja(ancho / 2 + poste, alto / 2, 0, poste, alto, poste, COL.metalOscuro),
    crearCaja(0, alto + poste, 0, ancho + 2 * poste, poste, poste, COL.metalOscuro)
  ]);
  const hoja = crearCaja(0, alto / 2, 0, ancho, alto, 0.08, COL.metal);
  return { marco, hoja };
}

export function crearAireador() {
  const base = fusionar([
    crearCaja(0, 0.12, 0, 1.5, 0.34, 0.9, COL.plastico),
    crearCaja(0, 0.42, -0.28, 0.55, 0.35, 0.35, COL.metalOscuro)
  ]);
  const hlice = fusionar([
    crearCaja(0, 0, 0, 0.9, 0.07, 0.07, COL.metal),
    crearCaja(0, 0.16, 0, 0.8, 0.28, 0.05, COL.metal),
    crearCaja(0, -0.16, 0, 0.8, 0.28, 0.05, COL.metal),
    crearCaja(0, 0, 0, 0.07, 0.07, 0.55, COL.metal)
  ]);
  return { base, hlice };
}

export function crearSilo() {
  const patas = fusionar([
    crearCaja(-0.55, 0.6, -0.55, 0.12, 1.2, 0.12, COL.metalOscuro),
    crearCaja(0.55, 0.6, -0.55, 0.12, 1.2, 0.12, COL.metalOscuro),
    crearCaja(-0.55, 0.6, 0.55, 0.12, 1.2, 0.12, COL.metalOscuro),
    crearCaja(0.55, 0.6, 0.55, 0.12, 1.2, 0.12, COL.metalOscuro)
  ]);
  const cono = transformarGeometria(crearCono(1.0, 0.22, 0.9, 16, COL.galva), matrizTraslacion4(0, 1.65, 0));
  const tubo = transformarGeometria(crearCono(1.0, 1.0, 2.2, 16, COL.galva), matrizTraslacion4(0, 3.2, 0));
  const remate = transformarGeometria(crearCono(0.22, 0.22, 0.35, 10, COL.metalOscuro), matrizTraslacion4(0, 4.48, 0));
  return fusionar([patas, cono, tubo, remate]);
}

export function crearCartel() {
  return fusionar([
    crearCaja(-1.0, 0.9, 0, 0.14, 1.8, 0.14, COL.madera),
    crearCaja(1.0, 0.9, 0, 0.14, 1.8, 0.14, COL.madera),
    crearCaja(0, 1.75, 0, 2.6, 1.0, 0.12, COL.blanco)
  ]);
}

export function crearArtesa() {
  const marco = fusionar([
    crearCaja(0, 0.18, 0, 2.4, 0.28, 0.9, COL.metal),
    crearCaja(-0.9, -0.25, 0, 0.1, 0.5, 0.1, COL.metalOscuro),
    crearCaja(0.9, -0.25, 0, 0.1, 0.5, 0.1, COL.metalOscuro)
  ]);
  const agua = crearPlano(2.2, 0.72, 4, 2, () => 0.28, () => COL.agua);
  return { marco, agua };
}

export function crearTanque() {
  return fusionar([
    crearCono(1.6, 1.6, 2.4, 18, COL.concreto),
    crearCono(1.7, 0.25, 0.8, 18, COL.metalOscuro)
  ]);
}

export function crearTuberia(longitud, radio) {
  return crearCono(radio, radio, longitud, 10, COL.galva);
}

export function crearBoya() {
  return fusionar([
    crearEsfera([0.22, 0.18, 0.22], 8, 12, () => COL.boya),
    crearCono(0.05, 0.05, 0.35, 6, COL.metalOscuro)
  ]);
}

export function crearPoste() {
  return crearCono(0.07, 0.06, 1.5, 6, COL.madera);
}

export function crearArbusto() {
  return crearEsfera([0.9, 0.55, 0.9], 7, 10, () => COL.arbusto);
}

export function crearRoca(variacion = 0) {
  const k = 1 + variacion * 0.25;
  return crearEsfera([0.7 * k, 0.42 * k, 0.62 * k], 6, 9, () => COL.roca);
}
