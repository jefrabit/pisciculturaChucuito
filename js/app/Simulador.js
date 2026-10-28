// ------------------------------------------------------------
// Simulador.js — Reloj compartido + sensores limnológicos simulados
// Modelo de calidad de agua calibrado con el Lago Titicaca y Puno.
// ------------------------------------------------------------

export const SIM = {
  T: 10.0,                      // tiempo simulado en horas (arranca 10:00 AM)
  velocidades: [1, 5, 25, 125], // aceleraciones
  velocidadIdx: 1,              // default 5x
  BASE_HORA_POR_SEG: 0.1,       // a 1x: 0.1 h sim por segundo real
  pausado: false,
  ultimaComida: 8.0,
  lluviaHasta: -1,
  heladaHasta: -1,
  floraInicio: -100,
  estanques: [
    { nombre: "Estanque 1 · Alevinaje", m: null },
    { nombre: "Estanque 2 · Engorde", m: null },
    { nombre: "Estanque 3 · Acabado", m: null },
    { nombre: "Estanque 4 · Pre-descarga", m: null },
    { nombre: "Estanque 5 · Descarga", m: null },
    { nombre: "Estanque 6 · Embalse final", m: null }
  ],
  historial: [[], [], [], [], [], []]
};

export const UMBRALES = {
  odAdvertencia: 5.0,
  odCritico: 3.5,
  phMin: 6.5,
  phMax: 8.5,
  nh3Critico: 0.02,
  tempMin: 8,
  tempMax: 18
};

export function horaSim() { return SIM.T % 24; }
export function diaSim() { return Math.floor(SIM.T / 24); }

export function horaTexto() {
  const h = Math.floor(horaSim());
  const m = Math.floor((horaSim() - h) * 60);
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

export function esDeDia() {
  const h = horaSim();
  return h >= 6 && h < 18;
}

function detectarComida(Ta, Tb) {
  const d0 = Math.floor(Ta / 24);
  const d1 = Math.floor(Tb / 24);
  for (let d = d0; d <= d1; d++) {
    for (const f of [8, 16]) {
      const ft = d * 24 + f;
      if (ft > Ta && ft <= Tb) SIM.ultimaComida = ft;
    }
  }
}

export function simPasar(dtSeg) {
  if (SIM.pausado) return;
  const Tantes = SIM.T;
  SIM.T += dtSeg * SIM.BASE_HORA_POR_SEG * SIM.velocidades[SIM.velocidadIdx];
  detectarComida(Tantes, SIM.T);
  for (let i = 0; i < SIM.estanques.length; i++) {
    const m = medir(i);
    SIM.estanques[i].m = m;
    const hist = SIM.historial[i];
    hist.push({ t: SIM.T, temp: m.temp, od: m.od, ph: m.ph, nh3: m.nh3, ntu: m.ntu, nivel: m.nivel });
    while (hist.length && hist[0].t < SIM.T - 24) hist.shift();
  }
}

export function medir(i) {
  const T = SIM.T;
  const hora = T % 24;
  const dia = T / 24;
  const sol = Math.max(0, Math.sin((hora - 6) / 24 * 2 * Math.PI));
  const desdeComida = T - SIM.ultimaComida;
  const comida = desdeComida >= 0 ? Math.exp(-desdeComida / 4) : 0;
  const lloviendo = T < SIM.lluviaHasta;
  const helada = T < SIM.heladaHasta;
  const off = i * 0.4;
  const ruido = () => (Math.random() - 0.5);

  const desdeFlora = T - SIM.floraInicio;
  const flora = (desdeFlora >= 0 && desdeFlora < 24)
    ? Math.min(1, desdeFlora / 2) * Math.exp(-Math.max(0, desdeFlora - 2) / 6)
    : 0;

  const temp = 13
    + 2 * Math.sin(2 * Math.PI * (dia - 150) / 365)
    + 1.2 * Math.sin(2 * Math.PI * (hora - 15) / 24)
    - 2.2 * helada
    + off + 0.2 * ruido();

  const od = 7
    + 1.5 * (sol - 0.5)
    - 1.2 * comida
    - 3.8 * flora
    - (lloviendo ? 0.3 : 0)
    + 0.15 * ruido();

  const ph = 8.3
    + 0.15 * (sol - 0.5)
    - 0.1 * comida
    + 0.4 * flora
    + 0.05 * ruido();

  const nh3 = Math.max(0, 0.01 + 0.06 * comida + 0.005 * ruido());

  const ntu = Math.max(1, 8
    + (lloviendo ? 10 : 0)
    + 6 * flora
    + 1.5 * comida
    + 2 * ruido());

  const nivel = 1.9
    + 0.15 * Math.sin(2 * Math.PI * dia / 365)
    + (lloviendo ? 0.15 : 0)
    + 0.02 * ruido();

  const estres = Math.max(0, Math.min(1, (5.5 - od) / 2));
  const actividad = 1 + 0.5 * comida - 0.45 * estres;

  return { temp, od, ph, nh3, ntu, nivel, actividad };
}

export function alertasDe(m) {
  const a = [];
  if (m.od < UMBRALES.odCritico) a.push({ txt: "OD crítico (" + m.od.toFixed(1) + " mg/L)", nivel: "critica" });
  else if (m.od < UMBRALES.odAdvertencia) a.push({ txt: "OD bajo (" + m.od.toFixed(1) + " mg/L)", nivel: "advertencia" });
  if (m.nh3 > UMBRALES.nh3Critico) a.push({ txt: "NH₃ alto (" + m.nh3.toFixed(3) + " mg/L)", nivel: "critica" });
  if (m.ph < UMBRALES.phMin || m.ph > UMBRALES.phMax) a.push({ txt: "pH fuera de rango (" + m.ph.toFixed(2) + ")", nivel: "advertencia" });
  if (m.temp < UMBRALES.tempMin || m.temp > UMBRALES.tempMax) a.push({ txt: "T° fuera de rango (" + m.temp.toFixed(1) + " °C)", nivel: "advertencia" });
  return a;
}

export function simAlimentar() { SIM.ultimaComida = SIM.T; }
export function simLluvia() { SIM.lluviaHasta = SIM.T + 6; }
export function simFloracion() { SIM.floraInicio = SIM.T; }
export function simHelada() { SIM.heladaHasta = SIM.T + 6; }
export function simAlternarPausa() { SIM.pausado = !SIM.pausado; }
export function simVelocidad(delta) {
  SIM.velocidadIdx = Math.max(0, Math.min(SIM.velocidades.length - 1, SIM.velocidadIdx + delta));
}
