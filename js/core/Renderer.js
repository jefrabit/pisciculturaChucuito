// ------------------------------------------------------------
// Renderer.js — Mini Motor Gráfico WebGL2 (Paso 16)
// Frontera entre la escena de alto nivel y la API de WebGL2.
// Shaders, buffers, uniforms, orden de dibujo y transparencia.
// ------------------------------------------------------------

const VERTEX_SHADER = `#version 300 es
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 aColor;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;
uniform float uTime;
uniform float uWaveAmp;

out vec3 vNormal;
out vec3 vColor;

void main() {
  vec3 p = aPosition;
  p.y += sin(p.x * 0.8 + uTime * 1.6) * cos(p.z * 0.7 + uTime * 1.1) * uWaveAmp;
  gl_Position = uProj * uView * uModel * vec4(p, 1.0);
  vNormal = normalize(mat3(uModel) * aNormal);
  vColor = aColor;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 vNormal;
in vec3 vColor;

uniform vec3 uLightDir;    // dirección HACIA la luz (hacia el sol)
uniform vec3 uLightColor;  // color e intensidad de la luz
uniform vec3 uAmbColor;    // luz ambiental de fondo
uniform vec3 uTint;        // tinte multiplicado (agua turbia)
uniform float uAlpha;      // 1 = opaco; <1 para agua (transparente)

out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  float dif = max(dot(N, uLightDir), 0.0);
  vec3 luz = uAmbColor + dif * uLightColor;
  outColor = vec4(vColor * uTint * luz, uAlpha);
}
`;

export class Renderer {
  constructor(canvasOrGl) {
    if (canvasOrGl && (canvasOrGl instanceof HTMLCanvasElement || canvasOrGl.getContext)) {
      this.canvas = canvasOrGl;
      this.gl = canvasOrGl.getContext("webgl2");
      if (!this.gl) throw new Error("WebGL2 no está disponible en este navegador.");
    } else {
      this.gl = canvasOrGl;
      this.canvas = canvasOrGl ? canvasOrGl.canvas : null;
    }

    const gl = this.gl;
    const canvas = this.canvas || (gl ? gl.canvas : null);
    if (gl && canvas) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.DEPTH_TEST);
    }

    this.program = this.crearPrograma(VERTEX_SHADER, FRAGMENT_SHADER);

    this.U = {};
    for (const n of [
      "uModel", "uView", "uProj", "uTime", "uWaveAmp",
      "uLightDir", "uLightColor", "uAmbColor", "uTint", "uAlpha"
    ]) {
      this.U[n] = gl.getUniformLocation(this.program, n);
    }
  }

  crearShader(tipo, src) {
    const gl = this.gl;
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error("Shader Error:\n" + err);
    }
    return s;
  }

  crearPrograma(vsSrc, fsSrc) {
    const gl = this.gl;
    const p = gl.createProgram();
    gl.attachShader(p, this.crearShader(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, this.crearShader(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error("Programa Error:\n" + gl.getProgramInfoLog(p));
    }
    return p;
  }

  initGeometry(geometry) {
    if (geometry.initialized && geometry.vao) return;
    const gl = this.gl;

    geometry.vao = gl.createVertexArray();
    gl.bindVertexArray(geometry.vao);

    geometry.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, geometry.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW);

    if (geometry.indices) {
      geometry.ebo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.ebo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);
    }

    // Stride = 9 floats: pos(3) normal(3) color(3)
    const stride = (geometry.componentsPerVertex || 9) * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 24);

    gl.bindVertexArray(null);
    geometry.initialized = true;
  }

  render(scene, camera, opts = {}) {
    const gl = this.gl;

    // Actualizar transformaciones de cámara y grafo de escena
    camera.updateViewMatrix();
    camera.updateProjectionMatrix();
    scene.updateMatrixWorld();

    const cielo = opts.skyColor || [0.05, 0.07, 0.12];
    gl.clearColor(cielo[0], cielo[1], cielo[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.U.uView, false, camera.viewMatrix);
    gl.uniformMatrix4fv(this.U.uProj, false, camera.projectionMatrix);
    gl.uniform1f(this.U.uTime, opts.time || 0);
    gl.uniform3fv(this.U.uLightDir, opts.lightDir || [0, 1, 0]);
    gl.uniform3fv(this.U.uLightColor, opts.lightColor || [1, 1, 1]);
    gl.uniform3fv(this.U.uAmbColor, opts.ambColor || [0.2, 0.2, 0.2]);

    // Separar objetos sólidos y transparentes (agua)
    const solidos = [];
    const transparentes = [];

    function recorrer(obj) {
      if (!obj.visible) return;
      if (obj.geometry && obj.material) {
        if (obj.material.transparent) {
          transparentes.push(obj);
        } else {
          solidos.push(obj);
        }
      }
      for (const hijo of obj.children) {
        recorrer(hijo);
      }
    }
    recorrer(scene);

    // 1. Dibujar sólidos opacos
    for (const mesh of solidos) {
      this.drawMesh(mesh);
    }

    // 2. Dibujar agua translúcida ordenada de LEJOS a CERCA
    if (transparentes.length > 0) {
      const eye = [camera.position.x, camera.position.y, camera.position.z];
      transparentes.sort((a, b) => {
        const ma = a.matrixWorld, mb = b.matrixWorld;
        const da = (ma[12] - eye[0]) ** 2 + (ma[13] - eye[1]) ** 2 + (ma[14] - eye[2]) ** 2;
        const db = (mb[12] - eye[0]) ** 2 + (mb[13] - eye[1]) ** 2 + (mb[14] - eye[2]) ** 2;
        return db - da; // de más lejos a más cerca
      });

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);

      for (const mesh of transparentes) {
        this.drawMesh(mesh);
      }

      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
  }

  drawMesh(mesh) {
    const gl = this.gl;
    const geo = mesh.geometry;
    const mat = mesh.material;

    this.initGeometry(geo);

    gl.uniformMatrix4fv(this.U.uModel, false, mesh.matrixWorld);
    gl.uniform1f(this.U.uWaveAmp, mat.waveAmp || 0);
    gl.uniform3fv(this.U.uTint, mat.tint || [1, 1, 1]);
    gl.uniform1f(this.U.uAlpha, mat.alpha !== undefined ? mat.alpha : 1.0);

    gl.bindVertexArray(geo.vao);
    if (geo.indices) {
      gl.drawElements(gl.TRIANGLES, geo.indexCount, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, geo.vertexCount);
    }
    gl.bindVertexArray(null);
  }
}
