// Signed distance to a rounded box / capsule-like silhouette.
float sdRoundedBox(vec2 p, vec2 halfSize, float radius) {
  vec2 q = abs(p) - halfSize + radius;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

// Analytic normal for capsule-like rounded boxes.
// The previous finite-difference normal could jump by a few pixels around the transition
// between the straight section and the round caps. With strong refraction those tiny normal
// glitches could sample a distant blue pixel and show up as isolated blue dots / short lines.
vec2 roundedBoxNormal(vec2 p, vec2 halfSize, float radius) {
  float capsuleRadius = min(radius, halfSize.y);
  float segmentHalf = max(0.0, halfSize.x - capsuleRadius);

  // For the pill geometry used in this project, the closest point lies on the horizontal
  // center segment. Subtracting that point gives an exact, stable outward direction.
  float closestX = clamp(p.x, -segmentHalf, segmentHalf);
  vec2 radial = p - vec2(closestX, 0.0);
  float radialLen = length(radial);

  if (radialLen > 0.0001) {
    return radial / radialLen;
  }

  // Degenerate center-line fallback. This is practically never used at the optical rim,
  // but keeping it deterministic avoids undefined normalization.
  return vec2(0.0, p.y < 0.0 ? -1.0 : 1.0);
}
