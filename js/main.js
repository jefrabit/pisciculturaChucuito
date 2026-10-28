// ============================================================
// main.js — Piscicultura Chucuito (Paso 16 Mini Motor Gráfico)
//
// Refactor modular del Gemelo Digital según la arquitectura del Paso 16:
// Scene, Object3D, Mesh, Geometry, BasicMaterial, Renderer, PerspectiveCamera.
// CERO llamadas directas a gl.* en la capa de composición.
// Mantiene el 100% de la interfaz visual, simulación y telemetría.
// ============================================================

import { Scene } from "./core/Scene.js";
import { Object3D } from "./core/Object3D.js";
import { Renderer } from "./core/Renderer.js";
import { PerspectiveCamera } from "./cameras/PerspectiveCamera.js";
import { Mesh } from "./objects/Mesh.js";
import { BasicMaterial } from "./materials/BasicMaterial.js";
import {
  Matrix4, matrizTraslacion4, matrizEscala4, matrizRotacionX,
  matrizRotacionY, matrizRotacionZ, multiplicarMat4, normalizar3,
  mezclarColor
} from "./math/Matrix4.js";
import { alturaTerreno, definirPads, crearMallaTerreno } from "./utils/Terreno.js";
import {
  crearCaja, crearPlano, crearEstanque, crearTrucha,
  crearIncubadora, fusionarTransformadas, toGeometry
} from "./utils/Geometrias.js";
import {
  crearTanque, crearTuberia, crearCompuerta, crearAireador,
  crearBoya, crearSilo, crearArtesa, crearCartel, crearPoste,
  crearArbusto, crearRoca, COL
} from "./utils/Construcciones.js";
import {
  SIM, UMBRALES, horaSim, diaSim, horaTexto, esDeDia,
  simPasar, alertasDe, simAlimentar, simLluvia, simFloracion,
  simHelada, simAlternarPausa, simVelocidad
} from "./app/Simulador.js";
import { registrarEtiqueta, actualizarEtiquetas } from "./app/Etiquetas.js";
import {
  registrarSeleccionable, seleccionarDesdePantalla,
  crearPanelDetalle, mostrarDetalle, actualizarDetalle
} from "./app/Interaccion.js";
import { initAstros, actualizarAstros } from "./app/AstrosDOM.js";

// ------------------------------------------------------------
// 1. INICIALIZACIÓN DEL MOTOR (Paso 16)
// ------------------------------------------------------------
const canvas = document.getElementById("glCanvas");
const renderer = new Renderer(canvas);
const scene = new Scene();

// ------------------------------------------------------------
// 2. CÁMARA ORBITAL INTERACTIVA (Paso 15 / 16)
// ------------------------------------------------------------
const FOV = 55;
// phi: ángulo polar (más alto = mira más bajo). 1.30 deja el horizonte
// dentro del encuadre, lo que hace visible la franja de cielo con sol/luna.
const camaraDefecto = { theta: 0.5, phi: 1.30, radio: 98 };
const camara = { ...camaraDefecto, objetivo: [24, 1, 0] };
const camera = new PerspectiveCamera(FOV, canvas.width / canvas.height, 0.1, 600);

const VISTAS = {
  general: { objetivo: [24, 1, 0], theta: 0.5, phi: 1.30, radio: 98 },
  "estanque-1": { objetivo: [-25, 2, 0], theta: 0.95, phi: 0.8, radio: 26 },
  "estanque-2": { objetivo: [1, 0, 0], theta: 0.25, phi: 0.8, radio: 26 },
  "estanque-3": { objetivo: [27, 0, 0], theta: 0.15, phi: 0.7, radio: 26 },
  "estanque-4": { objetivo: [53, 0, 0], theta: 0.15, phi: 0.7, radio: 26 },
  "estanque-5": { objetivo: [79, 0, 0], theta: 0.15, phi: 0.7, radio: 26 },
  incubadora: { objetivo: [-10, 3, -16], theta: 0.15, phi: 0.9, radio: 20 }
};

function irAVista(nombre) {
  const v = VISTAS[nombre];
  if (!v) return;
  camara.objetivo = v.objetivo.slice();
  camara.theta = v.theta;
  camara.phi = v.phi;
  camara.radio = v.radio;
}

function posicionCamara() {
  const { theta, phi, radio, objetivo } = camara;
  return [
    objetivo[0] + radio * Math.sin(phi) * Math.sin(theta),
    objetivo[1] + radio * Math.cos(phi),
    objetivo[2] + radio * Math.sin(phi) * Math.cos(theta)
  ];
}

