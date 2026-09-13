function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pointInPill(x, y, cx, cy, width, height) {
  const radius = height * 0.5;
  const halfWidth = width * 0.5;
  const localX = Math.abs(x - cx);
  const localY = Math.abs(y - cy);

  if (localY > radius || localX > halfWidth) return false;
  if (localX <= halfWidth - radius) return true;

  const dx = localX - (halfWidth - radius);
  return dx * dx + localY * localY <= radius * radius;
}

function pointInCircle(x, y, cx, cy, diameter) {
  const r = diameter * 0.5;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

export class InputController {
  constructor(canvas, state, onChange, onSliderActiveChange) {
    this.canvas = canvas;
    this.state = state;
    this.onChange = onChange;
    this.onSliderActiveChange = onSliderActiveChange;
    this.mode = null;
    this.pointerId = null;
    this.grabOffset = { x: 0, y: 0 };

    canvas.addEventListener('pointerdown', this.#pointerDown);
    canvas.addEventListener('pointermove', this.#pointerMove);
    canvas.addEventListener('pointerup', this.#pointerUp);
    canvas.addEventListener('pointercancel', this.#pointerUp);
    canvas.addEventListener('keydown', this.#keyDown);
  }

  #localPoint = (event) => {
    const rect = this.canvas.getBoundingClientRect();
    return {
      rect,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  #valueFromX = (x, width) => {
    const start = width * this.state.slider.left;
    const end = width * this.state.slider.right;
    return clamp((x - start) / (end - start), 0, 1);
  };

  #sliderCenter = (width, height) => {
    const start = width * this.state.slider.left;
    const end = width * this.state.slider.right;
    return {
      x: start + (end - start) * this.state.value,
      y: height * this.state.slider.y
    };
  };

  #pointerDown = (event) => {
    const { rect, x, y } = this.#localPoint(event);
    const ball = this.state.ball;
    const free = this.state.freeGlass;
    const sliderCenter = this.#sliderCenter(rect.width, rect.height);

    if (pointInCircle(x, y, ball.x, ball.y, ball.diameter)) {
      this.mode = 'ball';
      this.grabOffset.x = x - ball.x;
      this.grabOffset.y = y - ball.y;
    } else if (pointInPill(x, y, free.x, free.y, free.width, free.height)) {
      this.mode = 'free-glass';
      this.grabOffset.x = x - free.x;
      this.grabOffset.y = y - free.y;
    } else if (pointInPill(x, y, sliderCenter.x, sliderCenter.y, this.state.slider.glassWidth, this.state.slider.glassHeight)) {
      this.mode = 'slider';
      this.state.value = this.#valueFromX(x, rect.width);
      this.onSliderActiveChange(true);
      this.onChange();
    } else {
      return;
    }

    this.pointerId = event.pointerId;
    this.canvas.setPointerCapture(event.pointerId);
    this.canvas.focus({ preventScroll: true });
    event.preventDefault();
  };

  #pointerMove = (event) => {
    if (this.pointerId !== event.pointerId || !this.mode) return;
    const { rect, x, y } = this.#localPoint(event);

    if (this.mode === 'free-glass') {
      const free = this.state.freeGlass;
      const halfW = free.width * 0.5;
      const halfH = free.height * 0.5;
      free.x = clamp(x - this.grabOffset.x, halfW, Math.max(halfW, rect.width - halfW));
      free.y = clamp(y - this.grabOffset.y, halfH, Math.max(halfH, rect.height - halfH));
      this.onChange();
    } else if (this.mode === 'ball') {
      const ball = this.state.ball;
      const r = ball.diameter * 0.5;
      ball.x = clamp(x - this.grabOffset.x, r, Math.max(r, rect.width - r));
      ball.y = clamp(y - this.grabOffset.y, r, Math.max(r, rect.height - r));
      this.onChange();
    } else if (this.mode === 'slider') {
      this.state.value = this.#valueFromX(x, rect.width);
      this.onChange();
    }

    event.preventDefault();
  };

  #pointerUp = (event) => {
    if (this.pointerId !== event.pointerId) return;

    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    if (this.mode === 'slider') {
      this.onSliderActiveChange(false);
    }

    this.mode = null;
    this.pointerId = null;
  };

  #keyDown = (event) => {
    const step = event.shiftKey ? 0.05 : 0.0125;
    if (event.key === 'ArrowLeft') {
      this.state.value = Math.max(0, this.state.value - step);
    } else if (event.key === 'ArrowRight') {
      this.state.value = Math.min(1, this.state.value + step);
    } else if (event.key === 'Home') {
      this.state.value = 0;
    } else if (event.key === 'End') {
      this.state.value = 1;
    } else {
      return;
    }
    event.preventDefault();
    this.onChange();
  };
}
