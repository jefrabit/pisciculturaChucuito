// ------------------------------------------------------------
// Geometry.js — Datos de geometría y recursos de GPU (Paso 16)
// Almacena vértices, índices y gestiona VAO/VBO/EBO.
// Stride por defecto = 9 floats: pos(3) | normal(3) | color(3).
// ------------------------------------------------------------

export const STRIDE_FLOATS = 9;

export class Geometry {
  constructor({
    vertices = null,
    indices = null,
    primitive = "triangles",
    componentsPerVertex = STRIDE_FLOATS
  } = {}) {
    this.vertices = vertices;
    this.indices = indices;
    this.primitive = primitive;
    this.componentsPerVertex = componentsPerVertex;

    this.vertexCount = vertices ? (vertices.length / componentsPerVertex) : 0;
    this.indexCount = indices ? indices.length : this.vertexCount;

    // Recursos GPU gestionados perezosamente por Renderer
    this.vao = null;
    this.vbo = null;
    this.ebo = null;
    this.initialized = false;
  }
}
