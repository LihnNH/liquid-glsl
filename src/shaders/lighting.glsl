// Applies subtle tint, rim lighting, and a directional specular highlight.
// This intentionally avoids adding fake blue edge paint; blue should come from real scene content.
vec3 glassLighting(
  vec3 color,
  vec2 outwardNormal,
  float signedDistance,
  float insidePx,
  float bezelPx,
  float tint,
  float rimWidth,
  float lightAngle,
  float specularStrength,
  float specularSharpness
) {
  color = srgbMix(color, vec3(1.0), tint);

  float rim = 1.0 - smoothstep(0.0, max(0.5, rimWidth), abs(signedDistance));
  float bezelMask = 1.0 - smootherstep01(insidePx / max(1.0, bezelPx));

  vec2 lightDir = vec2(cos(lightAngle), sin(lightAngle));
  float facing = max(0.0, dot(-outwardNormal, lightDir));
  float specular = pow(facing, specularSharpness) * bezelMask * specularStrength;

  color += vec3(rim * 0.42);
  color += vec3(specular * 0.34);
  return color;
}
