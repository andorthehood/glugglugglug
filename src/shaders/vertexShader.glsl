attribute vec4 a_position;
attribute vec2 a_texCoord;
attribute vec4 a_uvRect;

uniform mat4 u_matrix;

varying vec2 v_uv;

void main() {
  gl_Position = u_matrix * a_position;

  vec2 minUV = a_uvRect.xy;
  vec2 sizeUV = a_uvRect.zw;
  v_uv = minUV + a_texCoord * sizeUV;
}
