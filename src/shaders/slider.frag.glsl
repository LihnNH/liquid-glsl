#version 300 es

#include "common.glsl"
#include "sdf.glsl"
#include "surface.glsl"

uniform vec2 uResolution;
uniform float uDpr;

uniform float uIor;
uniform float uRefractionStrength;
uniform float uOpticalBezelScale;
uniform float uBlurStrength;
uniform float uBlurRadius;
uniform float uDispersion;
uniform float uGlassTint;
uniform float uRimWidth;
uniform float uSpecularStrength;
uniform float uSpecularSharpness;
uniform float uLightAngle;

uniform float uValue;
uniform float uSliderActive;
uniform vec2 uTrackRange;
uniform float uSliderY;
uniform float uTrackHeight;
uniform vec3 uTrackBlue;
uniform vec3 uTrackEmpty;
uniform vec2 uSliderGlassSize;
uniform float uSliderBezelPx;

uniform vec2 uSquareCenter;
uniform float uSquareSize;
uniform vec3 uSquareBlue;

uniform vec2 uRectCenter;
uniform vec2 uRectSize;
uniform vec3 uRectBlue;

uniform vec2 uFreeGlassCenter;
uniform vec2 uFreeGlassSize;
uniform float uFreeBezelPx;

uniform vec2 uBallCenter;
uniform float uBallDiameter;
uniform float uBallBezelPx;

out vec4 fragColor;

// Slider geometry helpers.
vec2 sliderMetrics() {
  float startX = uResolution.x * uTrackRange.x;
  float endX = uResolution.x * uTrackRange.y;
  return vec2(startX, endX);
}

float sliderCenterY() {
  return uResolution.y * uSliderY;
}

vec2 sliderGlassCenter() {
  vec2 range = sliderMetrics();
  return vec2(mix(range.x, range.y, uValue), sliderCenterY());
}

// Soft neutral backdrop.
vec3 backgroundColor(vec2 p) {
  float y = p.y / max(1.0, uResolution.y);
  vec3 top = vec3(0.930, 0.937, 0.951);
  vec3 bottom = vec3(0.975, 0.978, 0.984);
  return mix(top, bottom, smootherstep01(y));
}

float roundedTrackMask(vec2 p, float x0, float x1, float y, float h) {
  float width = max(1.0, x1 - x0);
  vec2 center = vec2((x0 + x1) * 0.5, y);
  vec2 halfSize = vec2(width * 0.5, h * 0.5);
  float d = sdRoundedBox(p - center, halfSize, h * 0.5);
  return 1.0 - smoothstep(-1.0 * uDpr, 1.0 * uDpr, d);
}

float squareMask(vec2 p) {
  vec2 center = uSquareCenter * uResolution;
  vec2 halfSize = vec2(uSquareSize * 0.5);
  float d = sdRoundedBox(p - center, halfSize, 0.0);
  return 1.0 - smoothstep(-1.0 * uDpr, 1.0 * uDpr, d);
}

float rectMask(vec2 p) {
  vec2 center = uRectCenter * uResolution;
  vec2 halfSize = uRectSize * 0.5;
  float d = sdRoundedBox(p - center, halfSize, 0.0);
  return 1.0 - smoothstep(-1.0 * uDpr, 1.0 * uDpr, d);
}

// Base scene rendered underneath the glass layers.
vec3 sceneColor(vec2 p) {
  vec3 color = backgroundColor(p);

  vec2 range = sliderMetrics();
  float y = sliderCenterY();
  float thumbX = mix(range.x, range.y, uValue);

  // Shift the visible blue fill inside the thumb depending on slider position,
  // closer to the kube demo behavior.
  // Keep the fill farther left near the beginning and farther right near the end.
  // A small refraction-dependent optical advance gives the slider thumb the same visible
  // edge carry that the draggable pill gets when a blue bar passes underneath it.
  float internalShift = mix(-uSliderGlassSize.x * 0.20, uSliderGlassSize.x * 0.38, uValue);
  float opticalAdvance = uRefractionStrength * 0.20;

  float emptyMask = roundedTrackMask(p, range.x, range.y, y, uTrackHeight);
  color = mix(color, uTrackEmpty, emptyMask * 0.58);

  float fillEnd = max(range.x + uTrackHeight, thumbX + internalShift + opticalAdvance);
  float fillMask = roundedTrackMask(p, range.x, fillEnd, y, uTrackHeight);
  color = mix(color, uTrackBlue, fillMask);

  color = mix(color, uSquareBlue, squareMask(p));
  color = mix(color, uRectBlue, rectMask(p));
  return color;
}

#include "refraction.glsl"
#include "lighting.glsl"

