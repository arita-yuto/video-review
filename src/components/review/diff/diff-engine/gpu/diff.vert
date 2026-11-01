#version 300 es

// One triangle that covers the whole canvas. The image's first row is at texture v = 0 but GL
// draws v = 0 at the bottom, so v is flipped to keep the picture upright.
in vec2 a_position;
out vec2 v_uv;

void main() {
    v_uv = vec2(a_position.x + 1.0, 1.0 - a_position.y) * 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
