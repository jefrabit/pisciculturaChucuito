// ------------------------------------------------------------
// LINE (Paso 14/16)
// Objeto visible sin volumen: Geometry + LineMaterial.
// Se dibuja con LINE_LOOP o LINE_STRIP (según geometry.primitive).
// ------------------------------------------------------------
import { Object3D } from "../core/Object3D.js";

export class Line extends Object3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}