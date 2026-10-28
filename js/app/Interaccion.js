// ------------------------------------------------------------
// Interaccion.js — Raycasting, selección con ratón y panel de detalle (Paso 16)
// ------------------------------------------------------------

import { normalizar3, productoCruz } from "../math/Matrix4.js";
import { SIM } from "./Simulador.js";

const SELECCIONABLES = [];

export function registrarSeleccionable(id, nombre, min, max) {
  SELECCIONABLES.push({ id, nombre, min, max });
}

export function interseccionRayaCaja(origen, dir, min, max) {
  let t0 = 0, t1 = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dir[i]) < 1e-8) {
      if (origen[i] < min[i] || origen[i] > max[i]) return null;
    } else {
      let ta = (min[i] - origen[i]) / dir[i];
      let tb = (max[i] - origen[i]) / dir[i];
      if (ta > tb) { const tmp = ta; ta = tb; tb = tmp; }
      if (ta > t0) t0 = ta;
      if (tb < t1) t1 = tb;
      if (t0 > t1) return null;
    }
  }
  return t0;
}

export function rayoDesdePantalla(mx, my, canvas, eye, objetivo, fovGrados) {
  const forward = normalizar3([objetivo[0] - eye[0], objetivo[1] - eye[1], objetivo[2] - eye[2]]);
  const right = normalizar3(productoCruz(forward, [0, 1, 0]));
  const up = productoCruz(right, forward);
  const ndcX = (2 * mx / canvas.clientWidth) - 1;
  const ndcY = 1 - (2 * my / canvas.clientHeight);
  const tanF = Math.tan(fovGrados * Math.PI / 180 / 2);
  const aspect = canvas.clientWidth / canvas.clientHeight;
  return {
    origen: eye,
    dir: normalizar3([
      forward[0] + right[0] * ndcX * tanF * aspect + up[0] * ndcY * tanF,
      forward[1] + right[1] * ndcX * tanF * aspect + up[1] * ndcY * tanF,
      forward[2] + right[2] * ndcX * tanF * aspect + up[2] * ndcY * tanF
    ])
  };
}

export function seleccionarDesdePantalla(mx, my, canvas, eye, objetivo, fovGrados) {
  const rayo = rayoDesdePantalla(mx, my, canvas, eye, objetivo, fovGrados);
  let mejor = null, mejorT = Infinity;
  for (const s of SELECCIONABLES) {
    const t = interseccionRayaCaja(rayo.origen, rayo.dir, s.min, s.max);
    if (t !== null && t < mejorT) { mejorT = t; mejor = s; }
  }
  return mejor;
}

const PARAM_DETALLE = [
  ["od", "Oxígeno", "mg/L", 1, 5],
  ["temp", "Temperatura", "°C", 1, null],
  ["ph", "pH", "", 2, null],
  ["nh3", "Amoníaco", "mg/L", 3, 0.02],
  ["ntu", "Turbidez", "NTU", 1, null],
  ["nivel", "Nivel", "m", 2, null]
];

let detalleIndice = -1;
let detalleParam = "od";

export function crearPanelDetalle() {
  let panel = document.getElementById("detalle");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "detalle";
    panel.innerHTML =
      '<div class="det-cab"><h3 id="det-titulo">Detalle</h3>' +
      '<button id="det-cerrar" title="Cerrar">✕</button></div>' +
      '<div id="det-tabs" class="det-tabs"></div>' +
      '<canvas id="det-grafica" width="440" height="150"></canvas>' +
      '<div id="det-valores" class="det-valores"></div>';
    document.body.appendChild(panel);
  }

  const tabs = document.getElementById("det-tabs");
  tabs.innerHTML = "";
  for (const [key, label] of PARAM_DETALLE) {
    const b = document.createElement("button");
    b.textContent = label;
    b.dataset.k = key;
    b.onclick = () => { detalleParam = key; actualizarDetalle(); };
    tabs.appendChild(b);
  }
  document.getElementById("det-cerrar").onclick = () => {
    panel.style.display = "none";
    detalleIndice = -1;
  };
  return panel;
}

export function mostrarDetalle(indice) {
  detalleIndice = indice;
  const panel = document.getElementById("detalle");
  if (!panel) return;
  panel.style.display = "block";
  document.getElementById("det-titulo").textContent = SIM.estanques[indice].nombre;
  actualizarDetalle();
}

export function actualizarDetalle() {
  if (detalleIndice < 0) return;
  const est = SIM.estanques[detalleIndice];
  if (!est || !est.m) return;

  for (const b of document.querySelectorAll("#det-tabs button")) {
    b.classList.toggle("activo", b.dataset.k === detalleParam);
  }

  const filas = PARAM_DETALLE.map(([k, label, unidad, dec]) =>
    '<div class="fila"><span class="etq">' + label + '</span>' +
    '<span class="val">' + est.m[k].toFixed(dec) + '</span>' +
    '<span class="uni">' + unidad + '</span></div>').join("");
  document.getElementById("det-valores").innerHTML = filas;

  const canvasGrafica = document.getElementById("det-grafica");
  if (!canvasGrafica) return;
  const ctx = canvasGrafica.getContext("2d");
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const hist = SIM.historial[detalleIndice];
  const def = PARAM_DETALLE.find(p => p[0] === detalleParam);
  const umbral = def ? def[4] : null;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0d1420";
  ctx.fillRect(0, 0, w, h);
  if (!hist || hist.length < 2) return;

  let vmax = -Infinity, vmin = Infinity;
  for (const p of hist) {
    vmax = Math.max(vmax, p[detalleParam]);
    vmin = Math.min(vmin, p[detalleParam]);
  }
  if (umbral !== null) { vmax = Math.max(vmax, umbral * 1.4); }
  vmax = Math.max(vmax, vmin + 0.5);
  vmin = Math.max(0, vmin - (vmax - vmin) * 0.15);

  if (umbral !== null) {
    const y = h - ((umbral - vmin) / (vmax - vmin)) * h;
    ctx.strokeStyle = "rgba(255,90,90,0.75)"; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,120,120,0.9)"; ctx.font = "10px sans-serif";
    ctx.fillText("límite " + umbral, 6, y - 4);
  }

  ctx.strokeStyle = "#4fc3f7"; ctx.lineWidth = 1.8; ctx.beginPath();
  hist.forEach((p, i) => {
    const x = ((p.t - (SIM.T - 24)) / 24) * w;
    const y = h - ((p[detalleParam] - vmin) / (vmax - vmin)) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}
