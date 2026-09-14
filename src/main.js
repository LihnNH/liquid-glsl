import { BALL, FREE_GLASS, GLASS, RECT, SLIDER, SQUARE } from './config.js';
import { loadShader } from './gl/ShaderLoader.js';
import { Renderer } from './gl/Renderer.js';
import { InputController } from './slider/InputController.js';
import { mountControls } from './ui/ControlsPanel.js';

const canvas = document.querySelector('#glass-canvas');
const fallback = document.querySelector('#fallback');
const controlsRoot = document.querySelector('#controls-root');
const fpsMeter = document.querySelector('.fps-meter');
const fpsValue = document.querySelector('#fps-value');

const REFERENCE_WIDTH = 720;
const REFERENCE_HEIGHT = 520;
const MIN_LAYOUT_SCALE = 0.55;

const state = {
  value: SLIDER.value,
  sliderActive: 0,
  layoutScale: 1,
  glass: { ...GLASS },
  slider: { ...SLIDER },
  square: { ...SQUARE },
  rect: { ...RECT },
  freeGlass: { ...FREE_GLASS },
  ball: { ...BALL }
};

const sliderActivation = {
  current: 0,
  from: 0,
  target: 0,
  startTime: 0,
  duration: GLASS.activationDurationMs
};

const layout = { width: 0, height: 0 };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smooth01(x) {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
}

function syncResponsiveLayout() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const scale = Math.min(1, Math.max(MIN_LAYOUT_SCALE, Math.min(
    width / REFERENCE_WIDTH,
    height / REFERENCE_HEIGHT
  )));

  if (layout.width && layout.height && (layout.width !== width || layout.height !== height)) {
    state.freeGlass.x *= width / layout.width;
    state.freeGlass.y *= height / layout.height;
    state.ball.x *= width / layout.width;
    state.ball.y *= height / layout.height;
  }

  state.layoutScale = scale;

  if (state.freeGlass.x == null || state.freeGlass.y == null) {
    const squareCenterX = width * state.square.x;
    const squareCenterY = height * state.square.y;
    const squareRight = squareCenterX + state.square.size * scale * 0.5;
    state.freeGlass.x = squareRight + (state.freeGlass.width * 0.5 - state.freeGlass.initialSquareOverlap) * scale;
    state.freeGlass.y = squareCenterY;
  }

  if (state.ball.x == null || state.ball.y == null) {
    const rectCenterX = width * state.rect.x;
    const rectCenterY = height * state.rect.y;
    const rectRight = rectCenterX + state.rect.width * scale * 0.5;
    state.ball.x = rectRight + (state.ball.diameter * 0.5 - state.ball.initialRectOverlap) * scale;
    state.ball.y = rectCenterY;
  }

  const freeHalfW = state.freeGlass.width * scale * 0.5;
  const freeHalfH = state.freeGlass.height * scale * 0.5;
  const ballRadius = state.ball.diameter * scale * 0.5;
  state.freeGlass.x = clamp(state.freeGlass.x, freeHalfW, Math.max(freeHalfW, width - freeHalfW));
  state.freeGlass.y = clamp(state.freeGlass.y, freeHalfH, Math.max(freeHalfH, height - freeHalfH));
  state.ball.x = clamp(state.ball.x, ballRadius, Math.max(ballRadius, width - ballRadius));
  state.ball.y = clamp(state.ball.y, ballRadius, Math.max(ballRadius, height - ballRadius));

  layout.width = width;
  layout.height = height;
}

try {
  const [vertexSource, fragmentSource] = await Promise.all([
    loadShader(new URL('./shaders/vertex.glsl', import.meta.url)),
    loadShader(new URL('./shaders/slider.frag.glsl', import.meta.url))
  ]);

  syncResponsiveLayout();

  const renderer = new Renderer(canvas, vertexSource, fragmentSource);
  let fpsFrames = 0;
  let fpsWindowStartedAt = performance.now();

  const requestDraw = () => {
    syncResponsiveLayout();
  };

  const setSliderActive = (active) => {
    const target = active ? 1 : 0;
    if (sliderActivation.target === target && sliderActivation.current === target) return;
    sliderActivation.from = sliderActivation.current;
    sliderActivation.target = target;
    sliderActivation.startTime = performance.now();
    sliderActivation.duration = Math.max(1, state.glass.activationDurationMs);
  };

  const stepAnimation = (timestamp) => {
    sliderActivation.duration = Math.max(1, state.glass.activationDurationMs);
    if (sliderActivation.current === sliderActivation.target) return;
    const t = (timestamp - sliderActivation.startTime) / sliderActivation.duration;
    if (t >= 1) {
      sliderActivation.current = sliderActivation.target;
      state.sliderActive = sliderActivation.current;
      return;
    }
    sliderActivation.current = sliderActivation.from + (sliderActivation.target - sliderActivation.from) * smooth01(t);
    state.sliderActive = sliderActivation.current;
  };

  const draw = (timestamp) => {
    stepAnimation(timestamp);
    renderer.render(state);
    fpsFrames += 1;

    const elapsed = timestamp - fpsWindowStartedAt;
    if (elapsed >= 500) {
      const fps = Math.round((fpsFrames * 1000) / elapsed);
      fpsValue.value = String(fps);
      fpsValue.textContent = String(fps);
      fpsMeter.dataset.level = fps >= 55 ? 'good' : fps >= 30 ? 'medium' : 'low';
      fpsFrames = 0;
      fpsWindowStartedAt = timestamp;
    }

    requestAnimationFrame(draw);
  };

  new InputController(canvas, state, requestDraw, setSliderActive);
  mountControls(controlsRoot, state, requestDraw);
  new ResizeObserver(syncResponsiveLayout).observe(canvas);
  window.addEventListener('resize', syncResponsiveLayout, { passive: true });
  document.addEventListener('visibilitychange', () => {
    fpsFrames = 0;
    fpsWindowStartedAt = performance.now();
  });
  requestAnimationFrame(draw);
} catch (error) {
  console.error(error);
  canvas.hidden = true;
  fallback.hidden = false;
  fallback.textContent = String(error.message);
}
