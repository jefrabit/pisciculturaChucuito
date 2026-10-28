// ------------------------------------------------------------
// TEXTURE FACTORY (Paso 10/16)
// Genera TODAS las texturas con <canvas> 2D y texImage2D +
// mipmaps. CERO assets externos (JPG/PNG) → funciona file://
// (canvas no tiene CORS) y bajo servidor.
//
// DEVIACIÓN justificada de la guía Paso 10 (que carga jpg desde
// server): el usuario prohibió assets externos ("natural de
// html/js/css"), así que se usan canvas procedimentales que
// reproducen texturas "reales"-similares (concreto rugoso con
// algas, agua turquesa ondulada, piel de trucha, etc.).
// ------------------------------------------------------------
let glCtx = null;

// Debe llamarse una vez con el contexto WebGL2 activo.
// La Fábrica retiene el contexto para subir texturas a demanda.
export function initTextureFactory(gl) {
  glCtx = gl;
}

function crearCanvasTextura(ancho, alto, dibujar) {
  const c = document.createElement("canvas");
  c.width = ancho;
  c.height = alto;
  const ctx = c.getContext("2d");
  dibujar(ctx, ancho, alto);
  return c;
}

// Sube un canvas como textura 2D con mipmaps completos.
function subirTexturaMip(canvasElemento) {
  const gl = glCtx;
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvasElemento);
  gl.generateMipmap(gl.TEXTURE_2D);
  // Filtros mipmap lineales (Paso 10: LINEAR_MIPMAP_LINEAR + LINEAR).
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  // Wrap: REPEAT horizontal, CLAMP_TO_EDGE vertical.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