let arrastrando = false, ultimoX = 0, ultimoY = 0, desplazamiento = 0;
canvas.addEventListener("mousedown", e => {
  arrastrando = true; ultimoX = e.clientX; ultimoY = e.clientY; desplazamiento = 0;
  canvas.classList.add("arrastrando");
});
window.addEventListener("mouseup", () => {
  arrastrando = false;
  canvas.classList.remove("arrastrando");
});
window.addEventListener("mousemove", e => {
  if (!arrastrando) return;
  const dx = e.clientX - ultimoX, dy = e.clientY - ultimoY;
  desplazamiento += Math.abs(dx) + Math.abs(dy);
  camara.theta -= dx * 0.006;
  camara.phi = Math.max(0.15, Math.min(1.5, camara.phi - dy * 0.006));
  ultimoX = e.clientX; ultimoY = e.clientY;
});
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  camara.radio = Math.max(16, Math.min(130, camara.radio * (1 + e.deltaY * 0.001)));
}, { passive: false });

canvas.addEventListener("click", e => {
  if (desplazamiento > 5) return;
  const r = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  const sel = seleccionarDesdePantalla(mx, my, canvas, posicionCamara(), camara.objetivo, FOV);
  if (!sel) return;
  for (let i = 0; i < LAYOUT.estanques.length; i++) {
    if (sel.id === "estanque-" + i) { mostrarDetalle(i); return; }
  }
});

window.addEventListener("keydown", e => {
  if (e.code === "Space") { simAlternarPausa(); e.preventDefault(); }
  else if (e.key === "+" || e.key === "=") simVelocidad(1);
  else if (e.key === "-") simVelocidad(-1);
  else if (e.key === "r" || e.key === "R") Object.assign(camara, camaraDefecto);
});

// ------------------------------------------------------------
// 3. LAYOUT DEL SITIO Y CONSTRUCCIÓN DE LA ESCENA
// ------------------------------------------------------------
// Invariantes del CIP Chucuito real (dossier local verificado):
// - Serie en cascada O→E: toma vertiente Murinlaya → A alevinaje techado → B engorde outdoor → C acabado outdoor → D pre-descarga outdoor → E descarga (cierra la serie)
// - SIN emisario al lago (el agua termina en el estanque F)
// - Incubadora techada con interior NEGRO
// - Engorde B OUTDOOR (sin techo)
const Lx = 20, Lz = 8, aguaY = 1.3;
const LAYOUT = {
  // Serie en cascada bajando la pendiente O→E, con calle de 6 u entre
  // estanque y estanque (x: -41 → -25 → +1 → +27 → +53 → +79)
  toma: { cx: -41, cz: -5 },                    // compuerta en vertiente Murinlaya
  estanques: [
    { cx: -25, cz: 0, lx: 20, lz: 8,  techado: true,  nombre: "Estanque 1 · Alevinaje" },    // techado (calamina)
    { cx:   1, cz: 0, lx: 20, lz: 8,  techado: false, nombre: "Estanque 2 · Engorde"    },    // OUTDOOR
    { cx:  27, cz: 0, lx: 20, lz: 8,  techado: false, nombre: "Estanque 3 · Acabado"    },    // OUTDOOR
    { cx:  53, cz: 0, lx: 20, lz: 8,  techado: false, nombre: "Estanque 4 · Pre-descarga" },  // OUTDOOR
    { cx:  79, cz: 0, lx: 20, lz: 8,  techado: false, nombre: "Estanque 5 · Descarga"   }     // OUTDOOR, cierra la cascada
  ],
  incubadora: { cx: -10, cz: -16 },             // sala techada, interior negro
  camino: { cx: 0, cz: 0, ancho: 3.2, largo: 60 },
  silos: [{ cx: -6, cz: -7 }, { cx: 6, cz: -7 }],
  artesas: [{ cx: 8, cz: -15 }, { cx: 8, cz: -17.5 }, { cx: 8, cz: -20 }],
  cartel: { cx: -4, cz: 11 },
  edificios: [{ cx: -8, cz: -24 }, { cx: 4, cz: -24 }] // admin/lab techo teja
};

// Plataformas niveladas bajo construcciones (planificadas sobre el terreno SRTM)
definirPads([
  ...LAYOUT.estanques.map(e => ({ cx: e.cx, cz: e.cz, hx: e.lx / 2, hz: e.lz / 2, suave: 3 })),
  { cx: LAYOUT.incubadora.cx, cz: LAYOUT.incubadora.cz, hx: 7, hz: 4, suave: 3 },
  ...LAYOUT.edificios.map(e => ({ cx: e.cx, cz: e.cz, hx: 4, hz: 3, suave: 3 }))
]);

// Terreno SRTM30m de Chucuito (rejilla real cubre x ∈ [-45, 45]; hacia el
// este se extrapola plano con el borde del heightmap)
const geoTerreno = crearMallaTerreno(180, 90, 144, 72);
const meshTerreno = new Mesh(geoTerreno, new BasicMaterial({ transparent: false }));
scene.add(meshTerreno);

// Inicializar overlay 2D para Sol y Luna
initAstros(canvas);