// White inactive thumb used before the press transition completes.
vec3 inactivePillShading(vec2 p, vec2 center, vec2 glassSize, float bezelPx) {
  vec2 local = p - center;
  vec2 halfSize = glassSize * 0.5;
  float radius = halfSize.y;
  float d = sdRoundedBox(local, halfSize, radius);
  if (d > 0.0) return sceneColor(p);

  float inside = -d;
  float edge = 1.0 - smootherstep01(saturate(inside / max(1.0, bezelPx * 0.95)));
  float ny = local.y / max(1.0, halfSize.y);
  float nx = local.x / max(1.0, halfSize.x);

  vec3 base = vec3(0.965, 0.969, 0.978);
  base -= edge * 0.028;

  float topSoft = smootherstep01(saturate((-ny + 1.0) * 0.5));
  float bottomSoft = smootherstep01(saturate((ny + 1.0) * 0.5));
  base += vec3(0.025) * topSoft * (1.0 - edge * 0.55);
  base -= vec3(0.012) * bottomSoft * edge * 0.35;

  float rim = 1.0 - smoothstep(uRimWidth * 1.2, uRimWidth * 3.4, inside);
  base = mix(base, vec3(1.0), rim * 0.18);

  float spec = exp(-pow((ny + 0.74) * 2.15, 2.0) - pow(nx * 1.08, 2.0) * 1.35);
  base += vec3(0.045) * spec;
  return clamp(base, 0.0, 1.0);
}

// Generic glass renderer used by the free pill and ball, and as a clean base for the slider.
vec3 glassAt(vec2 p, vec2 center, vec2 glassSize, float bezelPx) {
  vec2 local = p - center;
  vec2 halfSize = glassSize * 0.5;
  float radius = halfSize.y;
  float d = sdRoundedBox(local, halfSize, radius);
  if (d > 0.0) return sceneColor(p);

  float inside = -d;
  vec2 outward = roundedBoxNormal(local, halfSize, radius);

  // Keep dispersion narrow and edge-biased so neutral glass does not sprout random blue dots.
  float opticalBezel = max(1.0, bezelPx * uOpticalBezelScale);
  float dispersionMask = pow(1.0 - smootherstep01(saturate(inside / opticalBezel)), 2.0);
  vec3 color = sampleStableOpticalScene(
    p, outward, inside, bezelPx, uDispersion * dispersionMask * 0.45
  );

  return glassLighting(
    color,
    outward,
    d,
    inside,
    bezelPx,
    uGlassTint,
    uRimWidth,
    uLightAngle,
    uSpecularStrength,
    uSpecularSharpness
  );
}

// The slider thumb blends from a white inactive pill into active glass over time.
// While active, it lifts slightly upward and grows a bit.
// Important: the ACTIVE slider uses the same clean glass renderer as the draggable pill.
// This keeps the visual logic identical and avoids the experimental slider-specific artifacts.
vec3 sliderLayerAt(vec2 p) {
  float activeMix = smootherstep01(uSliderActive);
  vec2 center = sliderGlassCenter() + vec2(0.0, -1.4 * uDpr * activeMix);
  float scale = mix(1.0, 1.055, activeMix);
  vec2 size = uSliderGlassSize * scale;
  float bezel = uSliderBezelPx * mix(1.0, 1.035, activeMix);

  vec3 inactiveColor = inactivePillShading(p, center, size, bezel);
  vec3 activeColor = glassAt(p, center, size, bezel);
  return mix(inactiveColor, activeColor, activeMix);
}

// Draggable pill.
vec3 freeGlassLayerAt(vec2 p, vec3 beneath) {
  vec2 local = p - uFreeGlassCenter;
  vec2 halfSize = uFreeGlassSize * 0.5;
  float radius = halfSize.y;
  float d = sdRoundedBox(local, halfSize, radius);
  if (d > 0.0) return beneath;

  float inside = -d;
  vec2 outward = roundedBoxNormal(local, halfSize, radius);
  float opticalBezel = max(1.0, uFreeBezelPx * uOpticalBezelScale);
  float dispersionMask = pow(1.0 - smootherstep01(saturate(inside / opticalBezel)), 2.0);
  vec3 color = sampleStableOpticalScene(
    p, outward, inside, uFreeBezelPx, uDispersion * dispersionMask * 0.45
  );
  return glassLighting(
    color,
    outward,
    d,
    inside,
    uFreeBezelPx,
    uGlassTint,
    uRimWidth,
    uLightAngle,
    uSpecularStrength,
    uSpecularSharpness
  );
}

// Draggable ball.
vec3 ballLayerAt(vec2 p, vec3 beneath) {
  vec2 local = p - uBallCenter;
  float radius = uBallDiameter * 0.5;
  float dist = length(local);
  float d = dist - radius;
  if (d > 0.0) return beneath;

  float inside = -d;
  vec2 outward = dist > 0.0001 ? local / dist : vec2(0.0, -1.0);
  float opticalBezel = max(1.0, uBallBezelPx * uOpticalBezelScale);
  float dispersionMask = pow(1.0 - smootherstep01(saturate(inside / opticalBezel)), 2.0);
  vec3 color = sampleStableOpticalScene(
    p, outward, inside, uBallBezelPx, uDispersion * dispersionMask * 0.45
  );
  return glassLighting(
    color,
    outward,
    d,
    inside,
    uBallBezelPx,
    uGlassTint,
    uRimWidth,
    uLightAngle,
    uSpecularStrength,
    uSpecularSharpness
  );
}

void main() {
  // Fragment coordinates converted to a top-left origin so pointer math and rendering match.
  vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);

  vec3 color = sliderLayerAt(p);
  color = freeGlassLayerAt(p, color);
  color = ballLayerAt(p, color);

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
