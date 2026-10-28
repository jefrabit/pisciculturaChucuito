// ------------------------------------------------------------
// AstrosDOM.js — Sol y Luna renderizados en Canvas 2D superpuesto
// Coloca los discos en la franja de cielo visible: la altura la fija la
// elevación real del astro (comprimida al arco que cabe en el encuadre)
// corregida por la inclinación de la cámara; el avance este→oeste (la
// suben y bajan según la hora simulada) recorre el ancho del canvas.
// ------------------------------------------------------------

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

// La luz sale con el sol a hasta 76° de elevación; dibujado en crudo ese
// arco cae siempre fuera del encuadre (la cámara mira hacia abajo), así que
// se comprime a 7,5° aparentes: amanece en el horizonte y llega casi al
// borde superior sin salirse de la franja de cielo.
const FAC_ELEVACION = 7.5 / 76;
// Reserva lateral para que el disco nunca quede cortado por el borde.
const MARGEN_BORDE = 44;

/**
 * Actualiza sol y luna en canvas 2D.
 * @param {object} opts - { viewMatrix, projMatrix, elev, dirSol, fase }
 *   elev: seno de la elevación solar ( >0 de día ); dirSol: dirección
 *   normalizada hacia el sol; fase: ángulo horario desde las 06:00.
 */
export function actualizarAstros({ viewMatrix, projMatrix, elev, dirSol, fase }) {
  if (!ctx) return;
  const cw = canvas2d.width;
  const ch = canvas2d.height;
  ctx.clearRect(0, 0, cw, ch);

  // Inclinación de la cámara (positiva = hacia abajo) y tan(FOV/2 vertical)
  const pitch = Math.asin(Math.max(-1, Math.min(1, viewMatrix[6])));
  const tanMediaV = 1 / projMatrix[5];

  // Altura en pantalla de una dirección con elevación `alfa` (rad):
  // recorre la franja entre el horizonte encuadrado y el borde superior.
  const yElev = (alfa) =>
    ch * 0.5 * (1 - Math.tan(alfa * FAC_ELEVACION + pitch) / tanMediaV);

  // Avance este→oeste: amanecer a la derecha, ocaso a la izquierda.
  const f = ((fase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const xAvance = (t) => (cw - MARGEN_BORDE) + t * (2 * MARGEN_BORDE - cw);

  const alfa = Math.atan2(dirSol[1], Math.hypot(dirSol[0], dirSol[2]));

  // ---- SOL (sube desde el amanecer, se pone al ocaso) ----
  if (elev > -0.22) {
    const y = yElev(alfa);
    if (y > -24 && y < ch + 24) {
      const x = xAvance(Math.min(f, 2 * Math.PI - f) / Math.PI);
      const t = Math.max(0, elev);
      const alph = Math.min(1, 0.35 + t * 0.65);
      // Colores según altura: alba/ocaso naranja, mediodía blanco
      const cCenter = lerpColor([255, 255, 240], [255, 200, 80],  1 - t);
      const cEdge   = lerpColor([255, 220, 180], [255, 140, 30],  1 - t);
      const cHalo0  = lerpColorA([255, 200, 80, 0.35], [255, 230, 100, 0.22], 1 - t);
      const cHalo1  = "rgba(255,150,30,0)";
      const radioSol  = 22;   // píxeles en pantalla
      dibujarDisco(x, y, radioSol, cCenter, cEdge,
        radioSol * 3.2, [cHalo0, cHalo1], alph);
    }
  }

  // ---- LUNA (antípoda: sube cuando el sol cae) ----
  if (elev < 0.15) {
    const y = yElev(-alfa);
    if (y > -20 && y < ch + 20) {
      const x = xAvance(Math.abs(f - Math.PI) / Math.PI);
      const tLuna = Math.max(0, -elev);
      const alph  = Math.min(0.92, 0.4 + tLuna * 0.55);
      const radioLuna = 16;
      dibujarDisco(x, y, radioLuna,
        "rgb(240,242,255)", "rgb(180,190,220)",
        radioLuna * 2.5, ["rgba(160,175,255,0.20)", "rgba(100,120,200,0)"], alph);

      // Cráter sutil
      ctx.save();
      ctx.globalAlpha = alph * 0.18;
      ctx.fillStyle   = "rgb(140,145,170)";
      ctx.beginPath();
      ctx.arc(x + radioLuna * 0.2, y - radioLuna * 0.15, radioLuna * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - radioLuna * 0.35, y + radioLuna * 0.2, radioLuna * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
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