// Estanques en cascada (concreto + agua translúcida)
const M_ESTANQUE = [];
const M_ESTANQUE_Y = LAYOUT.estanques.map(e => alturaTerreno(e.cx, e.cz) + 0.05);
const estanquesSystems = [];
const meshesAgua = [];

for (let i = 0; i < LAYOUT.estanques.length; i++) {
  const e = LAYOUT.estanques[i];
  const T = matrizTraslacion4(e.cx, M_ESTANQUE_Y[i], e.cz);
  M_ESTANQUE.push(T);

  // Geometría propia de cada estanque (el 6 es más grande)
  const geoEstanque = crearEstanque(e.lx, e.lz, aguaY);
  const geoConcretoEstanque = toGeometry(geoEstanque.concreto);
  const geoAguaEstanque = toGeometry(geoEstanque.agua);

  const estanqueSys = new Object3D();
  estanqueSys.matrix = T;
  estanqueSys.matrixWorld = T;
  estanqueSys.matrixAutoUpdate = false;
  scene.add(estanqueSys);
  estanquesSystems.push(estanqueSys);

  // Muro y losa de concreto (sólido)
  const meshConcreto = new Mesh(geoConcretoEstanque, new BasicMaterial({ transparent: false }));
  meshConcreto.matrix = T;
  meshConcreto.matrixWorld = T;
  meshConcreto.matrixAutoUpdate = false;
  scene.add(meshConcreto);

  // Superficie de agua translúcida
  const matAgua = new BasicMaterial({ transparent: true, alpha: 0.72, waveAmp: 0.08 });
  const meshAgua = new Mesh(geoAguaEstanque, matAgua);
  meshAgua.matrix = T;
  meshAgua.matrixWorld = T;
  meshAgua.matrixAutoUpdate = false;
  meshAgua.indiceEstanque = i;
  scene.add(meshAgua);
  meshesAgua.push(meshAgua);
}

// Sala de incubación (caja blanca + techo teja)
const geoIncubadora = toGeometry(crearIncubadora());
const yIncubadora = alturaTerreno(LAYOUT.incubadora.cx, LAYOUT.incubadora.cz);
const meshIncubadora = new Mesh(geoIncubadora, new BasicMaterial({ transparent: false }));
meshIncubadora.matrix = matrizTraslacion4(LAYOUT.incubadora.cx, yIncubadora, LAYOUT.incubadora.cz);
meshIncubadora.matrixWorld = meshIncubadora.matrix;
meshIncubadora.matrixAutoUpdate = false;
scene.add(meshIncubadora);

// Camino de tierra (sigue la elevación del terreno)
const geoCamino = toGeometry(crearPlano(
  LAYOUT.camino.ancho, LAYOUT.camino.largo, 8, 32,
  (x, z) => alturaTerreno(x + LAYOUT.camino.cx, z + LAYOUT.camino.cz) + 0.06,
  () => [0.55, 0.48, 0.35]
));
const meshCamino = new Mesh(geoCamino, new BasicMaterial({ transparent: false }));
meshCamino.matrix = matrizTraslacion4(LAYOUT.camino.cx, 0, LAYOUT.camino.cz);
meshCamino.matrixWorld = meshCamino.matrix;
meshCamino.matrixAutoUpdate = false;
scene.add(meshCamino);

// Props fijos y dinámicos
const props = [];
const vegetacion = [];
const compuertas = [];
const aireadores = [];
const boyas = [];

// TOMA: compuerta en vertiente Murinlaya (NO depósito elevado)
const toma = LAYOUT.toma;
const yToma = alturaTerreno(toma.cx, toma.cz);
props.push({
  geo: crearTanque(),
  matriz: matrizTraslacion4(toma.cx, yToma + 1.2, toma.cz)
});

// Tubería de suministro: toma → estanque A (entrada oeste)
const xEntradaA = LAYOUT.estanques[0].cx - LAYOUT.estanques[0].lx / 2;
props.push({
  geo: crearTuberia(xEntradaA - toma.cx, 0.22),
  matriz: multiplicarMat4(
    matrizTraslacion4((toma.cx + xEntradaA) / 2, yToma - 0.5, toma.cz),
    matrizRotacionZ(Math.PI / 2)
  )
});

