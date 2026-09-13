// First place to tweak while comparing against reference images.
// Sizes are CSS pixels; positions marked 0..1 are normalized to the canvas.
export const GLASS = {
  refractiveIndex: 1.36,
  refractionStrength: 75,
  opticalBezelScale: 0.85,
  blurStrength: 0.70,
  blurRadius: 1.0,
  chromaticDispersion: 0.024,
  glassTint: 0.000,
  rimWidth: 0.90,
  specularStrength: 0.08,
  specularSharpness: 4.2,
  lightAngleDegrees: -112,
  activationDurationMs: 275
};

export const SLIDER = {
  value: 0.44,
  left: 0.18,
  right: 0.82,
  y: 0.285,
  trackHeight: 26,
  glassWidth: 170,
  glassHeight: 92,
  bezel: 34,
  blue: [0.040, 0.505, 0.965],
  empty: [0.765, 0.785, 0.820]
};

export const SQUARE = {
  x: 0.38,
  y: 0.74,
  size: 118,
  blue: [0.040, 0.505, 0.965]
};

export const RECT = {
  x: 0.57,
  y: 0.74,
  width: 236,
  height: 76,
  blue: [0.040, 0.505, 0.965]
};

export const FREE_GLASS = {
  x: null,
  y: null,
  width: 170,
  height: 92,
  bezel: 34,
  initialSquareOverlap: 30
};

export const BALL = {
  x: null,
  y: null,
  diameter: 118,
  bezel: 32,
  initialRectOverlap: 18
};
