// ------------------------------------------------------------
// ORBIT CONTROLS (Paso 15/16)
// Cámara orbital: coordenadas esféricas alrededor de un objetivo.
// Mouse (arrastrar + rueda), teclado (flechas, +/-, R) y límites
// idénticos a los del monolito Fase 2 (Paso 15).
// ------------------------------------------------------------
export class OrbitControls {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;

    // Estado esférico (coincide con monolito Fase 2).
    this.target = [0.0, 2.0, 0.0];
    this.distance = 45;
    this.distanceMin = 8;
    this.distanceMax = 120;
    this.azimuth = 0.4;
    this.elevation = 0.35;
    this.maxElevation = Math.PI / 2 - 0.05;
    this.mouseSensitivity = 0.006;
    this.zoomSensitivity = 0.015;

    this.dragging = false;
    this.previousX = 0;
    this.previousY = 0;

    this.registerEvents();
    this.update();
  }

  registerEvents() {
    this.canvas.addEventListener("mousedown", (evento) => {
      this.dragging = true;
      this.previousX = evento.clientX;
      this.previousY = evento.clientY;
      this.canvas.classList.add("arrastrando");
    });

    window.addEventListener("mouseup", () => {
      this.dragging = false;
      this.canvas.classList.remove("arrastrando");
    });

    window.addEventListener("mousemove", (evento) => {
      if (!this.dragging) {
        return;
      }
      const dx = evento.clientX - this.previousX;
      const dy = evento.clientY - this.previousY;
      this.previousX = evento.clientX;
      this.previousY = evento.clientY;

      this.azimuth -= dx * this.mouseSensitivity;
      this.elevation += dy * this.mouseSensitivity;
      this.applyLimits();
      this.update();
    });

    this.canvas.addEventListener("wheel", (evento) => {
      evento.preventDefault();
      this.distance += evento.deltaY * this.zoomSensitivity;
      this.applyLimits();
      this.update();
    }, { passive: false });

    window.addEventListener("keydown", (evento) => {
      this.handleKey(evento);
      this.applyLimits();
      this.update();
    });
  }

  handleKey(evento) {
    const pasoAngular = 0.08;
    const pasoZoom = 0.5;

    switch (evento.key) {
      case "ArrowLeft":
        this.azimuth += pasoAngular;
        evento.preventDefault();
        break;
      case "ArrowRight":
        this.azimuth -= pasoAngular;
        evento.preventDefault();
        break;
      case "ArrowUp":
        this.elevation += pasoAngular;
        evento.preventDefault();
        break;
      case "ArrowDown":
        this.elevation -= pasoAngular;
        evento.preventDefault();
        break;
      case "+":
      case "=":
        this.distance -= pasoZoom;
        break;
      case "-":
        this.distance += pasoZoom;
        break;
      case "r":
      case "R":
        this.reset();
        break;
    }
  }

  applyLimits() {
    this.distance = Math.max(this.distanceMin, Math.min(this.distanceMax, this.distance));
    this.elevation = Math.max(-this.maxElevation, Math.min(this.maxElevation, this.elevation));
  }

  reset() {
    this.target = [0.0, 2.0, 0.0];
    this.distance = 45;
    this.azimuth = 0.4;
    this.elevation = 0.35;
  }

  // Escribe la posición y target de la cámara desde el estado esférico.
  update() {
    const cosElev = Math.cos(this.elevation);

    this.camera.position.x = this.target[0] + this.distance * cosElev * Math.sin(this.azimuth);
    this.camera.position.y = this.target[1] + this.distance * Math.sin(this.elevation);
    this.camera.position.z = this.target[2] + this.distance * cosElev * Math.cos(this.azimuth);

    this.camera.target.x = this.target[0];
    this.camera.target.y = this.target[1];
    this.camera.target.z = this.target[2];
  }
}