// Compuertas: entrada A, traspasos A→B→C→D, desagüe D
const compuertaGeo = crearCompuerta(1.6, 1.8);
const geoHojaCompuerta = toGeometry(compuertaGeo.hoja);
const compuertasInfo = [
  // Entrada al estanque A
  { x: xEntradaA - 0.1, z: 0, est: 0 },
  // Salida A → entrada B
  { x: LAYOUT.estanques[0].cx + LAYOUT.estanques[0].lx / 2 + 0.1, z: 0, est: 0 },
  { x: LAYOUT.estanques[1].cx - LAYOUT.estanques[1].lx / 2 - 0.1, z: 0, est: 1 },
  // Salida B → entrada C
  { x: LAYOUT.estanques[1].cx + LAYOUT.estanques[1].lx / 2 + 0.1, z: 0, est: 1 },
  { x: LAYOUT.estanques[2].cx - LAYOUT.estanques[2].lx / 2 - 0.1, z: 0, est: 2 },
  // Salida C → entrada D
  { x: LAYOUT.estanques[2].cx + LAYOUT.estanques[2].lx / 2 + 0.1, z: 0, est: 2 },
  { x: LAYOUT.estanques[3].cx - LAYOUT.estanques[3].lx / 2 - 0.1, z: 0, est: 3 },
  // Salida D → entrada E
  { x: LAYOUT.estanques[3].cx + LAYOUT.estanques[3].lx / 2 + 0.1, z: 0, est: 3 },
  { x: LAYOUT.estanques[4].cx - LAYOUT.estanques[4].lx / 2 - 0.1, z: 0, est: 4 },
  // Desagüe final (E, cierra la cascada; NUNCA al lago)
  { x: LAYOUT.estanques[4].cx + LAYOUT.estanques[4].lx / 2 + 0.1, z: 0, est: 4 }
];

for (const c of compuertasInfo) {
  const base = matrizTraslacion4(c.x, M_ESTANQUE_Y[c.est], c.z);
  props.push({ geo: compuertaGeo.marco, matriz: multiplicarMat4(base, matrizRotacionY(Math.PI / 2)) });
  const meshHoja = new Mesh(geoHojaCompuerta, new BasicMaterial({ transparent: false }));
  meshHoja.matrixAutoUpdate = false;
  scene.add(meshHoja);
  compuertas.push({
    mesh: meshHoja,
    base: [c.x, M_ESTANQUE_Y[c.est], c.z],
    estanque: c.est
  });
}

// Tuberías de traspaso en serie A→B→C y soportes
for (let i = 0; i < LAYOUT.estanques.length - 1; i++) {
  const yAlto = M_ESTANQUE_Y[i] + aguaY;
  const yBajo = M_ESTANQUE_Y[i + 1] + aguaY;
  // Caída vertical
  props.push({
    geo: crearTuberia(yAlto - yBajo + 0.6, 0.22),
    matriz: matrizTraslacion4(LAYOUT.estanques[i].cx + Lx / 2 + 0.5, (yAlto + yBajo) / 2, 0)
  });
  // Tramo horizontal
  props.push({
    geo: crearTuberia(Lx - 0.4, 0.22),
    matriz: multiplicarMat4(
      matrizTraslacion4(LAYOUT.estanques[i + 1].cx - Lx / 2 - 0.2, yBajo + 0.28, 0),
      matrizRotacionZ(Math.PI / 2)
    )
  });
  // Soportes
  for (const sx of [-2, 2]) {
    props.push({
      geo: crearCaja(0, 0, 0, 0.18, 0.6, 0.18, COL.metalOscuro),
      matriz: matrizTraslacion4(sx, yBajo - 0.1, 0)
    });
  }
}

// Canal de desagüe corto (estanque E → salida, NUNCA al lago)
const iUltimo = LAYOUT.estanques.length - 1;
const yC = M_ESTANQUE_Y[iUltimo] + aguaY;
props.push({
  geo: crearTuberia(5, 0.22),
  matriz: matrizTraslacion4(LAYOUT.estanques[iUltimo].cx + LAYOUT.estanques[iUltimo].lx / 2 + 0.5, yC + 0.2, 0)
});

// Aireadores (aspas que giran en estanque B y A)
const aireadorGeo = crearAireador();
const geoHliceAireador = toGeometry(aireadorGeo.hlice);
for (const e of LAYOUT.estanques) {
  const idx = LAYOUT.estanques.indexOf(e);
  for (const dx of [-5, 5]) {
    const x = e.cx + dx, y = M_ESTANQUE_Y[idx] + aguaY + 0.05;
    props.push({ geo: aireadorGeo.base, matriz: matrizTraslacion4(x, y, 4) });
    const meshHlice = new Mesh(geoHliceAireador, new BasicMaterial({ transparent: false }));
    meshHlice.matrixAutoUpdate = false;
    scene.add(meshHlice);
    aireadores.push({
      mesh: meshHlice,
      base: [x, y + 0.28, 4],
      angulo: (x + e.cx) * 0.7
    });
  }
}

// Boyas de señalización en el agua
const boyaGeo = crearBoya();
const geoBoya = toGeometry(boyaGeo);
for (const e of LAYOUT.estanques) {
  const i = LAYOUT.estanques.indexOf(e);
  const meshBoya = new Mesh(geoBoya, new BasicMaterial({ transparent: false }));
  meshBoya.matrixAutoUpdate = false;
  scene.add(meshBoya);
  boyas.push({
    mesh: meshBoya,
    x: e.cx + e.lx / 2 - 1.5,
    y: M_ESTANQUE_Y[i] + aguaY + 0.1,
    z: 4
  });
}

