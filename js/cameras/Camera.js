// ------------------------------------------------------------
// CAMERA (Paso 16)
// Camera es un Object3D: aporta punto de vista, no geometría.
// ------------------------------------------------------------
import { Object3D } from "../core/Object3D.js";
import { Matrix4 } from "../math/Matrix4.js";

export class Camera extends Object3D {
  constructor() {
    super();
    this.target = { x: 0, y: 0, z: 0 };
    this.up = { x: 0, y: 1, z: 0 };
    this.viewMatrix = Matrix4.identidad();
    this.projectionMatrix = Matrix4.identidad();
  }

  updateViewMatrix() {
    this.viewMatrix = Matrix4.lookAt(
      [this.position.x, this.position.y, this.position.z],
      [this.target.x, this.target.y, this.target.z],
      [this.up.x, this.up.y, this.up.z]
    );
  }
}