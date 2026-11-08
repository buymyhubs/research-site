const floaties = document.querySelectorAll(".floaty");
const MAX_REPULSION = 10;
const DETECTION_RADIUS = 150;
const TILT_SENSITIVITY = 15;

const GYRO_RADIUS_FACTOR = 0.8;
const GYRO_REPULSION = 10;

let activeRadius = DETECTION_RADIUS;
let activeRepulsion = MAX_REPULSION;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const fitted = Array.from(floaties, (el) => {
  const inner = document.createElement("span");
  inner.className = "fit";
  inner.append(...el.childNodes);
  el.append(inner);
  return { el, inner };
});

function fit() {
  fitted.forEach(({ el, inner }) => {
    const sx = el.clientWidth / inner.offsetWidth;
    const sy = el.clientHeight / inner.offsetHeight;
    inner.style.transform = `scale(${sx}, ${sy})`;
  });
}

const resizeObserver = new ResizeObserver(fit);
fitted.forEach(({ el }) => resizeObserver.observe(el));
document.fonts.ready.then(fit);

let mouseX = -9999;
let mouseY = -9999;
let usingMouse = false;
let ticking = false;

function setOffset(el, x, y) {
  el.style.setProperty("--offset-x", `${x.toFixed(2)}px`);
  el.style.setProperty("--offset-y", `${y.toFixed(2)}px`);
}

function update() {
  ticking = false;

  const measurements = Array.from(floaties, (el) => {
    const rect = el.getBoundingClientRect();
    const m = new DOMMatrix(getComputedStyle(el).transform);

    const left = rect.left - m.m41;
    const right = rect.right - m.m41;
    const top = rect.top - m.m42;
    const bottom = rect.bottom - m.m42;

    return { el, left, right, top, bottom };
  });

  measurements.forEach(({ el, left, right, top, bottom }) => {
    const nearestX = Math.max(left, Math.min(mouseX, right));
    const nearestY = Math.max(top, Math.min(mouseY, bottom));
    const edgeDistance = Math.hypot(mouseX - nearestX, mouseY - nearestY);

    if (edgeDistance >= activeRadius) {
      setOffset(el, 0, 0);
      return;
    }

    const deltaX = (left + right) / 2 - mouseX;
    const deltaY = (top + bottom) / 2 - mouseY;
    const length = Math.hypot(deltaX, deltaY);

    if (length === 0) {
      setOffset(el, 0, 0);
      return;
    }

    const force = (activeRadius - edgeDistance) / activeRadius;
    const strength = force * activeRepulsion;
    setOffset(el, (deltaX / length) * strength, (deltaY / length) * strength);
  });
}

function requestUpdate() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(update);
  }
}

document.addEventListener("pointermove", (e) => {
  if (reduceMotion.matches || e.pointerType !== "mouse") return;
  usingMouse = true;
  activeRadius = DETECTION_RADIUS;
  activeRepulsion = MAX_REPULSION;
  mouseX = e.clientX;
  mouseY = e.clientY;
  requestUpdate();
});

document.documentElement.addEventListener("pointerleave", (e) => {
  if (e.pointerType !== "mouse") return;
  mouseX = mouseY = -9999;
  requestUpdate();
});

let baseBeta = null;
let baseGamma = null;

function calibrate() {
  baseBeta = null;
  baseGamma = null;
}

function clampTilt(value) {
  return (
    Math.max(-TILT_SENSITIVITY, Math.min(TILT_SENSITIVITY, value)) /
    TILT_SENSITIVITY
  );
}

window.addEventListener("deviceorientation", (e) => {
  if (reduceMotion.matches || usingMouse) return;
  if (e.gamma === null || e.beta === null) return;

  if (baseBeta === null) {
    baseBeta = e.beta;
    baseGamma = e.gamma;
  }

  const tiltX = clampTilt(e.gamma - baseGamma);
  const tiltY = clampTilt(e.beta - baseBeta);

  mouseX = (0.5 + tiltX / 2) * window.innerWidth;
  mouseY = (0.5 + tiltY / 2) * window.innerHeight;
  activeRadius =
    Math.max(window.innerWidth, window.innerHeight) * GYRO_RADIUS_FACTOR;
  activeRepulsion = GYRO_REPULSION;
  requestUpdate();
});

screen.orientation?.addEventListener("change", calibrate);
document.addEventListener("visibilitychange", calibrate);
window.addEventListener("scroll", calibrate, { passive: true });
window.addEventListener("scroll", requestUpdate, { passive: true });

function initGyroPermission() {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    DeviceOrientationEvent.requestPermission()
      .then((status) => {
        if (status === "granted") console.log("gyroscope enabled");
      })
      .catch((err) =>
        console.error("user doesn't like when cool things happen", err),
      );
  }
}

document.addEventListener("click", initGyroPermission, { once: true });
