// ------------------------------------------------------------
// OBJECT3D (Paso 16)
// Nodo espacial: posición, rotación, escala y jerarquía.
// Scene, Mesh, Line y Camera heredan de aquí.
// ------------------------------------------------------------
import { Matrix4 } from "../math/Matrix4.js";

export class Object3D {
  constructor() {
    this.position = { x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = { x: 1, y: 1, z: 1 };

    this.parent = null;
    this.children = [];
    this.visible = true;

    this.matrix = Matrix4.identidad();
    this.matrixWorld = Matrix4.identidad();
    this.matrixAutoUpdate = true;
  }

  add(child) {
    if (child.parent) {
      child.parent.remove(child);
    }
    child.parent = this;
    this.children.push(child);
    return child;
  }

  remove(child) {
    const indice = this.children.indexOf(child);
    if (indice !== -1) {
      this.children.splice(indice, 1);
      child.parent = null;
    }
    return child;
  }

  updateMatrix() {
    if (this.matrixAutoUpdate) {
      this.matrix = Matrix4.compose(this.position, this.rotation, this.scale);
    }
  }

  // Recorre el árbol: matrixWorld = matrixWorldPadre * matrix.
  updateMatrixWorld(parentMatrix = null) {
    this.updateMatrix();

    if (parentMatrix) {
      this.matrixWorld = Matrix4.multiplicar(parentMatrix, this.matrix);
    } else {
      this.matrixWorld = this.matrix;
    }

    for (const child of this.children) {
      child.updateMatrixWorld(this.matrixWorld);
    }
  }
}
