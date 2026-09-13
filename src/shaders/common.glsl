precision highp float;

// Small shared helpers used across the fragment shader.
const float PI = 3.14159265358979323846;

float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}

float smootherstep01(float x) {
  x = saturate(x);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

float aaWidth() {
  return max(0.75, fwidth(gl_FragCoord.x) + fwidth(gl_FragCoord.y));
}

vec3 srgbMix(vec3 a, vec3 b, float t) {
  return mix(a, b, saturate(t));
}
