// ------------------------------------------------------------
// AstrosDOM.js — Sol y Luna renderizados en Canvas 2D superpuesto
// Proyecta la posición 3D del astro con la misma VP de la cámara
// y dibuja discos con gradientes radiales (sin WebGL).
// ------------------------------------------------------------

import { multiplicarMat4, transformarPunto } from "../math/Matrix4.js";

let canvas2d = null;
let ctx = null;

export function initAstros(canvasWebGL) {
  // Canvas 2D con el mismo buffer que el WebGL, anclado con inset:0 al padre
  // (#escena): sigue automáticamente cualquier resize/reposición del canvas,
  // ya que el WebGL canvas es el único hijo en flujo del padre.
  canvas2d = document.createElement("canvas");
  canvas2d.width  = canvasWebGL.width;
  canvas2d.height = canvasWebGL.height;
  canvas2d.style.cssText = [
    "position:absolute",
    "top:0",
    "left:0",
    "width:100%",
    "height:100%",
    "pointer-events:none",
    "z-index:1"
  ].join(";");
  canvasWebGL.parentElement.style.position = "relative";
  canvasWebGL.parentElement.appendChild(canvas2d);
  ctx = canvas2d.getContext("2d");
}

function proyectar(posicion3d, viewMatrix, projMatrix, cw, ch) {
  const vp  = multiplicarMat4(projMatrix, viewMatrix);
  const ndc = transformarPunto(vp, posicion3d);
  // Rechazar si está detrás de la cámara
  if (ndc[2] > 1.0) return null;
  return [
    (ndc[0] * 0.5 + 0.5) * cw,
    (1 - (ndc[1] * 0.5 + 0.5)) * ch
  ];
}

function dibujarDisco(x, y, radio, colorCenter, colorEdge, haloRadio, haloColor, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // Halo exterior difuso
  if (haloRadio > 0) {
    const grad = ctx.createRadialGradient(x, y, radio * 0.8, x, y, haloRadio);
    grad.addColorStop(0, haloColor[0]);
    grad.addColorStop(1, haloColor[1]);
    ctx.beginPath();
    ctx.arc(x, y, haloRadio, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Disco principal con gradiente radial
  const grad = ctx.createRadialGradient(x - radio * 0.25, y - radio * 0.25, 0, x, y, radio);
  grad.addColorStop(0, colorCenter);
  grad.addColorStop(1, colorEdge);
  ctx.beginPath();
  ctx.arc(x, y, radio, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.restore();
}

/**
 * Actualiza sol y luna en canvas 2D.
 * La posición del Sol usa EXACTAMENTE la misma dirección que la luz de la
 * escena (dirSol, normalizada, hacia el astro); la Luna es su antípoda,
 * por lo que está arriba del cielo cuando el Sol cae bajo el horizonte.
 * @param {object} opts - { viewMatrix, projMatrix, elev, dirSol, camObj }
 */
export function actualizarAstros({ viewMatrix, projMatrix, elev, dirSol, camObj }) {
  if (!ctx) return;
  const cw = canvas2d.width;
  const ch = canvas2d.height;
  ctx.clearRect(0, 0, cw, ch);

  const DIST = 280;
  const obj  = camObj || [0, 1, 2];

  // ---- SOL (en la dirección exacta de la luz) ----
  const mostrarSol = elev > -0.22;
  if (mostrarSol) {
    const posSol = [
      obj[0] + dirSol[0] * DIST,
      obj[1] + dirSol[1] * DIST,
      obj[2] + dirSol[2] * DIST
    ];
    const sc = proyectar(posSol, viewMatrix, projMatrix, cw, ch);
    if (sc) {
      const t    = Math.max(0, elev);
      const alph = Math.min(1, 0.35 + t * 0.65);
      // Colores según altura: alba/ocaso naranja, mediodía blanco
      const cCenter = lerpColor([255, 255, 240], [255, 200, 80],  1 - t);
      const cEdge   = lerpColor([255, 220, 180], [255, 140, 30],  1 - t);
      const cHalo0  = lerpColorA([255, 200, 80, 0.35], [255, 230, 100, 0.22], 1 - t);
      const cHalo1  = "rgba(255,150,30,0)";
      const radioSol  = 22;   // píxeles en pantalla
      dibujarDisco(sc[0], sc[1], radioSol, cCenter, cEdge,
        radioSol * 3.2, [cHalo0, cHalo1], alph);
    }
  }

  // ---- LUNA (antípoda del sol) ----
  const mostrarLuna = elev < 0.15;
  if (mostrarLuna) {
    const dirLuna  = [-dirSol[0], -dirSol[1], -dirSol[2]];
    const posLuna  = [
      obj[0] + dirLuna[0] * DIST,
      obj[1] + dirLuna[1] * DIST,
      obj[2] + dirLuna[2] * DIST
    ];
    const lc = proyectar(posLuna, viewMatrix, projMatrix, cw, ch);
    if (lc) {
      const tLuna = Math.max(0, -elev);
      const alph  = Math.min(0.92, 0.4 + tLuna * 0.55);
      const radioLuna = 16;
      dibujarDisco(lc[0], lc[1], radioLuna,
        "rgb(240,242,255)", "rgb(180,190,220)",
        radioLuna * 2.5, ["rgba(160,175,255,0.20)", "rgba(100,120,200,0)"], alph);

      // Cráter sutil
      ctx.save();
      ctx.globalAlpha = alph * 0.18;
      ctx.fillStyle   = "rgb(140,145,170)";
      ctx.beginPath();
      ctx.arc(lc[0] + radioLuna * 0.2, lc[1] - radioLuna * 0.15, radioLuna * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lc[0] - radioLuna * 0.35, lc[1] + radioLuna * 0.2, radioLuna * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ---- helpers internos ----
function lerpColor(a, b, t) {
  const r = a[0] + (b[0]-a[0])*t, g = a[1] + (b[1]-a[1])*t, bl = a[2] + (b[2]-a[2])*t;
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(bl)})`;
}
function lerpColorA(a, b, t) {
  const r = a[0]+(b[0]-a[0])*t, g = a[1]+(b[1]-a[1])*t,
        bl = a[2]+(b[2]-a[2])*t, al = a[3]+(b[3]-a[3])*t;
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(bl)},${al.toFixed(2)})`;
}