// Textura 1x1 sólida (fallback / uso rápido).
export function crearTexturaColor(r, g, b, a = 255) {
  const gl = glCtx;
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA,
    1, 1, 0,
    gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([r, g, b, a])
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

// --- Paso 10: texturas reales/similares (canvas) ---

// Muro de concreto gris rugoso con manchas de algas
// (estanques, edificios, toma, canal de desague).
export function texturaConcretoConAlgas() {
  return subirTexturaMip(crearCanvasTextura(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#8a8a80";
    ctx.fillRect(0, 0, w, h);
    // Ruido granular.
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const g = 100 + Math.random() * 80;
      ctx.fillStyle = `rgb(${g},${g},${g - 10})`;
      ctx.fillRect(x, y, 2, 2);
    }
    // Grietas sutiles.
    ctx.strokeStyle = "rgba(60,60,55,0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * w, Math.random() * h);
      ctx.lineTo(Math.random() * w, Math.random() * h);
      ctx.stroke();
    }
    // Manchas de algas verde-azuladas.
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 3 + Math.random() * 10;
      const g = 40 + Math.random() * 30;
      ctx.fillStyle = `rgba(30,${g},80,0.25)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }));
}

// Agua turquesa ondulada (estanques + artesas).
export function texturaAguaTurquia() {
  return subirTexturaMip(crearCanvasTextura(128, 128, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#2a6e8f");
    grad.addColorStop(0.5, "#1d5a7a");
    grad.addColorStop(1, "#2a7090");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Ondas sutiles.
    ctx.strokeStyle = "rgba(160,200,230,0.18)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      const y0 = Math.random() * h;
      ctx.moveTo(0, y0);
      ctx.quadraticCurveTo(w * 0.5, y0 + (Math.random() - 0.5) * 14, w, y0);
      ctx.stroke();
    }
    // Brillo de luz solar reflejada.
    ctx.fillStyle = "rgba(220,240,255,0.25)";
    ctx.fillRect(w * 0.1, h * 0.1, w * 0.3, h * 0.3);
  }));
}
export const texturaAguaTurquesa = texturaAguaTurquia;

// Piel de trucha: plateado + franja rosada lateral + puntos.
export function texturaPielTrucha() {
  return subirTexturaMip(crearCanvasTextura(128, 64, (ctx, w, h) => {
    // Base plateada.
    ctx.fillStyle = "#c8d8e8";
    ctx.fillRect(0, 0, w, h);
    // Franja rosada lateral (centro horizontal).
    ctx.fillStyle = "#e8b0b0";
    ctx.fillRect(w * 0.35, 0, w * 0.3, h);
    // Puntos oscuros (manchas de trucha).
    ctx.fillStyle = "#5a6a7a";
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Reflejo azul lateral.
    ctx.fillStyle = "rgba(120,160,210,0.18)";
    ctx.fillRect(0, h * 0.15, w * 0.7, h * 0.25);
  }));
}

// Terreno: ichu/pasto (alto) ↔ tierra rocosa (bajo).
export function texturaTerreno() {
  return subirTexturaMip(crearCanvasTextura(256, 256, (ctx, w, h) => {
    // Gradiente vertical: pasto (abajo) -> tierra/ichu (arriba).
    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, "#4a7a3a");
    grad.addColorStop(0.4, "#6b8a4a");
    grad.addColorStop(0.7, "#8a7a50");
    grad.addColorStop(1, "#a09060");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Paja brava (ichu): trazos dorados.
    ctx.strokeStyle = "rgba(190,170,80,0.4)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 4, y - 4 - Math.random() * 6);
      ctx.stroke();
    }
    // Ruido de tierra.
    for (let i = 0; i < 1500; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillStyle = `rgba(${80 + Math.random() * 60},${60 + Math.random() * 50},${30 + Math.random() * 30},0.15)`;
      ctx.fillRect(x, y, 2, 2);
    }
  }));
}

// Lámina de calamina ondulada del techo.
export function texturaCalamina() {
  return subirTexturaMip(crearCanvasTextura(128, 64, (ctx, w, h) => {
    ctx.fillStyle = "#7a8a9a";
    ctx.fillRect(0, 0, w, h);
    // Ondas de calamina.
    for (let x = 0; x < w; x += 8) {
      ctx.fillStyle = x % 16 === 0 ? "#8a9aaa" : "#6a7a8a";
      ctx.fillRect(x, 0, 8, h);
    }
  }));
}

// Teja roja (techos de edificios administrativos).
export function texturaTeja() {
  return subirTexturaMip(crearCanvasTextura(128, 64, (ctx, w, h) => {
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 12) {
      for (let x = 0; x < w; x += 16) {
        const off = (Math.floor(y / 12) % 2) * 8;
        ctx.fillStyle = "#a0522d";
        ctx.beginPath();
        ctx.arc(x + off + 8, y + 6, 7, Math.PI, 0);
        ctx.fill();
      }
    }
  }));
}

// Madera del cartel y compuertas.
export function texturaMadera() {
  return subirTexturaMip(crearCanvasTextura(128, 64, (ctx, w, h) => {
    ctx.fillStyle = "#7a4a2a";
    ctx.fillRect(0, 0, w, h);
    // Vetas horizontales.
    for (let y = 0; y < h; y += 4) {
      const off = (y % 8 === 0) ? 1 : -1;
      ctx.strokeStyle = `rgba(60,30,12,${0.15 + Math.random() * 0.1})`;
      ctx.lineWidth = 1 + Math.random();
      ctx.beginPath();
      ctx.moveTo(off, y);
      ctx.lineTo(w + off, y);
      ctx.stroke();
    }
    // Textura rugosa.
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillStyle = `rgba(40,20,8,${0.1 + Math.random() * 0.1})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }));
}

// Emisiva del cartel "CIP CHUCUITO · UNAP" ( legible de noche).
export function texturaCartelEmisivo() {
  return subirTexturaMip(crearCanvasTextura(256, 128, (ctx, w, h) => {
    // Fondo negro (el cartel es negro de noche).
    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, w, h);
    // Texto blanco brillante que emite.
    ctx.fillStyle = "#eaf2fb";
    ctx.font = "bold 38px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CIP CHUCUITO", w / 2, h * 0.32);
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.fillText("UNAP", w / 2, h * 0.7);
    // Cinta decorativa superior.
    ctx.fillStyle = "#4fc3f7";
    ctx.fillRect(0, h * 0.12, w, h * 0.06);
  }));
}
