// Builds the refraction vector for the current point inside the optical rim.
// Refraction is intentionally concentrated near the border instead of across the full interior.
vec2 refractionOffset(
  vec2 outwardNormal,
  float insidePx,
  float bezelPx,
  float ior,
  float refractionStrength
) {
  float opticalBezel = max(1.0, bezelPx * uOpticalBezelScale);
  if (insidePx <= 0.0 || insidePx >= opticalBezel) return vec2(0.0);

  float t = insidePx / opticalBezel;
  float slope = min(2.65, lensSlope(insidePx, opticalBezel) * opticalBezel * 0.82);

  vec3 surfaceNormal = normalize(vec3(outwardNormal * slope, 1.0));
  vec3 incident = vec3(0.0, 0.0, -1.0);
  vec3 ray = refract(incident, surfaceNormal, 1.0 / max(1.001, ior));

  float z = max(0.18, abs(ray.z));
  vec2 projected = ray.xy / z;

  // Original V21 falloff. Its strong caustic character is intentionally preserved;
  // fold pixels are stabilized later without blending in the undeformed geometry.
  float rim = 1.0 - smootherstep01(t);
  rim = pow(rim, 1.45);

  vec2 offset = projected * refractionStrength * rim;
  float len = length(offset);

  float reachScale = mix(0.90, 1.55, saturate(refractionStrength / 100.0));
  float maxLen = opticalBezel * reachScale;
  if (len > maxLen) offset *= maxLen / max(0.0001, len);

  return offset;
}

// Returns a simple chroma estimate: 0 for neutral gray, larger for saturated colors.
float sampleChroma(vec3 c) {
  return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
}

// RGB-split scene sample with a stricter support test.
// Dispersion is only enabled when a whole small neighborhood agrees that there is a real,
// saturated colored feature under the glass. This aggressively suppresses random blue freckles.
vec3 sampleDispersedScene(vec2 p, vec2 offset, float dispersion) {
  vec2 centerP = p + offset;
  vec3 centerColor = sceneColor(centerP);

  float c0 = sampleChroma(centerColor);
  float c1 = sampleChroma(sceneColor(centerP + vec2(1.5, 0.0)));
  float c2 = sampleChroma(sceneColor(centerP - vec2(1.5, 0.0)));
  float c3 = sampleChroma(sceneColor(centerP + vec2(0.0, 1.5)));
  float c4 = sampleChroma(sceneColor(centerP - vec2(0.0, 1.5)));
  float avg = (c0 + c1 + c2 + c3 + c4) / 5.0;

  // Require both a strong center signal and broad neighborhood agreement.
  // This used to be a hard step() pair. A zero-width threshold sampled from a value
  // that drifts continuously (the refraction offset sweeps smoothly across the rim,
  // dragging the sample point across any hard-edged scene content underneath) is
  // guaranteed to snap on/off between neighboring pixels. Because dispersion then
  // splits R/G/B across three slightly different sample points, that snap shows up
  // as an isolated saturated-color pixel: exactly the "blue freckle / short streak"
  // artifact from the V16-V19 notes above. Fading the gate over a small band removes
  // the snap without adding a single extra sample, so it stays as cheap as V20.
  float support = smoothstep(0.075, 0.115, c0) * smoothstep(0.055, 0.095, avg);
  float safeDispersion = dispersion * support;
  if (safeDispersion <= 0.00001) return centerColor;

  vec2 rOff = offset * (1.0 + safeDispersion);
  vec2 gOff = offset;
  vec2 bOff = offset * (1.0 - safeDispersion);

  vec3 c;
  c.r = sceneColor(p + rOff).r;
  c.g = sceneColor(p + gOff).g;
  c.b = sceneColor(p + bOff).b;
  return c;
}

