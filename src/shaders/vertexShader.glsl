attribute vec4 a_position;
attribute float a_quadIndex;

uniform mat4 u_matrix;
uniform vec3 u_quadColors[32];
uniform float u_paletteSize;

varying vec3 v_color;

void main() {
  gl_Position = u_matrix * a_position;

  float maxIndex = max(u_paletteSize - 1.0, 0.0);
  float clampedIndex = min(a_quadIndex, maxIndex);
  int quadIndex = int(clampedIndex + 0.5);

  v_color = u_quadColors[quadIndex];
}
