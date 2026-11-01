#version 300 es
precision highp float;

// The same rule as frameDiff in ../cpu/frame-diff.ts, one pixel per invocation.

uniform sampler2D u_primary;
uniform sampler2D u_compare;
uniform float u_threshold;
uniform float u_baseOpacity;
uniform vec3 u_highlight;
// Set from the constants frameDiff uses, so both engines agree.
uniform vec3 u_luma;
uniform float u_highlightMix;

in vec2 v_uv;
out vec4 outColor;

void main() {
    // On the 0-255 scale frameDiff uses, so the threshold means the same on both engines.
    vec3 primary = texture(u_primary, v_uv).rgb;
    vec3 change = abs(primary - texture(u_compare, v_uv).rgb) * 255.0;
    float base = dot(primary, u_luma) * 255.0;
    vec3 gray = vec3(base * u_baseOpacity / 255.0);

    vec3 color = max(change.r, max(change.g, change.b)) >= u_threshold ? mix(gray, u_highlight, u_highlightMix) : gray;
    outColor = vec4(color, 1.0);
}