// Escalas de nivel en los estanques
for (const e of LAYOUT.estanques) {
  const i = LAYOUT.estanques.indexOf(e);
  props.push({
    geo: crearCaja(0, 0, 0, 0.12, 1.7, 0.12, COL.blanco),
    matriz: matrizTraslacion4(e.cx - e.lx / 2 + 0.35, M_ESTANQUE_Y[i] + 0.85, e.cz - e.lz / 2 + 0.35)
  });
}

// Silos de alimento
for (const s of LAYOUT.silos) {
  props.push({
    geo: crearSilo(),
    matriz: matrizTraslacion4(s.cx, alturaTerreno(s.cx, s.cz), s.cz)
  });
}

// Artesas de incubación (agua de manantial)
const artesaGeo = crearArtesa();
const geoAguaArtesa = toGeometry(artesaGeo.agua);
for (const a of LAYOUT.artesas) {
  const y = alturaTerreno(a.cx, a.cz);
  props.push({ geo: artesaGeo.marco, matriz: matrizTraslacion4(a.cx, y, a.cz) });
  const meshAguaArtesa = new Mesh(geoAguaArtesa, new BasicMaterial({ transparent: true, alpha: 0.75, waveAmp: 0.04 }));
  meshAguaArtesa.matrix = matrizTraslacion4(a.cx, y, a.cz);
  meshAguaArtesa.matrixWorld = meshAguaArtesa.matrix;
  meshAguaArtesa.matrixAutoUpdate = false;
  scene.add(meshAguaArtesa);
}

// Cartel del proyecto CIP Chucuito
const cartelY = alturaTerreno(LAYOUT.cartel.cx, LAYOUT.cartel.cz);
props.push({ geo: crearCartel(), matriz: matrizTraslacion4(LAYOUT.cartel.cx, cartelY, LAYOUT.cartel.cz) });

// Cerco perimetral con travesaños
const posteGeo = crearPoste();
function tramoCerco(x0, z0, x1, z1) {
  const largo = Math.hypot(x1 - x0, z1 - z0);
  const pasos = Math.max(1, Math.round(largo / 5));
  const dx = (x1 - x0) / pasos, dz = (z1 - z0) / pasos;
  const puntos = [];
  for (let i = 0; i <= pasos; i++) {
    const x = x0 + dx * i, z = z0 + dz * i;
    const y = alturaTerreno(x, z);
    puntos.push([x, y, z]);
    props.push({ geo: posteGeo, matriz: matrizTraslacion4(x, y + 0.75, z) });
  }
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i], b = puntos[i + 1];
    const seg = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const ang = Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
    for (const h of [0.55, 1.15]) {
      const trav = crearCaja(0, 0, 0, 1, 0.07, 0.07, COL.madera);
      props.push({
        geo: trav,
        matriz: multiplicarMat4(
          matrizTraslacion4((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + h, (a[2] + b[2]) / 2),
          multiplicarMat4(matrizEscala4(seg, 1, 1), matrizRotacionY(ang))
        )
      });
    }
  }
}
tramoCerco(-38, -24, 90, -24);
tramoCerco(-38, 14, -2.5, 14);
tramoCerco(2.5, 14, 90, 14);
tramoCerco(-38, -24, -38, 14);
tramoCerco(90, -24, 90, 14);

