const floaties = document.querySelectorAll(".floaty");
const MAX_REPULSION = 10;
const DETECTION_RADIUS = 150;
const TILT_SENSITIVITY = 15;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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

    if (edgeDistance >= DETECTION_RADIUS) {
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

    const force = (DETECTION_RADIUS - edgeDistance) / DETECTION_RADIUS;
    const strength = force * MAX_REPULSION;
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
  mouseX = e.clientX;
  mouseY = e.clientY;
  requestUpdate();
});

document.documentElement.addEventListener("pointerleave", (e) => {
  if (e.pointerType !== "mouse") return;
  mouseX = mouseY = -9999;
  requestUpdate();
});

// window.addEventListener("deviceorientation", (e) => {
//   if (reduceMotion.matches || usingMouse) return;
//   if (e.gamma === null || e.beta === null) return;

//   const tiltX =
//     Math.max(-TILT_SENSITIVITY, Math.min(TILT_SENSITIVITY, e.gamma)) /
//     TILT_SENSITIVITY;
//   const tiltY =
//     Math.max(-TILT_SENSITIVITY, Math.min(TILT_SENSITIVITY, e.beta - 45)) /
//     TILT_SENSITIVITY;

//   floaties.forEach((el) => {
//     setOffset(el, -tiltX * MAX_REPULSION, -tiltY * MAX_REPULSION);
//   });
// });

function initGyroPermission() {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    DeviceOrientationEvent.requestPermission()
      .then((status) => {
        if (status === "granted")
          console.log("Gyroscope animation initialized.");
      })
      .catch((err) => console.error("Device orientation blocked:", err));
  }
}

// document.addEventListener("click", initGyroPermission, { once: true });

function stretchText() {
  const container = document.querySelector("box");
  const text = document.querySelector(".floaty");
  const containerWidth = container.offsetWidth;
  const containerHeight = container.offsetHeight;
  const textWidth = text.offsetWidth;
  const textHeight = text.offsetHeight;

  const scaleX = containerWidth / textWidth;
  const scaleY = containerHeight / textHeight;
  text.style.transform = `scale(${scaleX}, ${scaleY})`;
}

window.addEventListener("load", stretchText);
window.addEventListener("resize", stretchText);
