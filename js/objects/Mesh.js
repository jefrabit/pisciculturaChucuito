// ------------------------------------------------------------
// Mesh.js — Objeto 3D visible: geometría + material (Paso 16)
// ------------------------------------------------------------
import { Object3D } from "../core/Object3D.js";

export class Mesh extends Object3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.indiceEstanque = -1; // Para enlazar agua a telemetría de estanque
  }
}