// Vegetación determinista
function crearAzar(semilla) {
  let s = semilla >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const azar = crearAzar(20261021);
const arbustoGeo = crearArbusto();
const rocaGeo = crearRoca(0);
const arbolGeo = toGeometry(crearPlano(1, 1, 1, 1, () => 0, () => [0, 0, 0])); // dummy para tipo
for (let n = 0; n < 170; n++) {
  const x = (azar() - 0.5) * 124, z = (azar() - 0.5) * 84;
  if (x > -40 && x < 84 && z > -26 && z < 16) continue;
  const y = alturaTerreno(x, z);
  const r = azar();
  if (r < 0.62) {
    vegetacion.push({ geo: arbustoGeo, matriz: matrizTraslacion4(x, y + 0.25, z) });
  } else if (r < 0.86) {
    vegetacion.push({ geo: rocaGeo, matriz: matrizTraslacion4(x, y + 0.1, z) });
  }
}

// Fusionar props y vegetación en 1 malla cada grupo para máximo rendimiento
const meshProps = new Mesh(toGeometry(fusionarTransformadas(props)), new BasicMaterial({ transparent: false }));
scene.add(meshProps);

const meshVeg = new Mesh(toGeometry(fusionarTransformadas(vegetacion)), new BasicMaterial({ transparent: false }));
scene.add(meshVeg);

// ------------------------------------------------------------
// 4. TRUCHAS CON JERARQUÍA PADRE-HIJO (Pasos 11 y 13)
// Cada pez es HIJO de su estanque: M_mundo = M_estanque · M_local
// ------------------------------------------------------------
const PECES_POR_ESTANQUE = 8;
const geoPez = toGeometry(crearTrucha());
const matPez = new BasicMaterial({ transparent: false });
const peces = [];

for (let i = 0; i < LAYOUT.estanques.length; i++) {
  for (let k = 0; k < PECES_POR_ESTANQUE; k++) {
    const esc = 0.7 + (k % 3) * 0.1;
    const meshPez = new Mesh(geoPez, matPez);
    meshPez.matrixAutoUpdate = false;
    estanquesSystems[i].add(meshPez);

    peces.push({
      mesh: meshPez,
      estanque: i,
      angulo: (k / PECES_POR_ESTANQUE) * Math.PI * 2 + i * 0.7,
      vel: 0.22 + (k % 3) * 0.05,
      rx: 5.5 + (k % 4) * 0.6,
      rz: 1.6 + (k % 3) * 0.3,
      y: 0.36 * esc + 0.11 + (k % 4) * 0.11,
      esc: esc
    });
  }
}

// ------------------------------------------------------------
// 5. ETIQUETAS 3D Y OBJETOS SELECCIONABLES (INTERACCIÓN)
// ------------------------------------------------------------
const ETIQUETAS_ESTANQUE = [];
for (let i = 0; i < LAYOUT.estanques.length; i++) {
  const e = LAYOUT.estanques[i];
  const ancla = registrarEtiqueta([e.cx, M_ESTANQUE_Y[i] + aguaY + 1.3, e.cz], "sensor");
  ancla.contenido = "";
  ETIQUETAS_ESTANQUE.push(ancla);

  registrarSeleccionable(
    "estanque-" + i, SIM.estanques[i].nombre,
    [e.cx - e.lx / 2, M_ESTANQUE_Y[i], e.cz - e.lz / 2],
    [e.cx + e.lx / 2, M_ESTANQUE_Y[i] + 2, e.cz + e.lz / 2]
  );
}

const anclaCartel = registrarEtiqueta([LAYOUT.cartel.cx, cartelY + 2.7, LAYOUT.cartel.cz], "cartel");
anclaCartel.contenido = "<b>CIP CHUCUITO · UNAP</b><span>Piscicultura de trucha (Paso 16)</span>";

const anclaIncubadora = registrarEtiqueta(
  [LAYOUT.incubadora.cx, yIncubadora + 5.2, LAYOUT.incubadora.cz], "edificio");
anclaIncubadora.contenido = "<b>Sala de incubación</b><span>Artesas de flujo vertical</span>";

// ------------------------------------------------------------
// 6. ENLACE CON EL PANEL LATERAL (UI Y EVENTOS)
// ------------------------------------------------------------
const contenedorEstanques = document.getElementById("estanques");
const filasValor = [];
const PARAMS = [
  ["temp", "T° agua", "°C", 1], ["od", "Oxígeno", "mg/L", 1],
  ["ph", "pH", "", 2], ["nh3", "Amoníaco", "mg/L", 3],
  ["ntu", "Turbidez", "NTU", 1], ["nivel", "Nivel", "m", 2]
];

if (contenedorEstanques) {
  contenedorEstanques.innerHTML = "";
  SIM.estanques.forEach((est, i) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = "<h3>" + est.nombre + "</h3>";
    const refs = {};
    for (const [key, label, unidad, dec] of PARAMS) {
      const row = document.createElement("div");
      row.className = "fila";
      row.innerHTML = "<span class='etq'>" + label + "</span>" +
        "<span class='val' data-k='" + key + "'>–</span>" +
        "<span class='uni'>" + unidad + "</span>";
      card.appendChild(row);
      refs[key] = { val: row.querySelector(".val"), fila: row, dec };
    }
    contenedorEstanques.appendChild(card);
    filasValor.push(refs);
  });
}

document.getElementById("btnPausa").onclick = simAlternarPausa;
document.getElementById("btnMas").onclick = () => simVelocidad(1);
document.getElementById("btnMenos").onclick = () => simVelocidad(-1);
document.getElementById("btnReset").onclick = () => Object.assign(camara, camaraDefecto);
document.getElementById("btnAlimentar").onclick = simAlimentar;
document.getElementById("btnLluvia").onclick = simLluvia;
document.getElementById("btnFloracion").onclick = simFloracion;
document.getElementById("btnHelada").onclick = simHelada;

for (const b of document.querySelectorAll("[data-vista]")) {
  b.onclick = () => irAVista(b.dataset.vista);
}

crearPanelDetalle();

