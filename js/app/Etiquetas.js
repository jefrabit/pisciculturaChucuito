// ------------------------------------------------------------
// Etiquetas.js — Proyección de etiquetas 3D a pantalla DOM (Paso 16)
// Proyecta coordenadas de mundo 3D a coordenadas CSS del canvas.
// ------------------------------------------------------------

import { multiplicarMat4, transformarPunto } from "../math/Matrix4.js";

const ANCLAS = [];

export function registrarEtiqueta(posicion, clase) {
  const cont = document.getElementById("etiquetas");
  if (!cont) return { el: null, posicion, contenido: "" };
  const el = document.createElement("div");
  el.className = "etiqueta " + clase;
  cont.appendChild(el);
  const ancla = { el, posicion, contenido: "", ultimoContenido: "" };
  ANCLAS.push(ancla);
  return ancla;
}

export function actualizarEtiquetas(vista, proj, canvas) {
  const vp = multiplicarMat4(proj, vista);
  for (const a of ANCLAS) {
    if (!a.el) continue;
    if (a.contenido !== a.ultimoContenido) {
      a.el.innerHTML = a.contenido;
      a.ultimoContenido = a.contenido;
    }
    const ndc = transformarPunto(vp, a.posicion);
    if (ndc[2] > 1 || ndc[2] < -1) {
      a.el.style.display = "none";
      continue;
    }
    a.el.style.display = "block";
    const x = (ndc[0] * 0.5 + 0.5) * canvas.clientWidth;
    const y = (1 - (ndc[1] * 0.5 + 0.5)) * canvas.clientHeight;
    a.el.style.left = x + "px";
    a.el.style.top = y + "px";
  }
}
