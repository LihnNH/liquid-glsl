// Virtual lens cross-section.
// x = 0 at the outer edge, x = 1 at the flat interior.
float convexSquircle(float x) {
  x = saturate(x);
  float q = 1.0 - x;
  return pow(max(0.0, 1.0 - q * q * q * q), 0.25);
}

// Converts border depth into a normalized surface height.
float lensHeight(float insidePx, float bezelPx) {
  if (insidePx >= bezelPx) return 1.0;
  return convexSquircle(insidePx / max(1.0, bezelPx));
}

// Finite-difference slope used to reconstruct the local lens normal.
float lensSlope(float insidePx, float bezelPx) {
  float e = 0.65;
  float a = lensHeight(max(0.0, insidePx - e), bezelPx);
  float b = lensHeight(min(bezelPx, insidePx + e), bezelPx);
  return (b - a) / (2.0 * e);
}
