import { BALL, FREE_GLASS, GLASS, RECT, SLIDER, SQUARE } from './config.js';
import { loadShader } from './gl/ShaderLoader.js';
import { Renderer } from './gl/Renderer.js';
import { InputController } from './slider/InputController.js';
import { mountControls } from './ui/ControlsPanel.js';

const canvas = document.querySelector('#glass-canvas');
const fallback = document.querySelector('#fallback');
const controlsRoot = document.querySelector('#controls-root');

const state = {
  value: SLIDER.value,
  sliderActive: 0,
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

function smooth01(x) {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
}

function initializeShapePositions() {
  const rect = canvas.getBoundingClientRect();

  if (state.freeGlass.x == null || state.freeGlass.y == null) {
    const squareCenterX = rect.width * state.square.x;
    const squareCenterY = rect.height * state.square.y;
    const squareRight = squareCenterX + state.square.size * 0.5;
    const wantedX = squareRight + state.freeGlass.width * 0.5 - state.freeGlass.initialSquareOverlap;
    const halfW = state.freeGlass.width * 0.5;
    const halfH = state.freeGlass.height * 0.5;
    state.freeGlass.x = Math.max(halfW, Math.min(rect.width - halfW, wantedX));
    state.freeGlass.y = Math.max(halfH, Math.min(rect.height - halfH, squareCenterY));
  }

  if (state.ball.x == null || state.ball.y == null) {
    const rectCenterX = rect.width * state.rect.x;
    const rectCenterY = rect.height * state.rect.y;
    const rectRight = rectCenterX + state.rect.width * 0.5;
    const wantedX = rectRight + state.ball.diameter * 0.5 - state.ball.initialRectOverlap;
    const radius = state.ball.diameter * 0.5;
    state.ball.x = Math.max(radius, Math.min(rect.width - radius, wantedX));
    state.ball.y = Math.max(radius, Math.min(rect.height - radius, rectCenterY));
  }
}

try {
  const [vertexSource, fragmentSource] = await Promise.all([
    loadShader(new URL('./shaders/vertex.glsl', import.meta.url)),
    loadShader(new URL('./shaders/slider.frag.glsl', import.meta.url))
  ]);

  initializeShapePositions();

  const renderer = new Renderer(canvas, vertexSource, fragmentSource);
  let frame = 0;
  let lastTimestamp = 0;

  const setSliderActive = (active) => {
    const target = active ? 1 : 0;
    if (sliderActivation.target === target && sliderActivation.current === target) return;
    sliderActivation.from = sliderActivation.current;
    sliderActivation.target = target;
    sliderActivation.startTime = performance.now();
    sliderActivation.duration = Math.max(1, state.glass.activationDurationMs);
    requestDraw();
  };

  const stepAnimation = (timestamp) => {
    sliderActivation.duration = Math.max(1, state.glass.activationDurationMs);
    if (sliderActivation.current === sliderActivation.target) return false;
    const t = (timestamp - sliderActivation.startTime) / sliderActivation.duration;
    if (t >= 1) {
      sliderActivation.current = sliderActivation.target;
      state.sliderActive = sliderActivation.current;
      return false;
    }
    sliderActivation.current = sliderActivation.from + (sliderActivation.target - sliderActivation.from) * smooth01(t);
    state.sliderActive = sliderActivation.current;
    return true;
  };

  const draw = (timestamp) => {
    frame = 0;
    lastTimestamp = timestamp;
    stepAnimation(timestamp);
    renderer.render(state);
    if (sliderActivation.current !== sliderActivation.target) requestDraw();
  };

  const requestDraw = () => {
    if (frame) return;
    frame = requestAnimationFrame(draw);
  };

  new InputController(canvas, state, requestDraw, setSliderActive);
  mountControls(controlsRoot, state, requestDraw);
  new ResizeObserver(() => {
    initializeShapePositions();
    requestDraw();
  }).observe(canvas);
  window.addEventListener('resize', () => {
    initializeShapePositions();
    requestDraw();
  }, { passive: true });
  requestDraw();
} catch (error) {
  console.error(error);
  canvas.hidden = true;
  fallback.hidden = false;
  fallback.textContent = `${error.message}`;
}
