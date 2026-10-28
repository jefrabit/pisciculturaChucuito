// ------------------------------------------------------------
// PERSPECTIVE CAMERA (Paso 16)
// Añade FOV, aspect, near y far a Camera.
// ------------------------------------------------------------
import { Camera } from "./Camera.js";
import { Matrix4 } from "../math/Matrix4.js";

export class PerspectiveCamera extends Camera {
  constructor(fovGrados, aspect, near, far) {
    super();
    this.fov = fovGrados;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.updateProjectionMatrix();
  }

  updateProjectionMatrix() {
    this.projectionMatrix = Matrix4.perspectiva(
      this.fov,
      this.aspect,
      this.near,
      this.far
    );
  }
}