const elHora = document.getElementById("hora");
const elDia = document.getElementById("dia");
const elVelocidad = document.getElementById("velocidad");
const elEstado = document.getElementById("estado");
const elAlertas = document.getElementById("alertas");
const canvasOd = document.getElementById("graficaOd");
const ctxOd = canvasOd ? canvasOd.getContext("2d") : null;

function nivelClase(alertas) {
  if (alertas.some(a => a.nivel === "critica")) return "critica";
  if (alertas.length) return "advertencia";
  return "ok";
}

let ultimoPanel = 0;
function actualizarPanel(ahora) {
  if (ahora - ultimoPanel < 0.1) return;
  ultimoPanel = ahora;

  if (elHora) elHora.textContent = horaTexto();
  if (elDia) elDia.textContent = "Día " + diaSim();
  if (elVelocidad) elVelocidad.textContent = SIM.velocidades[SIM.velocidadIdx] + "×";
  if (elEstado) {
    elEstado.textContent = SIM.pausado ? "PAUSADO" : (esDeDia() ? "Día" : "Noche");
    elEstado.className = "estado " + (SIM.pausado ? "advertencia" : (esDeDia() ? "ok" : "info"));
  }

  const todasAlertas = [];
  SIM.estanques.forEach((est, i) => {
    if (!est.m || !filasValor[i]) return;
    for (const [key] of PARAMS) {
      const r = filasValor[i][key];
      if (r && r.val) r.val.textContent = est.m[key].toFixed(r.dec);
    }
    const alertas = alertasDe(est.m);
    const peor = nivelClase(alertas);
    PARAMS.forEach(([key]) => {
      if (filasValor[i][key]) filasValor[i][key].fila.className = "fila " + peor;
    });
    for (const a of alertas) {
      todasAlertas.push({ txt: est.nombre.split(" · ")[0] + ": " + a.txt, nivel: a.nivel });
    }
  });

  if (elAlertas) {
    if (todasAlertas.length === 0) {
      elAlertas.innerHTML = "<div class='alerta ok'>Sin alertas — agua en rango</div>";
    } else {
      elAlertas.innerHTML = todasAlertas
        .map(a => "<div class='alerta " + a.nivel + "'>" + a.txt + "</div>")
        .join("");
    }
  }

  for (let i = 0; i < ETIQUETAS_ESTANQUE.length; i++) {
    const m = SIM.estanques[i].m;
    if (!m) continue;
    ETIQUETAS_ESTANQUE[i].contenido =
      "<b>" + SIM.estanques[i].nombre.split(" · ")[0] + "</b>" +
      "<span>OD " + m.od.toFixed(1) + " mg/L</span>" +
      "<span>" + m.temp.toFixed(1) + " °C</span>" +
      "<span>pH " + m.ph.toFixed(2) + "</span>";
  }

  dibujarGraficaOd();
  actualizarDetalle();
}

function dibujarGraficaOd() {
  if (!ctxOd) return;
  const w = ctxOd.canvas.width, h = ctxOd.canvas.height;
  ctxOd.clearRect(0, 0, w, h);
  ctxOd.fillStyle = "#0d1420";
  ctxOd.fillRect(0, 0, w, h);

  ctxOd.strokeStyle = "rgba(255,80,80,0.5)";
  ctxOd.beginPath();
  const y5 = h - (5 / 10) * h;
  ctxOd.moveTo(0, y5); ctxOd.lineTo(w, y5);
  ctxOd.stroke();

  const colores = ["#4fc3f7", "#81c784", "#ef5350", "#ffca28", "#ba68c8"];
  SIM.historial.forEach((hist, i) => {
    if (hist.length < 2) return;
    ctxOd.strokeStyle = colores[i];
    ctxOd.lineWidth = 1.5;
    ctxOd.beginPath();
    hist.forEach((p, k) => {
      const x = ((p.t - (SIM.T - 24)) / 24) * w;
      const y = h - (Math.max(0, Math.min(10, p.od)) / 10) * h;
      k === 0 ? ctxOd.moveTo(x, y) : ctxOd.lineTo(x, y);
    });
    ctxOd.stroke();
  });
}

// ------------------------------------------------------------
// 7. RENDER LOOP MODULAR (Paso 16)
// ------------------------------------------------------------
const TOPE_NADO = 10;
const FACTOR_NADO = 0.25;

let tiempoAnterior = 0;
let tiempoOndas = 0;

