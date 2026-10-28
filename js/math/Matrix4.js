// ------------------------------------------------------------
// Matrix4.js — Matemática matricial 4x4 (column-major)
// Implementa la especificación del Paso 16 del curso y unifica
// las operaciones de cámara y transformaciones del proyecto.
// ------------------------------------------------------------

export class Matrix4 {
  static identidad() {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }

  static traslacion(tx, ty, tz) {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      tx, ty, tz, 1
    ]);
  }

  static escala(sx, sy, sz) {
    return new Float32Array([
      sx, 0, 0, 0,
      0, sy, 0, 0,
      0, 0, sz, 0,
      0, 0, 0, 1
    ]);
  }

  static rotacionX(angulo) {
    const c = Math.cos(angulo);
    const s = Math.sin(angulo);
    return new Float32Array([
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1
    ]);
  }

  static rotacionY(angulo) {
    const c = Math.cos(angulo);
    const s = Math.sin(angulo);
    return new Float32Array([
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1
    ]);
  }

  static rotacionZ(angulo) {
    const c = Math.cos(angulo);
    const s = Math.sin(angulo);
    return new Float32Array([
      c, s, 0, 0,
      -s, c, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }

  static multiplicar(a, b) {
    const r = new Float32Array(16);
    for (let col = 0; col < 4; col++) {
      for (let fila = 0; fila < 4; fila++) {
        let suma = 0;
        for (let k = 0; k < 4; k++) {
          suma += a[k * 4 + fila] * b[col * 4 + k];
        }
        r[col * 4 + fila] = suma;
      }
    }
    return r;
  }

  static compose(position, rotation, scale) {
    const px = position.x ?? position[0] ?? 0;
    const py = position.y ?? position[1] ?? 0;
    const pz = position.z ?? position[2] ?? 0;
    const rx = rotation.x ?? rotation[0] ?? 0;
    const ry = rotation.y ?? rotation[1] ?? 0;
    const rz = rotation.z ?? rotation[2] ?? 0;
    const sx = scale.x ?? scale[0] ?? 1;
    const sy = scale.y ?? scale[1] ?? 1;
    const sz = scale.z ?? scale[2] ?? 1;

    const T = Matrix4.traslacion(px, py, pz);
    const Rx = Matrix4.rotacionX(rx);
    const Ry = Matrix4.rotacionY(ry);
    const Rz = Matrix4.rotacionZ(rz);
    const S = Matrix4.escala(sx, sy, sz);
    const R = Matrix4.multiplicar(Rz, Matrix4.multiplicar(Ry, Rx));
    return Matrix4.multiplicar(T, Matrix4.multiplicar(R, S));
  }

  static lookAt(eye, target, up = [0, 1, 0]) {
    const zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
    let len = Math.sqrt(zx * zx + zy * zy + zz * zz) || 1;
    const fz = [zx / len, zy / len, zz / len];

    const sx = up[1] * fz[2] - up[2] * fz[1];
    const sy = up[2] * fz[0] - up[0] * fz[2];
    const sz = up[0] * fz[1] - up[1] * fz[0];
    len = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
    const s = [sx / len, sy / len, sz / len];

    const u = [
      fz[1] * s[2] - fz[2] * s[1],
      fz[2] * s[0] - fz[0] * s[2],
      fz[0] * s[1] - fz[1] * s[0]
    ];

    return new Float32Array([
      s[0], u[0], fz[0], 0,
      s[1], u[1], fz[1], 0,
      s[2], u[2], fz[2], 0,
      -(s[0] * eye[0] + s[1] * eye[1] + s[2] * eye[2]),
      -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]),
      -(fz[0] * eye[0] + fz[1] * eye[1] + fz[2] * eye[2]),
      1
    ]);
  }

  static mirarDesde(eye, target, up) {
    return Matrix4.lookAt(eye, target, up);
  }

  static perspectiva(fov, aspect, near, far) {
    const fovRad = fov > 3.15 ? (fov * Math.PI) / 180 : fov;
    const f = 1.0 / Math.tan(fovRad / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  }

  static perspective(fov, aspect, near, far) {
    return Matrix4.perspectiva(fov, aspect, near, far);
  }

  static normalizar(v) {
    const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }

  static cruzar(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  static transformarPunto(m, p) {
    const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
    return [
      (m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) / w,
      (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) / w,
      (m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]) / w
    ];
  }

  static transformarPunto4(m, p) {
    return [
      m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
      m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
      m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]
    ];
  }

  static mezclarColor(a, b, t) {
    const k = Math.max(0, Math.min(1, t));
    return [
      a[0] + (b[0] - a[0]) * k,
      a[1] + (b[1] - a[1]) * k,
      a[2] + (b[2] - a[2]) * k
    ];
  }
}

// Exportación de helpers globales convenientes
export const matrizTraslacion4 = Matrix4.traslacion;
export const matrizEscala4 = Matrix4.escala;
export const matrizRotacionX = Matrix4.rotacionX;
export const matrizRotacionY = Matrix4.rotacionY;
export const matrizRotacionZ = Matrix4.rotacionZ;
export const multiplicarMat4 = Matrix4.multiplicar;
export const lookAt = Matrix4.lookAt;
export const perspective = Matrix4.perspectiva;
export const normalizar3 = Matrix4.normalizar;
export const productoCruz = Matrix4.cruzar;
export const transformarPunto = Matrix4.transformarPunto;
export const transformarPunto4 = Matrix4.transformarPunto4;
export const mezclarColor = Matrix4.mezclarColor;
