#version 300 es

// Full-screen triangle strip replacement made of two triangles.
in vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