function render(ahora) {
  const dt = Math.min((ahora - tiempoAnterior) / 1000, 0.1);
  tiempoAnterior = ahora;

  simPasar(dt);
  if (!SIM.pausado) tiempoOndas += dt;
  const factorSim = Math.min(SIM.velocidades[SIM.velocidadIdx], TOPE_NADO) * FACTOR_NADO;
  const hora = horaSim();

  // Ciclo solar: dirección e intensidad de la luz
  const fase = ((hora - 6) / 24) * 2 * Math.PI;
  const elev = Math.sin(fase);
  const intensidad = Math.max(0, elev);
  const noche = Math.max(0, -elev);                 // 0 de día, sube de noche
  // Dirección HACIA el sol, compartida con el overlay de AstrosDOM
  const dirSol = normalizar3([Math.cos(fase) * 0.85, elev, -0.25]);
  const dirLuna = normalizar3([-Math.cos(fase) * 0.85, noche, 0.25]);
  const solDir = noche > 0 ? dirLuna : dirSol;      // de noche alumbra la luna
  const colorDia = mezclarColor([1.0, 0.72, 0.45], [1.0, 0.98, 0.92], intensidad);
  const luzNoche = 0.05 + 0.12 * noche;             // luna llena = más luz azulada
  const luzColor = noche > 0
    ? [0.45 * luzNoche, 0.55 * luzNoche, 0.85 * luzNoche]
    : [
        colorDia[0] * (0.1 + intensidad),
        colorDia[1] * (0.1 + intensidad),
        colorDia[2] * (0.12 + intensidad)
      ];
  const ambColor = mezclarColor([0.10, 0.12, 0.18], [0.22, 0.24, 0.28], intensidad);
  const cielo = mezclarColor([0.03, 0.05, 0.12], [0.36, 0.55, 0.82], intensidad);

  // Cámara
  const eye = posicionCamara();
  camera.position = { x: eye[0], y: eye[1], z: eye[2] };
  camera.target = { x: camara.objetivo[0], y: camara.objetivo[1], z: camara.objetivo[2] };
  camera.updateViewMatrix();
  camera.updateProjectionMatrix();

  // Etiquetas 3D proyectadas a pantalla
  actualizarEtiquetas(camera.viewMatrix, camera.projectionMatrix, canvas);

  // Astros DOM (Sol y Luna) — dibujados en Canvas 2D superpuesto
  actualizarAstros({
    viewMatrix:  camera.viewMatrix,
    projMatrix:  camera.projectionMatrix,
    elev,
    dirSol,
    fase
  });

  // Actualizar tinte de agua de cada estanque según su turbidez
  meshesAgua.forEach((m, idx) => {
    const med = SIM.estanques[idx] && SIM.estanques[idx].m;
    const ntu = med ? med.ntu : 8;
    const turb = Math.max(0, Math.min(1, (ntu - 8) / 18));
    m.material.tint = [1 - 0.25 * turb, 1 - 0.05 * turb, 1 - 0.4 * turb];
  });

  // Compuertas: deslizar según nivel de agua
  for (const c of compuertas) {
    const m = SIM.estanques[c.estanque].m;
    const desv = m ? m.nivel - 1.9 : 0;
    const lift = Math.max(0, Math.min(0.9, 0.3 + desv * 3));
    c.mesh.matrix = multiplicarMat4(
      matrizTraslacion4(c.base[0], c.base[1] + lift, c.base[2]),
      matrizRotacionY(Math.PI / 2)
    );
    c.mesh.matrixWorld = c.mesh.matrix;
  }

  // Aireadores: rotar aspas
  for (const a of aireadores) {
    if (!SIM.pausado) a.angulo += dt * 2.2;
    a.mesh.matrix = multiplicarMat4(
      matrizTraslacion4(a.base[0], a.base[1], a.base[2]),
      matrizRotacionX(a.angulo)
    );
    a.mesh.matrixWorld = a.mesh.matrix;
  }

  // Boyas: flotación sinusoidal
  for (const b of boyas) {
    b.mesh.matrix = matrizTraslacion4(b.x, b.y + 0.06 * Math.sin(tiempoOndas * 1.7 + b.x), b.z);
    b.mesh.matrixWorld = b.mesh.matrix;
  }

  // Peces: transformación jerárquica padre-hijo (Paso 13)
  for (const p of peces) {
    const est = SIM.estanques[p.estanque];
    const actividad = est && est.m ? est.m.actividad : 1;
    if (!SIM.pausado) p.angulo += dt * factorSim * p.vel * actividad;
    const t = p.angulo;
    const x = Math.cos(t) * p.rx;
    const z = Math.sin(t) * p.rz;
    const y = p.y + 0.08 * Math.sin(t * 2);
    const rumbo = Math.atan2(-Math.cos(t) * p.rz, -Math.sin(t) * p.rx);

    const local = multiplicarMat4(
      matrizTraslacion4(x, y, z),
      multiplicarMat4(matrizRotacionY(rumbo), matrizEscala4(p.esc, p.esc, p.esc))
    );
    p.mesh.matrix = local;
    p.mesh.matrixWorld = multiplicarMat4(M_ESTANQUE[p.estanque], local);
  }

  // Renderizar escena con el motor modular
  renderer.render(scene, camera, {
    skyColor: cielo,
    lightDir: solDir,
    lightColor: luzColor,
    ambColor: ambColor,
    time: tiempoOndas
  });

  actualizarPanel(ahora);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);