// ------------------------------------------------------------
// LINE MATERIAL (Paso 14/16)
// Apariencia de una línea: color plano, sin iluminación.
// ------------------------------------------------------------
export class LineMaterial {
  constructor({ color = [1, 1, 1] } = {}) {
    this.color = color;
  }
}