// ------------------------------------------------------------
// BasicMaterial.js — Parámetros de apariencia (Paso 16)
// Encapsula color, tinte (agua turbia), transparencia y olas.
// ------------------------------------------------------------

export class BasicMaterial {
  constructor({
    color = [1, 1, 1],
    tint = [1, 1, 1],
    alpha = 1.0,
    waveAmp = 0.0,
    transparent = false
  } = {}) {
    this.color = color;
    this.tint = tint;
    this.alpha = alpha;
    this.waveAmp = waveAmp;
    this.transparent = transparent || (alpha < 1.0);
  }
}