// Small cheap blur kernel used only inside the glass.
vec3 sampleBlurredScene(vec2 p, vec2 offset, float radiusPx) {
  vec2 c = p + offset;
  vec2 rx = vec2(radiusPx, 0.0);
  vec2 ry = vec2(0.0, radiusPx);

  vec3 sum = vec3(0.0);
  float w = 0.0;

  sum += sceneColor(c) * 4.0; w += 4.0;
  sum += sceneColor(c + rx) * 2.0; w += 2.0;
  sum += sceneColor(c - rx) * 2.0; w += 2.0;
  sum += sceneColor(c + ry) * 2.0; w += 2.0;
  sum += sceneColor(c - ry) * 2.0; w += 2.0;
  sum += sceneColor(c + rx + ry); w += 1.0;
  sum += sceneColor(c + rx - ry); w += 1.0;
  sum += sceneColor(c - rx + ry); w += 1.0;
  sum += sceneColor(c - rx - ry); w += 1.0;

  return sum / max(1.0, w);
}

vec3 median3(vec3 a, vec3 b, vec3 c) {
  return max(min(a, b), min(max(a, b), c));
}

vec3 sampleOpticalScene(vec2 p, vec2 offset, float dispersion) {
  vec3 color = sampleDispersedScene(p, offset, dispersion);
  vec3 blurred = sampleBlurredScene(p, offset, uBlurRadius);
  return mix(color, blurred, saturate(uBlurStrength));
}

// Preserves the original refractive mapping everywhere except at an actual fold.
// At a fold, adjacent output fragments reverse order in scene space and a whole colored
// edge collapses into one pixel (the blue bar / freckles) while motion makes it shimmer.
// Radial supersamples detect that reversal, and a component-wise median removes only the
// collapsed outlier. No undeformed scene color is mixed in, so there is never a second,
// inward-bent silhouette competing with the liquid-glass refraction.
vec3 sampleStableOpticalScene(
  vec2 p,
  vec2 outwardNormal,
  float insidePx,
  float bezelPx,
  float dispersion
) {
  vec2 centerOffset = refractionOffset(
    outwardNormal, insidePx, bezelPx, uIor, uRefractionStrength
  );
  vec3 centerColor = sampleOpticalScene(p, centerOffset, dispersion);

  float radialStep = max(0.75, 0.75 * uDpr);
  vec2 outerP = p + outwardNormal * radialStep;
  vec2 innerP = p - outwardNormal * radialStep;
  float outerInside = insidePx - radialStep;
  float innerInside = insidePx + radialStep;

  vec2 outerOffset = refractionOffset(
    outwardNormal, outerInside, bezelPx, uIor, uRefractionStrength
  );
  vec2 innerOffset = refractionOffset(
    outwardNormal, innerInside, bezelPx, uIor, uRefractionStrength
  );

  float centerRay = dot(p + centerOffset, outwardNormal);
  float outerRay = dot(outerP + outerOffset, outwardNormal);
  float innerRay = dot(innerP + innerOffset, outwardNormal);
  float foldAmount = max(centerRay - outerRay, innerRay - centerRay);
  float foldMask = smoothstep(-0.15 * radialStep, 0.35 * radialStep, foldAmount);

  // The neighbors are continuity votes, not full secondary renders. Keeping them to one
  // scene lookup each avoids multiplying the blur/dispersion kernels (the V19 freeze).
  vec3 outerColor = sceneColor(outerP + outerOffset);
  vec3 innerColor = sceneColor(innerP + innerOffset);
  vec3 stableColor = median3(outerColor, centerColor, innerColor);

  // Some freckles are not full folds: a single ray merely clips a distant hard corner.
  // If both radial neighbors agree and only the center differs, the center is an outlier.
  // At a legitimate refracted edge the two neighbors disagree, so the original transition
  // and its characteristic liquid-glass curvature pass through unchanged.
  float neighborDelta = length(outerColor - innerColor);
  float centerDelta = min(
    length(centerColor - outerColor),
    length(centerColor - innerColor)
  );
  float neighborAgreement = 1.0 - smoothstep(0.025, 0.100, neighborDelta);
  float isolatedOutlier = smoothstep(0.035, 0.140, centerDelta) * neighborAgreement;
  float stableMask = max(foldMask, isolatedOutlier);

  return mix(centerColor, stableColor, stableMask);
}
